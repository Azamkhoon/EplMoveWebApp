/**
 * In-process live verification (no Docker).
 *
 * Runs the platform's REAL migration SQL (each service's migrations.sql) against
 * PGlite — an actual Postgres engine compiled to WASM, so RLS policies,
 * set_config/current_setting, gen_random_uuid, sequences, FOR UPDATE SKIP LOCKED,
 * etc. all behave like real Postgres. It then replays the real service query
 * logic and an in-memory event bus to exercise the end-to-end flows:
 *
 *   Phase 1: tenant provision + RBAC seed, register/login (argon2),
 *            load CRUD + state machine, and RLS tenant isolation.
 *   Phase 2: quote → bids → accept → booking + shipment created.
 *   Phase 5: carrier/broker participant RLS, broker assignment, document
 *            request → upload → approval, notifications, and reload reads.
 *
 * What this PROVES: SQL correctness, schema/migrations, Postgres RLS isolation,
 * the load state machine, optimistic locking, and the accept-bid→shipment
 * choreography (incl. idempotent consumption).
 * What it does NOT prove: the Pub/Sub wire itself or cross-process HTTP — those
 * need Docker on the host (scripts/verify-phase{1,2}.sh).
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID, createHash, randomInt } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import * as argon2 from "argon2";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

let pass = 0;
let failed = 0;
const ok = (m: string) => {
  pass++;
  console.log(`\x1b[32m✓\x1b[0m ${m}`);
};
const bad = (m: string, e?: unknown) => {
  failed++;
  console.log(`\x1b[31m✗ ${m}\x1b[0m`, e ?? "");
};
const section = (m: string) => console.log(`\n\x1b[1;34m▶ ${m}\x1b[0m`);

async function assertThrows(label: string, fn: () => Promise<unknown>) {
  try {
    await fn();
    bad(`${label} (expected to throw, did not)`);
  } catch {
    ok(label);
  }
}

// ── In-memory event bus replaying the outbox→consumer choreography ──
type Handler = (e: any) => Promise<void>;
const subscribers: Record<string, Handler[]> = {};
const publish = async (topic: string, event: any) => {
  for (const h of subscribers[topic] ?? []) await h(event);
};
const subscribe = (topic: string, h: Handler) => {
  (subscribers[topic] ??= []).push(h);
};

async function main() {
  const db = new PGlite(); // ephemeral in-memory Postgres
  const q = (sql: string, params: unknown[] = []) => db.query(sql, params);

  // Helper: run work as the non-superuser app role with the RLS tenant variable
  // set (mirrors the production withTenantTx: SET LOCAL app.tenant_id + RLS).
  async function withTenant<T>(tenantId: string, fn: () => Promise<T>): Promise<T> {
    await q("SET ROLE app_user");
    await q("SELECT set_config('app.tenant_id', $1, false)", [tenantId]);
    try {
      return await fn();
    } finally {
      await q("RESET ROLE");
    }
  }

  section("Apply real migration SQL (auth, tenant, load, carrier, quote, shipment, tracking, doc, notify)");
  const migratedServices = ["auth-svc", "tenant-svc", "load-svc", "carrier-svc", "quote-svc", "shipment-svc", "tracking-svc", "doc-svc", "notify-svc"];
  for (const svc of migratedServices) {
    const sql = readFileSync(join(ROOT, "services", svc, "src", "db", "migrations.sql"), "utf8");
    await db.exec(sql);
    ok(`migrations applied: ${svc}`);
  }
  for (const svc of migratedServices) {
    const sql = readFileSync(join(ROOT, "services", svc, "src", "db", "migrations.sql"), "utf8");
    await db.exec(sql);
  }
  ok("all migrations are idempotent on an existing database");

  // PGlite connects as the `postgres` SUPERUSER, which bypasses RLS (FORCE RLS
  // only forces it on the table owner, not superusers). Production services
  // connect as a NON-superuser role, so create one and use it for tenant-scoped
  // work — this is what makes the RLS check faithful to production.
  section("Create non-superuser app role (so RLS engages, as in prod)");
  await db.exec(`
    CREATE ROLE app_user NOLOGIN;
    GRANT USAGE ON SCHEMA auth, tenant, load, carrier, quote, shipment, tracking, doc, notify TO app_user;
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA auth, tenant, load, carrier, quote, shipment, tracking, doc, notify TO app_user;
    GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA auth, tenant, load, carrier, quote, shipment, tracking, doc, notify TO app_user;
  `);
  ok("app_user role created + granted on all 9 schemas");

  // ── Seed RBAC (mirrors tenant-svc seed.ts) ──
  section("Seed permissions + system roles (tenant-svc)");
  const PERMS = [
    "load:create", "load:read", "load:update", "load:cancel", "load:duplicate",
    "quote:request", "quote:read", "quote:accept", "shipment:read",
    "doc:upload", "doc:read", "tenant:manage", "tenant:members", "billing:read",
  ];
  for (const p of PERMS) await q("INSERT INTO tenant.permissions (key) VALUES ($1) ON CONFLICT (key) DO NOTHING", [p]);
  const adminPerms = PERMS.filter((p) => p !== "doc:upload" || true); // shipper_admin = all above
  const role = await q<{ id: string }>(
    `INSERT INTO tenant.roles (tenant_id, key, name) VALUES (NULL,'shipper_admin','Shipper Admin') RETURNING id`,
  );
  const adminRoleId = role.rows[0]!.id;
  for (const p of adminPerms) {
    await q(
      `INSERT INTO tenant.role_permissions (role_id, permission_id)
       SELECT $1, id FROM tenant.permissions WHERE key=$2 ON CONFLICT DO NOTHING`,
      [adminRoleId, p],
    );
  }
  ok(`seeded ${PERMS.length} permissions + shipper_admin role`);

  // ── Seed demo carriers (mirrors carrier-svc migrate) ──
  const CARRIERS = [
    { name: "Maersk Line", modes: ["Ocean"], rating: 4.6, rel: 96 },
    { name: "Hapag-Lloyd", modes: ["Ocean"], rating: 4.5, rel: 95 },
    { name: "CMA CGM", modes: ["Ocean"], rating: 4.3, rel: 93 },
    { name: "Kuehne+Nagel", modes: ["Ocean", "Air", "Road"], rating: 4.5, rel: 95 },
  ];
  for (const c of CARRIERS) {
    await q(
      `INSERT INTO carrier.carriers (name, modes, rating_sum, ratings_count, reliability)
       VALUES ($1,$2,$3,20,$4)`,
      [c.name, c.modes, c.rating * 20, c.rel],
    );
  }
  ok(`seeded ${CARRIERS.length} carriers`);

  // ════════════════════════ PHASE 1 ════════════════════════
  section("PHASE 1 — register: create user, provision tenant + admin membership");

  // auth-svc.register: hash password, insert user
  const email = "founder@acme.test";
  const passwordHash = await argon2.hash("supersecret123", { type: argon2.argon2id });
  const userRow = await q<{ id: string }>(
    `INSERT INTO auth.users (email, name, password_hash) VALUES ($1,$2,$3) RETURNING id`,
    [email, "Founder", passwordHash],
  );
  const userId = userRow.rows[0]!.id;
  ok("user created (argon2id hash stored)");

  // tenant-svc.provisionTenant
  const tenantRow = await q<{ id: string }>(
    `INSERT INTO tenant.tenants (name, slug) VALUES ($1,$2) RETURNING id`,
    ["Acme Logistics", "acme-logistics"],
  );
  const tenantId = tenantRow.rows[0]!.id;
  await q(`INSERT INTO tenant.memberships (tenant_id, user_id, role_id) VALUES ($1,$2,$3)`, [
    tenantId, userId, adminRoleId,
  ]);
  ok("tenant provisioned + admin membership");

  // resolveMembership → perms (what login bakes into the JWT)
  const permsRes = await q<{ key: string }>(
    `SELECT p.key FROM tenant.memberships m
       JOIN tenant.roles r ON r.id = m.role_id
       JOIN tenant.role_permissions rp ON rp.role_id = r.id
       JOIN tenant.permissions p ON p.id = rp.permission_id
      WHERE m.user_id = $1`,
    [userId],
  );
  const perms = permsRes.rows.map((r) => r.key);
  perms.includes("load:create") && perms.includes("quote:accept")
    ? ok(`resolved ${perms.length} permissions for shipper_admin`)
    : bad("admin perms missing load:create/quote:accept");

  section("PHASE 1 — login: verify password");
  const u = await q<{ password_hash: string }>(`SELECT password_hash FROM auth.users WHERE email=$1`, [email]);
  (await argon2.verify(u.rows[0]!.password_hash, "supersecret123"))
    ? ok("correct password verifies")
    : bad("password verify failed");
  (await argon2.verify(u.rows[0]!.password_hash, "wrong")) ? bad("wrong password ACCEPTED") : ok("wrong password rejected");

  // ── load-svc: create (post) with reference sequence + RLS ──
  section("PHASE 1 — load-svc: post load (reference sequence + RLS write)");
  const nextRef = async (tid: string) => {
    void tid;
    const r = await q<{ value: number }>(`SELECT nextval('load.reference_number_seq')::int AS value`);
    return `EPL-LOAD-${String(r.rows[0]!.value).padStart(6, "0")}`;
  };

  const loadId = await withTenant(tenantId, async () => {
    const ref = await nextRef(tenantId);
    const r = await q<{ id: string; reference: string; status: string; version: number }>(
      `INSERT INTO load.loads
        (tenant_id, reference, status, mode, commodity, pickup, delivery, weight_kg, volume_m3, pieces, created_by)
       VALUES ($1,$2,'posted','Ocean','Machinery',$3,$4,18400,58,12,$5)
       RETURNING id, reference, status, version`,
      [
        tenantId, ref,
        JSON.stringify({ city: "Shanghai", country: "China", lat: 31.2, lng: 121.5 }),
        JSON.stringify({ city: "Hamburg", country: "Germany", lat: 53.5, lng: 10.0 }),
        userId,
      ],
    );
    ok(`load posted: ${r.rows[0]!.reference} (status=${r.rows[0]!.status}, v${r.rows[0]!.version})`);
    return r.rows[0]!.id;
  });

  // ── RLS isolation: a different tenant must NOT see this load ──
  section("PHASE 1 — RLS: cross-tenant isolation");
  const otherTenant = randomUUID();
  const seenByOther = await withTenant(otherTenant, async () =>
    (await q(`SELECT id FROM load.loads`)).rows.length,
  );
  seenByOther === 0 ? ok("other tenant sees 0 loads (RLS enforced)") : bad(`RLS LEAK: other tenant saw ${seenByOther}`);
  const seenByOwner = await withTenant(tenantId, async () => (await q(`SELECT id FROM load.loads`)).rows.length);
  seenByOwner === 1 ? ok("owner tenant sees its 1 load") : bad(`owner saw ${seenByOwner}`);

  // ── State machine: legal + illegal transitions ──
  section("PHASE 1 — load state machine");
  await withTenant(tenantId, async () => {
    // legal: posted → booked (mirrors canTransition)
    await q(`UPDATE load.loads SET status='booked', version=version+1 WHERE id=$1`, [loadId]);
    ok("posted → booked (legal)");
  });
  // illegal: delivered → posted is not allowed by LOAD_TRANSITIONS; assert via contract
  const { LOAD_TRANSITIONS, canTransition } = await import("../packages/contracts/src/load.ts");
  canTransition("posted", "booked") ? ok("contract: posted→booked allowed") : bad("contract says posted→booked illegal");
  !canTransition("delivered", "posted") ? ok("contract: delivered→posted rejected") : bad("delivered→posted allowed!");
  !canTransition("cancelled", "in_transit") ? ok("contract: cancelled→in_transit rejected") : bad("cancelled→in_transit allowed!");

  // ── Optimistic locking ──
  section("PHASE 1 — optimistic locking on update");
  await withTenant(tenantId, async () => {
    const cur = await q<{ version: number }>(`SELECT version FROM load.loads WHERE id=$1`, [loadId]);
    const v = cur.rows[0]!.version;
    // simulate stale update (client thinks version is v-1)
    const stale = await q(`UPDATE load.loads SET commodity='x', version=version+1 WHERE id=$1 AND version=$2`, [loadId, v - 1]);
    stale.affectedRows === 0 ? ok("stale-version update rejected (0 rows)") : bad("stale update applied!");
    const fresh = await q(`UPDATE load.loads SET commodity='Machinery parts', version=version+1 WHERE id=$1 AND version=$2`, [loadId, v]);
    fresh.affectedRows === 1 ? ok("fresh-version update applied") : bad("fresh update failed");
  });

  const shipmentId = await runPhase2(db, q, withTenant, tenantId, userId, loadId);
  await runPhase3(q, withTenant, tenantId, userId, shipmentId);
  await runPhase5(q, withTenant, tenantId, userId, shipmentId);
  await runPhase4();

  // ── Summary ──
  console.log(`\n\x1b[1m${failed === 0 ? "\x1b[32mALL CHECKS PASSED" : "\x1b[31mSOME CHECKS FAILED"}\x1b[0m  (${pass} passed, ${failed} failed)`);
  await db.close();
  process.exit(failed === 0 ? 0 : 1);
}

// ════════════════════════ PHASE 2 ════════════════════════
async function runPhase2(
  db: PGlite,
  q: (sql: string, params?: unknown[]) => Promise<any>,
  withTenant: <T>(t: string, fn: () => Promise<T>) => Promise<T>,
  tenantId: string,
  userId: string,
  loadId: string,
): Promise<string> {
  section("PHASE 2 — wire shipment-svc consumer to the in-memory bus");

  // shipment-svc consumer: on bid.accepted → create shipment (idempotent).
  subscribe("quote.events", async (event) => {
    if (event.type !== "bid.accepted") return;
    const { bid, quoteId, loadId: lid, reference } = event.payload;
    await withTenant(event.tenantId, async () => {
      const dedupe = await q(
        `INSERT INTO shipment.processed_events (event_id) VALUES ($1) ON CONFLICT DO NOTHING RETURNING event_id`,
        [event.id],
      );
      if (dedupe.rows.length === 0) return; // already processed
      const load = await q(`SELECT pickup, delivery FROM load.loads WHERE id=$1`, [lid]);
      const origin = load.rows[0]?.pickup ?? { city: "O", country: "", lat: 0, lng: 0 };
      const destination = load.rows[0]?.delivery ?? { city: "D", country: "", lat: 0, lng: 0 };
      const eta = new Date(Date.now() + bid.transitDays * 86400000).toISOString();
      const s = await q(
        `INSERT INTO shipment.shipments
          (tenant_id, reference, load_id, quote_id, carrier_id, carrier_name, status, mode,
           origin, destination, price_amount, price_currency, transit_days, eta_date, progress)
         VALUES ($1,$2,$3,$4,$5,$6,'booked',$7,$8,$9,$10,'USD',$11,$12,0)
         ON CONFLICT (quote_id) DO NOTHING RETURNING id`,
        [event.tenantId, reference, lid, quoteId, bid.carrierId, bid.carrierName, bid.mode,
         JSON.stringify(origin), JSON.stringify(destination), bid.price.amount, bid.transitDays, eta],
      );
      if (s.rows.length) {
        await q(
          `INSERT INTO shipment.bookings
            (shipment_id, tenant_id, load_id, quote_id, bid_id, carrier_tenant_id)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [s.rows[0].id, event.tenantId, lid, quoteId, bid.id, bid.carrierId],
        );
        for (let i = 0; i < 8; i++)
          await q(
            `INSERT INTO shipment.milestones (shipment_id, tenant_id, status, description, location, completed, seq)
             VALUES ($1,$2,$3,'m','loc',$4,$5)`,
            [s.rows[0].id, event.tenantId, `stage-${i}`, i === 0, i],
          );
      }
    });
  });
  ok("consumer subscribed to bid.accepted");

  section("PHASE 2 — quote-svc: create quote for the load");
  const loadReference = await withTenant(tenantId, async () =>
    (await q(`SELECT reference FROM load.loads WHERE id=$1`, [loadId])).rows[0].reference as string,
  );
  const quoteId = await withTenant(tenantId, async () => {
    const r = await q(
      `INSERT INTO quote.quotes (tenant_id, load_id, reference, mode, created_by)
       VALUES ($1,$2,$3,'Ocean',$4) RETURNING id`,
      [tenantId, loadId, loadReference, userId],
    );
    return r.rows[0].id as string;
  });
  ok(`quote created: ${quoteId.slice(0, 8)}…`);

  section("PHASE 2 — auto-generate carrier bids (real carrier rows)");
  const carriers = (await q(`SELECT id, name FROM carrier.carriers WHERE 'Ocean' = ANY(modes) LIMIT 4`)).rows;
  await withTenant(tenantId, async () => {
    for (const c of carriers) {
      const price = Math.round(8600 * (0.85 + Math.random() * 0.4));
      await q(
        `INSERT INTO quote.bids (tenant_id, quote_id, carrier_id, mode, price_amount, transit_days)
         VALUES ($1,$2,$3,'Ocean',$4,$5)`,
        [tenantId, quoteId, c.id, price, 28 + Math.floor(Math.random() * 8)],
      );
    }
  });
  const bidList = await withTenant(tenantId, async () =>
    (await q(`SELECT b.id, b.price_amount, c.name FROM quote.bids b JOIN carrier.carriers c ON c.id=b.carrier_id WHERE quote_id=$1 ORDER BY price_amount ASC`, [quoteId])).rows,
  );
  bidList.length === carriers.length ? ok(`${bidList.length} bids generated`) : bad("bid count mismatch");
  console.log("  bids:", bidList.map((b: any) => `${b.name} $${b.price_amount}`).join("  |  "));

  section("PHASE 2 — accept cheapest bid → emit bid.accepted (outbox → bus)");
  const cheapest = bidList[0];
  const acceptEventId = randomUUID();
  await withTenant(tenantId, async () => {
    await q(`UPDATE quote.bids SET status='accepted' WHERE id=$1`, [cheapest.id]);
    await q(`UPDATE quote.bids SET status='rejected' WHERE quote_id=$1 AND id<>$2`, [quoteId, cheapest.id]);
    await q(`UPDATE quote.quotes SET status='awarded' WHERE id=$1`, [quoteId]);
  });
  const bidRow = (await withTenant(tenantId, async () =>
    (await q(`SELECT * FROM quote.bids WHERE id=$1`, [cheapest.id])).rows))[0];
  // publish the event (the outbox relay would do this for real)
  await publish("quote.events", {
    id: acceptEventId,
    type: "bid.accepted",
    tenantId,
    correlationId: randomUUID(),
    payload: {
      quoteId, loadId, reference: loadReference,
      bid: {
        id: cheapest.id, carrierId: bidRow.carrier_id, carrierName: cheapest.name, mode: bidRow.mode,
        price: { amount: Number(bidRow.price_amount), currency: "USD" }, transitDays: bidRow.transit_days,
      },
    },
  });
  ok("bid.accepted published & consumed");

  section("PHASE 2 — shipment created by the consumer");
  const ships = await withTenant(tenantId, async () =>
    (await q(`SELECT reference, carrier_name, status, transit_days, price_amount FROM shipment.shipments WHERE quote_id=$1`, [quoteId])).rows,
  );
  if (ships.length === 1) {
    const s = ships[0];
    ok(`shipment created: ${s.reference} via ${s.carrier_name} (${s.status}, ${s.transit_days}d, $${s.price_amount})`);
  } else {
    bad(`expected 1 shipment, got ${ships.length}`);
  }
  const ms = await withTenant(tenantId, async () =>
    (await q(`SELECT count(*)::int n FROM shipment.milestones`)).rows[0].n,
  );
  ms === 8 ? ok("8 milestones seeded") : bad(`expected 8 milestones, got ${ms}`);
  const bookings = await withTenant(tenantId, async () =>
    (await q(`SELECT count(*)::int n FROM shipment.bookings WHERE quote_id=$1`, [quoteId])).rows[0].n,
  );
  bookings === 1 ? ok("accepted bid created one normalized booking") : bad(`expected 1 booking, got ${bookings}`);

  section("PHASE 2 — idempotency: re-deliver the same event");
  await publish("quote.events", {
    id: acceptEventId, type: "bid.accepted", tenantId, correlationId: randomUUID(),
    payload: { quoteId, loadId, reference: loadReference,
      bid: { id: cheapest.id, carrierId: bidRow.carrier_id, carrierName: cheapest.name, mode: bidRow.mode, price: { amount: 1, currency: "USD" }, transitDays: 1 } },
  });
  const dupCount = await withTenant(tenantId, async () =>
    (await q(`SELECT count(*)::int n FROM shipment.shipments WHERE quote_id=$1`, [quoteId])).rows[0].n,
  );
  dupCount === 1 ? ok("duplicate event ignored (still 1 shipment)") : bad(`idempotency FAILED: ${dupCount} shipments`);

  const sid = await withTenant(tenantId, async () =>
    (await q(`SELECT id FROM shipment.shipments WHERE quote_id=$1`, [quoteId])).rows[0].id,
  );
  return sid as string;
}

// ════════════════════════ PHASE 3 ════════════════════════
async function runPhase3(
  q: (sql: string, params?: unknown[]) => Promise<any>,
  withTenant: <T>(t: string, fn: () => Promise<T>) => Promise<T>,
  tenantId: string,
  userId: string,
  shipmentId: string,
) {
  const { haversineKm } = await import("../services/tracking-svc/src/modules/tracking/geo.ts");
  const origin = { city: "Shanghai", country: "China", lat: 31.2, lng: 121.5 };
  const destination = { city: "Hamburg", country: "Germany", lat: 53.5, lng: 10.0 };
  const totalKm = haversineKm(origin, destination);

  section("PHASE 3 — tracking-svc: open channel from shipment.created (consumer)");
  await withTenant(tenantId, async () => {
    const eta = new Date(Date.now() + (totalKm / 35) * 3600000).toISOString();
    await q(
      `INSERT INTO tracking.states (shipment_id, tenant_id, origin, destination, total_km, lat, lng, progress, remaining_km, eta_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,0,$5,$8) ON CONFLICT (shipment_id) DO NOTHING`,
      [shipmentId, tenantId, JSON.stringify(origin), JSON.stringify(destination), totalKm, origin.lat, origin.lng, eta],
    );
  });
  ok(`tracking channel opened (total ${Math.round(totalKm)} km)`);

  section("PHASE 3 — ingest GPS positions → progress + ETA recompute");
  // Two reports: midway, then near destination (mirrors tracking.service.ingest math).
  const ingest = async (lat: number, lng: number) =>
    withTenant(tenantId, async () => {
      const here = { lat, lng };
      const remainingKm = haversineKm(here, destination);
      const progress = Math.max(0, Math.min(100, Math.round((1 - remainingKm / totalKm) * 100)));
      await q(`INSERT INTO tracking.positions (shipment_id, tenant_id, lat, lng) VALUES ($1,$2,$3,$4)`, [shipmentId, tenantId, lat, lng]);
      await q(
        `UPDATE tracking.states SET lat=$2,lng=$3,progress=$4,remaining_km=$5,updated_at=now() WHERE shipment_id=$1`,
        [shipmentId, lat, lng, progress, remainingKm],
      );
      return progress;
    });

  const p1 = await ingest(45.0, 60.0); // roughly midway across Eurasia
  const p2 = await ingest(53.0, 12.0); // near Hamburg
  p1 > 0 && p1 < 100 ? ok(`midway report → progress ${p1}%`) : bad(`unexpected midway progress ${p1}`);
  p2 > p1 ? ok(`near-destination report → progress ${p2}% (increasing)`) : bad(`progress did not increase: ${p1}→${p2}`);

  const histN = await withTenant(tenantId, async () =>
    (await q(`SELECT count(*)::int n FROM tracking.positions WHERE shipment_id=$1`, [shipmentId])).rows[0].n,
  );
  histN === 2 ? ok("position history recorded (2 points)") : bad(`expected 2 history rows, got ${histN}`);

  section("PHASE 3 — tracking RLS: other tenant sees no state");
  const leak = await withTenant(randomUUID(), async () =>
    (await q(`SELECT count(*)::int n FROM tracking.states`)).rows[0].n,
  );
  leak === 0 ? ok("other tenant sees 0 tracking states (RLS)") : bad(`tracking RLS LEAK: ${leak}`);

  section("PHASE 3 — doc-svc: upload invoice + customs, verify, list filters");
  const upload = async (type: string, name: string, amount?: number) =>
    withTenant(tenantId, async () => {
      const r = await q(
        `INSERT INTO doc.documents (tenant_id, shipment_id, type, name, size_bytes, content_type, storage_key, amount, currency, uploaded_by)
         VALUES ($1,$2,$3,$4,1024,'application/pdf',$5,$6,$7,$8) RETURNING id, status`,
        [tenantId, shipmentId, type, name, `${tenantId}/${name}`, amount ?? null, amount ? "USD" : null, userId],
      );
      return r.rows[0];
    });

  const inv = await upload("Commercial Invoice", "invoice.pdf", 7505);
  await upload("Customs Declaration", "customs.pdf");
  inv.status === "pending" ? ok("invoice uploaded (status=pending)") : bad("invoice status wrong");

  await withTenant(tenantId, async () => {
    await q(`UPDATE doc.documents SET status='verified' WHERE id=$1`, [inv.id]);
  });
  const verified = await withTenant(tenantId, async () =>
    (await q(`SELECT status FROM doc.documents WHERE id=$1`, [inv.id])).rows[0].status,
  );
  verified === "verified" ? ok("invoice verified") : bad("verify failed");

  const invoices = await withTenant(tenantId, async () =>
    (await q(`SELECT count(*)::int n FROM doc.documents WHERE type='Commercial Invoice'`)).rows[0].n,
  );
  const customs = await withTenant(tenantId, async () =>
    (await q(`SELECT count(*)::int n FROM doc.documents WHERE type='Customs Declaration'`)).rows[0].n,
  );
  invoices === 1 && customs === 1 ? ok("type filters work (1 invoice, 1 customs)") : bad(`filter mismatch inv=${invoices} cust=${customs}`);

  section("PHASE 3 — delivery confirmation (POD) + doc RLS");
  await upload("Proof of Delivery", "POD.pdf");
  const pods = await withTenant(tenantId, async () =>
    (await q(`SELECT count(*)::int n FROM doc.documents WHERE type='Proof of Delivery'`)).rows[0].n,
  );
  pods === 1 ? ok("POD recorded (delivery confirmed)") : bad("POD missing");

  const docLeak = await withTenant(randomUUID(), async () =>
    (await q(`SELECT count(*)::int n FROM doc.documents`)).rows[0].n,
  );
  docLeak === 0 ? ok("other tenant sees 0 documents (RLS)") : bad(`doc RLS LEAK: ${docLeak}`);
}

// ════════════════════════ PHASE 5 ════════════════════════
async function runPhase5(
  q: (sql: string, params?: unknown[]) => Promise<any>,
  withTenant: <T>(t: string, fn: () => Promise<T>) => Promise<T>,
  shipperTenantId: string,
  shipperUserId: string,
  shipmentId: string,
) {
  section("PHASE 5 — canonical booking + participant RBAC");
  const shipment = await withTenant(shipperTenantId, async () =>
    (await q(`SELECT * FROM shipment.shipments WHERE id=$1`, [shipmentId])).rows[0],
  );
  const carrierTenantId = shipment.carrier_id as string;
  const brokerTenantId = randomUUID();
  const brokerUserId = randomUUID();

  const carrierVisible = await withTenant(carrierTenantId, async () =>
    (await q(`SELECT count(*)::int n FROM shipment.shipments WHERE id=$1`, [shipmentId])).rows[0].n,
  );
  carrierVisible === 1 ? ok("selected carrier can read the one canonical shipment") : bad("carrier cannot read awarded shipment");

  const strangerVisible = await withTenant(randomUUID(), async () =>
    (await q(`SELECT count(*)::int n FROM shipment.shipments WHERE id=$1`, [shipmentId])).rows[0].n,
  );
  strangerVisible === 0 ? ok("unassigned company cannot read shipment") : bad("shipment leaked to unassigned company");

  section("PHASE 5 — shipper assigns broker (normalized assignment + timeline)");
  await withTenant(shipperTenantId, async () => {
    await q(`UPDATE shipment.shipments SET broker_tenant_id=$2, broker_name='Tashkent Customs Partners' WHERE id=$1`, [shipmentId, brokerTenantId]);
    await q(
      `INSERT INTO shipment.broker_assignments
        (shipment_id, shipper_tenant_id, broker_tenant_id, broker_name, assigned_by)
       VALUES ($1,$2,$3,'Tashkent Customs Partners',$4)`,
      [shipmentId, shipperTenantId, brokerTenantId, shipperUserId],
    );
    await q(
      `INSERT INTO shipment.activities
        (shipment_id, tenant_id, type, title, actor_user_id, actor_role, reference_id)
       VALUES ($1,$2,'broker.assigned','Tashkent Customs Partners assigned as customs broker',$3,'shipper_admin',$4)`,
      [shipmentId, shipperTenantId, shipperUserId, brokerTenantId],
    );
  });
  const brokerView = await withTenant(brokerTenantId, async () => ({
    shipments: (await q(`SELECT count(*)::int n FROM shipment.shipments WHERE id=$1`, [shipmentId])).rows[0].n,
    assignments: (await q(`SELECT count(*)::int n FROM shipment.broker_assignments WHERE shipment_id=$1 AND active`, [shipmentId])).rows[0].n,
  }));
  brokerView.shipments === 1 && brokerView.assignments === 1
    ? ok("assigned broker sees shipment + active assignment")
    : bad(`broker access mismatch: ${JSON.stringify(brokerView)}`);

  section("PHASE 5 — broker requests Commercial Invoice");
  const requestId = await withTenant(brokerTenantId, async () => {
    const result = await q(
      `INSERT INTO doc.document_requests
        (shipment_id, shipment_reference, tenant_id, broker_tenant_id, broker_user_id,
         broker_name, document_type, title, description, required, due_date, comment)
       VALUES ($1,$2,$3,$4,$5,'Tashkent Customs Partners','Commercial Invoice',
         'Commercial Invoice','Signed invoice for customs',true,now() + interval '2 days',
         'Please provide signed commercial invoice for customs clearance.') RETURNING id`,
      [shipmentId, shipment.reference, shipperTenantId, brokerTenantId, brokerUserId],
    );
    return result.rows[0].id as string;
  });
  ok("broker created document request on its assigned shipment");

  const shipperRequest = await withTenant(shipperTenantId, async () => {
    await q(`UPDATE doc.document_requests SET status='VIEWED', updated_at=now() WHERE id=$1 AND status='REQUESTED'`, [requestId]);
    return (await q(`SELECT * FROM doc.document_requests WHERE id=$1`, [requestId])).rows[0];
  });
  shipperRequest.status === "VIEWED" ? ok("shipper received and viewed broker request") : bad("shipper did not receive request");

  section("PHASE 5 — shipper uploads request file; broker approves");
  const documentId = await withTenant(shipperTenantId, async () => {
    const result = await q(
      `INSERT INTO doc.documents
        (tenant_id, shipment_id, document_request_id, broker_tenant_id, carrier_tenant_id,
         type, name, size_bytes, content_type, storage_key, uploaded_by)
       VALUES ($1,$2,$3,$4,$5,'Commercial Invoice','signed-commercial-invoice.pdf',2048,
         'application/pdf',$6,$7) RETURNING id`,
      [shipperTenantId, shipmentId, requestId, brokerTenantId, carrierTenantId, `${shipperTenantId}/invoice.pdf`, shipperUserId],
    );
    await q(`UPDATE doc.document_requests SET status='UPLOADED', document_id=$2, updated_at=now() WHERE id=$1`, [requestId, result.rows[0].id]);
    return result.rows[0].id as string;
  });

  const brokerUploaded = await withTenant(brokerTenantId, async () => ({
    request: (await q(`SELECT status FROM doc.document_requests WHERE id=$1`, [requestId])).rows[0]?.status,
    docs: (await q(`SELECT count(*)::int n FROM doc.documents WHERE id=$1`, [documentId])).rows[0].n,
  }));
  brokerUploaded.request === "UPLOADED" && brokerUploaded.docs === 1
    ? ok("broker immediately sees uploaded requested document")
    : bad("uploaded document is not visible to broker");

  await withTenant(brokerTenantId, async () => {
    await q(`UPDATE doc.document_requests SET status='APPROVED', comment='Approved for customs clearance', updated_at=now() WHERE id=$1`, [requestId]);
    await q(`UPDATE doc.documents SET status='verified' WHERE id=$1`, [documentId]);
  });
  const finalRequest = await withTenant(shipperTenantId, async () =>
    (await q(`SELECT status, comment FROM doc.document_requests WHERE id=$1`, [requestId])).rows[0],
  );
  finalRequest.status === "APPROVED" ? ok("shipper sees APPROVED document status") : bad("approval did not reach shipper");

  section("PHASE 5 — shared tracking + notification isolation");
  await withTenant(shipperTenantId, async () => {
    await q(`UPDATE tracking.states SET participant_tenant_ids=$2::uuid[] WHERE shipment_id=$1`, [shipmentId, [carrierTenantId, brokerTenantId]]);
    await q(`UPDATE tracking.positions SET participant_tenant_ids=$2::uuid[] WHERE shipment_id=$1`, [shipmentId, [carrierTenantId, brokerTenantId]]);
  });
  const brokerTracking = await withTenant(brokerTenantId, async () =>
    (await q(`SELECT count(*)::int n FROM tracking.states WHERE shipment_id=$1`, [shipmentId])).rows[0].n,
  );
  brokerTracking === 1 ? ok("assigned broker can read shared tracking state") : bad("broker tracking access missing");

  const insertNotification = (tenantId: string, kind: string, title: string, referenceId: string) =>
    withTenant(tenantId, async () => q(
      `INSERT INTO notify.notifications
        (tenant_id, company_id, kind, title, body, shipment_id, reference_id)
       VALUES ($1,$1,$2,$3,$3,$4,$5)`,
      [tenantId, kind, title, shipmentId, referenceId],
    ));
  await insertNotification(shipperTenantId, "document_requested", "Customs Broker requested Commercial Invoice", requestId);
  await insertNotification(brokerTenantId, "document_uploaded", "Requested document has been uploaded", requestId);
  await insertNotification(shipperTenantId, "document_approved", "Commercial Invoice approved", requestId);
  const shipperNotifications = await withTenant(shipperTenantId, async () => (await q(`SELECT count(*)::int n FROM notify.notifications`)).rows[0].n);
  const brokerNotifications = await withTenant(brokerTenantId, async () => (await q(`SELECT count(*)::int n FROM notify.notifications`)).rows[0].n);
  shipperNotifications === 2 && brokerNotifications === 1
    ? ok("role-specific notifications persisted without cross-company leakage")
    : bad(`notification counts shipper=${shipperNotifications}, broker=${brokerNotifications}`);

  section("PHASE 5 — reload-equivalent persistence reads");
  const persisted = await withTenant(shipperTenantId, async () => ({
    shipment: (await q(`SELECT count(*)::int n FROM shipment.shipments WHERE id=$1`, [shipmentId])).rows[0].n,
    booking: (await q(`SELECT count(*)::int n FROM shipment.bookings WHERE shipment_id=$1`, [shipmentId])).rows[0].n,
    request: (await q(`SELECT count(*)::int n FROM doc.document_requests WHERE id=$1 AND status='APPROVED'`, [requestId])).rows[0].n,
    document: (await q(`SELECT count(*)::int n FROM doc.documents WHERE id=$1 AND status='verified'`, [documentId])).rows[0].n,
  }));
  Object.values(persisted).every((count) => count === 1)
    ? ok("shipment, booking, request, and document survive fresh database reads")
    : bad(`persistence mismatch: ${JSON.stringify(persisted)}`);
}

// ════════════════════════ PHASE 4 ════════════════════════
async function runPhase4() {
  // genius-svc is stateless — import the REAL service class and call its tools.
  const { GeniusService } = await import("../services/genius-svc/src/modules/genius/genius.service.ts");
  const genius = new GeniusService();

  section("PHASE 4 — EPL Genius chat (KB answer)");
  const ans = await genius.ask({ question: "What's the difference between FOB and CIF?" });
  ans.answer.includes("FOB") && ans.sources.length > 0
    ? ok(`chat answered with ${ans.sources.length} sources`)
    : bad("chat KB answer missing");
  const fallback = await genius.ask({ question: "zzz nonsense xyz" });
  fallback.answer.length > 0 ? ok("chat fallback returns guidance") : bad("no fallback answer");

  section("PHASE 4 — freight rate estimation");
  const rate = genius.estimateRate({
    origin: "Shanghai", destination: "Rotterdam", mode: "Ocean", weightKg: 18400, volumeM3: 58,
  });
  rate.lowUsd < rate.midUsd && rate.midUsd < rate.highUsd
    ? ok(`rate range $${rate.lowUsd}–$${rate.highUsd} (mid $${rate.midUsd})`)
    : bad("rate range not ordered");
  rate.chargeableWeightKg >= 18400 ? ok(`chargeable weight ${rate.chargeableWeightKg} kg`) : bad("chargeable weight wrong");
  // Air on the same cargo should cost more and be faster than Ocean.
  const air = genius.estimateRate({ origin: "Shanghai", destination: "Rotterdam", mode: "Air", weightKg: 18400 });
  air.midUsd > rate.midUsd && air.transitDaysHigh < rate.transitDaysHigh
    ? ok("air pricier & faster than ocean (model sane)")
    : bad(`model inconsistent: air $${air.midUsd}/${air.transitDaysHigh}d vs ocean $${rate.midUsd}/${rate.transitDaysHigh}d`);

  section("PHASE 4 — route optimization (priorities)");
  const cheapest = genius.optimizeRoute({ origin: "A", destination: "B", priority: "cost", weightKg: 10000 });
  const fastest = genius.optimizeRoute({ origin: "A", destination: "B", priority: "speed", weightKg: 10000 });
  const greenest = genius.optimizeRoute({ origin: "A", destination: "B", priority: "green", weightKg: 10000 });
  const recCost = cheapest.options.find((o) => o.recommended)!;
  const recSpeed = fastest.options.find((o) => o.recommended)!;
  const recGreen = greenest.options.find((o) => o.recommended)!;
  recCost.estCostUsd === Math.min(...cheapest.options.map((o) => o.estCostUsd))
    ? ok(`cost priority → ${recCost.mode} (cheapest)`)
    : bad("cost priority did not pick cheapest");
  recSpeed.transitDays === Math.min(...fastest.options.map((o) => o.transitDays))
    ? ok(`speed priority → ${recSpeed.mode} (fastest)`)
    : bad("speed priority did not pick fastest");
  recGreen.co2Kg === Math.min(...greenest.options.map((o) => o.co2Kg))
    ? ok(`green priority → ${recGreen.mode} (lowest CO₂)`)
    : bad("green priority did not pick greenest");

  section("PHASE 4 — documentation & customs assistance");
  const customs = genius.docAssist({ topic: "customs", commodity: "machinery", origin: "CN", destination: "NL" });
  customs.checklist.some((c) => c.toLowerCase().includes("hs code"))
    ? ok(`customs checklist (${customs.checklist.length} items, incl. HS code)`)
    : bad("customs checklist missing HS code");
  const docs = genius.docAssist({ topic: "documentation" });
  docs.checklist.length >= 5 ? ok(`documentation checklist (${docs.checklist.length} items)`) : bad("doc checklist too short");
}

main().catch((e) => {
  console.error("\x1b[31mharness crashed:\x1b[0m", e);
  process.exit(1);
});

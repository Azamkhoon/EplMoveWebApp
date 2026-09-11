import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { Pool, type PoolClient } from "pg";
import {
  CreateLoadInput,
  UpdateLoadInput,
  Load,
  LoadStatus,
  canTransition,
} from "@epl/contracts";
import { Events } from "@epl/contracts";
import { enqueueOutbox, makeEvent } from "@epl/events";
import type { RequestContext } from "@epl/auth";
import { config } from "../../config";

type Ctx = Pick<RequestContext, "userId" | "tenantId" | "role" | "correlationId">;

/**
 * Load lifecycle service. Every write runs in a tenant-scoped transaction
 * (RLS enforced) and emits domain events via the transactional outbox.
 * See docs/architecture/03-data-model.md & 05-events.md.
 */
@Injectable()
export class LoadService {
  private readonly pool = new Pool({
    host: config.DB_HOST,
    port: config.DB_PORT,
    user: config.DB_USER,
    password: config.DB_PASSWORD,
    database: config.DB_NAME,
  });

  /** Run fn in a transaction with RLS tenant variable set. */
  private async tx<T>(tenantId: string, fn: (c: PoolClient) => Promise<T>): Promise<T> {
    const c = await this.pool.connect();
    try {
      await c.query("BEGIN");
      await c.query("SELECT set_config('app.tenant_id', $1, true)", [tenantId]);
      await c.query(`SET LOCAL search_path TO load, public`);
      const out = await fn(c);
      await c.query("COMMIT");
      return out;
    } catch (e) {
      await c.query("ROLLBACK");
      throw e;
    } finally {
      c.release();
    }
  }

  private rowToLoad(r: Record<string, unknown>): Load {
    return Load.parse({
      id: r.id,
      tenantId: r.tenant_id,
      reference: r.reference,
      status: r.status,
      mode: r.mode,
      serviceLevel: r.service_level ?? undefined,
      equipmentKind: r.equipment_kind ?? undefined,
      equipmentCode: r.equipment_code ?? undefined,
      commodity: r.commodity,
      cargoDescription: r.cargo_description ?? undefined,
      pickup: r.pickup,
      delivery: r.delivery,
      weightKg: Number(r.weight_kg),
      volumeM3: Number(r.volume_m3),
      pieces: r.pieces ?? undefined,
      dimensions: r.dimensions ?? undefined,
      value: r.value ?? undefined,
      readyDate: r.ready_date ? new Date(r.ready_date as string).toISOString() : undefined,
      requiredDeliveryDate: r.required_delivery_date
        ? new Date(r.required_delivery_date as string).toISOString()
        : undefined,
      incoterm: r.incoterm ?? undefined,
      truckType: r.truck_type ?? undefined,
      trailerType: r.trailer_type ?? undefined,
      temperature: r.temperature ?? undefined,
      customsInfo: r.customs_info ?? undefined,
      dangerousGoods: Boolean(r.dangerous_goods),
      specialInstructions: r.special_instructions ?? undefined,
      requiredDocuments: r.required_documents ?? [],
      notes: r.notes ?? undefined,
      items: r.items ?? undefined,
      createdBy: r.created_by,
      createdAt: new Date(r.created_at as string).toISOString(),
      updatedAt: new Date(r.updated_at as string).toISOString(),
      version: Number(r.version),
    });
  }

  private async nextReference(c: PoolClient): Promise<string> {
    const { rows } = await c.query<{ last_value: number }>(
      `SELECT nextval('load.reference_number_seq')::int AS last_value`,
    );
    const n = rows[0]!.last_value;
    return `EPL-LOAD-${String(n).padStart(6, "0")}`;
  }

  // ── Create (post or draft) ──
  async create(ctx: Ctx, body: unknown): Promise<Load> {
    const input = CreateLoadInput.parse(body);
    const status: LoadStatus = input.asDraft ? "draft" : "posted";

    return this.tx(ctx.tenantId, async (c) => {
      const reference = await this.nextReference(c);
      const { rows } = await c.query(
        `INSERT INTO load.loads
          (tenant_id, reference, status, mode, service_level, equipment_kind, equipment_code,
           commodity, cargo_description, pickup, delivery, weight_kg, volume_m3, pieces,
           dimensions, value, ready_date, required_delivery_date, incoterm, truck_type,
           trailer_type, temperature, customs_info, dangerous_goods, special_instructions,
           required_documents, notes, items, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,
                 $20,$21,$22,$23,$24,$25,$26,$27,$28,$29)
         RETURNING *`,
        [
          ctx.tenantId, reference, status, input.mode, input.serviceLevel ?? null,
          input.equipmentKind ?? null, input.equipmentCode ?? null, input.commodity,
          input.cargoDescription ?? null, JSON.stringify(input.pickup), JSON.stringify(input.delivery),
          input.weightKg, input.volumeM3, input.pieces ?? null,
          input.dimensions ? JSON.stringify(input.dimensions) : null,
          input.value ? JSON.stringify(input.value) : null, input.readyDate ?? null,
          input.requiredDeliveryDate ?? null, input.incoterm ?? null, input.truckType ?? null,
          input.trailerType ?? null, input.temperature ? JSON.stringify(input.temperature) : null,
          input.customsInfo ?? null, input.dangerousGoods, input.specialInstructions ?? null,
          JSON.stringify(input.requiredDocuments), input.notes ?? null,
          input.items ? JSON.stringify(input.items) : null, ctx.userId,
        ],
      );
      const load = this.rowToLoad(rows[0]!);

      await this.emit(c, ctx, status === "posted" ? Events.LoadEventType.Posted : Events.LoadEventType.Drafted, load.id, {
        load,
      });
      return load;
    });
  }

  // ── Read ──
  async getById(ctx: Ctx, id: string): Promise<Load> {
    return this.tx(ctx.tenantId, async (c) => {
      const { rows } = await c.query(`SELECT * FROM load.loads WHERE id = $1`, [id]);
      if (!rows[0]) throw new NotFoundException("load not found");
      return this.rowToLoad(rows[0]);
    });
  }

  async list(ctx: Ctx, opts: { status?: LoadStatus; limit?: number }): Promise<Load[]> {
    return this.tx(ctx.tenantId, async (c) => {
      const params: unknown[] = [];
      let where = "";
      if (opts.status) {
        params.push(opts.status);
        where = `WHERE status = $${params.length}`;
      }
      params.push(Math.min(opts.limit ?? 50, 100));
      const { rows } = await c.query(
        `SELECT * FROM load.loads ${where} ORDER BY created_at DESC LIMIT $${params.length}`,
        params,
      );
      return rows.map((r) => this.rowToLoad(r));
    });
  }

  // ── Update (optimistic lock) ──
  async update(ctx: Ctx, id: string, body: unknown): Promise<Load> {
    const input = UpdateLoadInput.parse(body);
    return this.tx(ctx.tenantId, async (c) => {
      const { rows: cur } = await c.query(`SELECT * FROM load.loads WHERE id = $1`, [id]);
      if (!cur[0]) throw new NotFoundException("load not found");
      const existing = this.rowToLoad(cur[0]);
      if (existing.version !== input.version) {
        throw new ConflictException("version conflict — reload and retry");
      }
      // Only draft/posted loads are editable.
      if (!["draft", "posted", "open_for_bids"].includes(existing.status)) {
        throw new ConflictException(`cannot edit a ${existing.status} load`);
      }

      const merged = { ...existing, ...stripUndefined(input) };
      const { rows } = await c.query(
        `UPDATE load.loads SET
           mode=$2, service_level=$3, equipment_kind=$4, equipment_code=$5, commodity=$6,
           cargo_description=$7, pickup=$8, delivery=$9, weight_kg=$10, volume_m3=$11,
           pieces=$12, dimensions=$13, value=$14, ready_date=$15,
           required_delivery_date=$16, incoterm=$17, truck_type=$18, trailer_type=$19,
           temperature=$20, customs_info=$21, dangerous_goods=$22,
           special_instructions=$23, required_documents=$24, notes=$25, items=$26,
           updated_at=now(), version = version + 1
         WHERE id=$1 RETURNING *`,
        [
          id, merged.mode, merged.serviceLevel ?? null, merged.equipmentKind ?? null,
          merged.equipmentCode ?? null, merged.commodity, merged.cargoDescription ?? null,
          JSON.stringify(merged.pickup), JSON.stringify(merged.delivery), merged.weightKg,
          merged.volumeM3, merged.pieces ?? null,
          merged.dimensions ? JSON.stringify(merged.dimensions) : null,
          merged.value ? JSON.stringify(merged.value) : null, merged.readyDate ?? null,
          merged.requiredDeliveryDate ?? null, merged.incoterm ?? null,
          merged.truckType ?? null, merged.trailerType ?? null,
          merged.temperature ? JSON.stringify(merged.temperature) : null,
          merged.customsInfo ?? null, merged.dangerousGoods,
          merged.specialInstructions ?? null, JSON.stringify(merged.requiredDocuments),
          merged.notes ?? null,
          merged.items ? JSON.stringify(merged.items) : null,
        ],
      );
      const load = this.rowToLoad(rows[0]!);
      await this.emit(c, ctx, Events.LoadEventType.Updated, load.id, { load });
      return load;
    });
  }

  // ── Status transition (state machine) ──
  async transition(ctx: Ctx, id: string, to: LoadStatus): Promise<Load> {
    return this.tx(ctx.tenantId, async (c) => {
      const { rows: cur } = await c.query(`SELECT * FROM load.loads WHERE id = $1`, [id]);
      if (!cur[0]) throw new NotFoundException("load not found");
      const existing = this.rowToLoad(cur[0]);
      if (!canTransition(existing.status, to)) {
        throw new ConflictException(`illegal transition ${existing.status} → ${to}`);
      }
      const { rows } = await c.query(
        `UPDATE load.loads SET status=$2, updated_at=now(), version=version+1 WHERE id=$1 RETURNING *`,
        [id, to],
      );
      const load = this.rowToLoad(rows[0]!);
      const type =
        to === "cancelled" ? Events.LoadEventType.Cancelled : Events.LoadEventType.Updated;
      await this.emit(c, ctx, type, load.id, {
        loadId: load.id,
        reference: load.reference,
        from: existing.status,
        to,
      });
      return load;
    });
  }

  // ── Cancel (convenience) ──
  cancel(ctx: Ctx, id: string): Promise<Load> {
    return this.transition(ctx, id, "cancelled");
  }

  // ── Duplicate → new draft ──
  async duplicate(ctx: Ctx, id: string): Promise<Load> {
    const src = await this.getById(ctx, id);
    return this.create(ctx, {
      mode: src.mode,
      serviceLevel: src.serviceLevel,
      equipmentKind: src.equipmentKind,
      equipmentCode: src.equipmentCode,
      commodity: src.commodity,
      cargoDescription: src.cargoDescription,
      pickup: src.pickup,
      delivery: src.delivery,
      weightKg: src.weightKg,
      volumeM3: src.volumeM3,
      pieces: src.pieces,
      dimensions: src.dimensions,
      value: src.value,
      readyDate: src.readyDate,
      requiredDeliveryDate: src.requiredDeliveryDate,
      incoterm: src.incoterm,
      truckType: src.truckType,
      trailerType: src.trailerType,
      temperature: src.temperature,
      customsInfo: src.customsInfo,
      dangerousGoods: src.dangerousGoods,
      specialInstructions: src.specialInstructions,
      requiredDocuments: src.requiredDocuments,
      notes: src.notes,
      items: src.items,
      asDraft: true,
    });
  }

  // ── emit a domain event into the outbox (same tx as the write) ──
  private async emit(
    c: PoolClient,
    ctx: Ctx,
    type: string,
    loadId: string,
    payload: unknown,
  ): Promise<void> {
    const event = makeEvent({
      type,
      tenantId: ctx.tenantId,
      payload,
      actor: { userId: ctx.userId, role: ctx.role },
      correlationId: ctx.correlationId,
    });
    await enqueueOutbox(c, config.DB_SCHEMA, {
      topic: Events.Topics.load,
      orderingKey: loadId,
      event,
    });
  }
}

function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}

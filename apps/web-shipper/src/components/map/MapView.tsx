import { Fragment, useEffect } from "react";
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import type { GeoPoint } from "@/types";

export type MarkerKind = "origin" | "destination" | "vehicle" | "load";

export interface MapMarker {
  point: GeoPoint;
  label?: string;
  sublabel?: string;
  kind: MarkerKind;
}

export interface MapRoute {
  points: GeoPoint[];
  /** portion 0-1 already travelled (drawn solid), remainder dashed */
  progress?: number;
  color?: string;
}

const ICONS: Record<MarkerKind, { bg: string; ring: string; pulse: boolean; glyph: string }> = {
  origin: { bg: "#1d4ed8", ring: "#bfdbfe", pulse: false, glyph: "●" },
  destination: { bg: "#0b1a2e", ring: "#cbd5e1", pulse: false, glyph: "◆" },
  vehicle: { bg: "#d97706", ring: "#fcd34d", pulse: true, glyph: "▲" },
  load: { bg: "#16a34a", ring: "#bbf7d0", pulse: true, glyph: "■" },
};

function makeIcon(kind: MarkerKind) {
  const c = ICONS[kind];
  const pulse = c.pulse
    ? `<span style="position:absolute;inset:-6px;border-radius:9999px;background:${c.bg}33;animation:pulse-ring 1.6s ease-out infinite;"></span>`
    : "";
  return L.divIcon({
    className: "epl-div-icon",
    html: `<div style="position:relative;display:flex;align-items:center;justify-content:center;">
      ${pulse}
      <span style="position:relative;display:flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:9999px;background:${c.bg};color:#fff;font-size:10px;border:3px solid #fff;box-shadow:0 2px 6px rgba(11,26,46,.35);">${c.glyph}</span>
    </div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -12],
  });
}

function FitBounds({ points }: { points: GeoPoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 5);
      return;
    }
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
    map.fitBounds(bounds, { padding: [48, 48] });
  }, [map, points]);
  return null;
}

export function MapView({
  markers = [],
  routes = [],
  className,
  fit = true,
  zoom = 3,
}: {
  markers?: MapMarker[];
  routes?: MapRoute[];
  className?: string;
  fit?: boolean;
  zoom?: number;
}) {
  const allPoints = [
    ...markers.map((m) => m.point),
    ...routes.flatMap((r) => r.points),
  ];
  const center = allPoints[0] ?? { lat: 30, lng: 10 };

  return (
    <div className={className} style={{ overflow: "hidden", borderRadius: 12 }}>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={zoom}
        scrollWheelZoom={false}
        attributionControl={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />

        {routes.map((route, i) => {
          const split =
            route.progress != null
              ? Math.max(1, Math.floor(route.points.length * route.progress))
              : route.points.length;
          const done = route.points.slice(0, split + 1);
          const remaining = route.points.slice(split);
          const color = route.color ?? "#1d4ed8";
          return (
            <Fragment key={i}>
              {done.length > 1 && (
                <Polyline
                  positions={done.map((p) => [p.lat, p.lng])}
                  pathOptions={{ color, weight: 3, opacity: 0.9 }}
                />
              )}
              {remaining.length > 1 && (
                <Polyline
                  positions={remaining.map((p) => [p.lat, p.lng])}
                  pathOptions={{
                    color,
                    weight: 3,
                    opacity: 0.4,
                    dashArray: "2 8",
                  }}
                />
              )}
            </Fragment>
          );
        })}

        {markers.map((m, i) => (
          <Marker
            key={i}
            position={[m.point.lat, m.point.lng]}
            icon={makeIcon(m.kind)}
          >
            {(m.label || m.sublabel) && (
              <Popup>
                {m.label && (
                  <div className="font-semibold text-slate-900">{m.label}</div>
                )}
                {m.sublabel && (
                  <div className="text-slate-500">{m.sublabel}</div>
                )}
              </Popup>
            )}
          </Marker>
        ))}

        {fit && <FitBounds points={allPoints} />}
      </MapContainer>
    </div>
  );
}

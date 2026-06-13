/// <reference types="google.maps" />
import { useEffect, useRef } from "react";
import { useGoogleMap } from "./use-google-map";
import { REPORT_TYPES, SEVERITY_META, TIRANA_CENTER, type Report } from "@/lib/report-meta";

export function TiranaMap({
  reports,
  onPinClick,
  onClusterClick,
  userLocation,
  focus,
}: {
  reports: Report[];
  onPinClick: (r: Report) => void;
  onClusterClick: (rs: Report[]) => void;
  userLocation: { lat: number; lng: number } | null;
  focus?: { lat: number; lng: number; key?: string } | null;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { map, error } = useGoogleMap(ref, { center: TIRANA_CENTER, zoom: 13 });
  const markersRef = useRef<google.maps.OverlayView[]>([]);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);
  const idleListenerRef = useRef<google.maps.MapsEventListener | null>(null);

  useEffect(() => {
    if (!map || !focus) return;
    map.panTo({ lat: focus.lat, lng: focus.lng });
    map.setZoom(16);
  }, [map, focus?.lat, focus?.lng, focus?.key]);

  useEffect(() => {
    if (!map || !window.google) return;

    const rebuild = () => {
      markersRef.current.forEach((o) => o.setMap(null));
      markersRef.current = [];

      const proj = map.getProjection();
      if (!proj) return;
      const zoom = map.getZoom() ?? 13;
      const scale = Math.pow(2, zoom);
      const threshold = 44; // px clustering radius

      type Cluster = {
        lat: number;
        lng: number;
        reports: Report[];
        px: { x: number; y: number };
      };
      const clusters: Cluster[] = [];

      for (const r of reports) {
        const wp = proj.fromLatLngToPoint(new google.maps.LatLng(r.latitude, r.longitude));
        if (!wp) continue;
        const px = { x: wp.x * scale, y: wp.y * scale };
        let found: Cluster | null = null;
        for (const c of clusters) {
          const dx = c.px.x - px.x;
          const dy = c.px.y - px.y;
          if (dx * dx + dy * dy < threshold * threshold) {
            found = c;
            break;
          }
        }
        if (found) {
          found.reports.push(r);
        } else {
          clusters.push({ lat: r.latitude, lng: r.longitude, reports: [r], px });
        }
      }

      for (const c of clusters) {
        const overlay = createPinOverlay(c.lat, c.lng, c.reports, () => {
          if (c.reports.length === 1) onPinClick(c.reports[0]);
          else onClusterClick(c.reports);
        });
        overlay.setMap(map);
        markersRef.current.push(overlay);
      }
    };

    rebuild();
    if (idleListenerRef.current) google.maps.event.removeListener(idleListenerRef.current);
    idleListenerRef.current = map.addListener("idle", rebuild);
    return () => {
      if (idleListenerRef.current) {
        google.maps.event.removeListener(idleListenerRef.current);
        idleListenerRef.current = null;
      }
    };
  }, [map, reports, onPinClick, onClusterClick]);

  useEffect(() => {
    if (!map || !userLocation || !window.google) return;
    if (userMarkerRef.current) userMarkerRef.current.setMap(null);
    userMarkerRef.current = new google.maps.Marker({
      map,
      position: userLocation,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: "#1e88ff",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 3,
      },
    });
  }, [map, userLocation]);

  return (
    <>
      <div ref={ref} className="absolute inset-0" />
      {error && (
        <div className="absolute inset-0 grid place-items-center bg-background p-6 text-center">
          <p className="text-sm text-muted-foreground">Map failed to load: {error}</p>
        </div>
      )}
    </>
  );
}

// Severity → background color used as the "avatar" coin fill.
const SEVERITY_BG: Record<string, string> = {
  low: "#16a34a", // green
  serious: "#f59e0b", // amber
  critical: "#dc2626", // red
};

function highestSeverity(reports: Report[]): "low" | "serious" | "critical" {
  let max = 0;
  let out: "low" | "serious" | "critical" = "low";
  for (const r of reports) {
    const rank = SEVERITY_META[r.severity].rank;
    if (rank > max) {
      max = rank;
      out = r.severity;
    }
  }
  return out;
}

function createPinOverlay(
  lat: number,
  lng: number,
  reports: Report[],
  onClick: () => void,
): google.maps.OverlayView {
  const isCluster = reports.length > 1;
  const top = reports[0];
  const sev = highestSeverity(reports);
  const sevColor = SEVERITY_BG[sev];
  const type = REPORT_TYPES[top.type];

  class PinOverlay extends google.maps.OverlayView {
    div: HTMLDivElement | null = null;
    onAdd() {
      const div = document.createElement("div");
      div.style.position = "absolute";
      div.style.cursor = "pointer";
      div.style.willChange = "transform";

      const size = isCluster ? 30 : sev === "critical" ? 28 : sev === "serious" ? 24 : 22;
      const frame = Math.max(1.75, size * 0.09);
      const imgSize = size - frame * 2;
      const tipH = Math.round(size * 0.2);
      const totalH = size + tipH;
      const cx = size / 2;
      const tailY = totalH;
      const tailTop = size * 0.82;
      const path = `M ${cx} ${tailY} C ${cx - size * 0.06} ${tailY - size * 0.08}, ${cx - size * 0.28} ${tailTop + size * 0.1}, ${cx - size * 0.34} ${tailTop} L ${cx + size * 0.34} ${tailTop} C ${cx + size * 0.28} ${tailTop + size * 0.1}, ${cx + size * 0.06} ${tailY - size * 0.08}, ${cx} ${tailY} Z`;

      const pad = 5;
      div.style.transform = `translate(-${cx + pad}px, -${tailY + pad}px)`;

      // Center disc: photo or type initial (no severity fill — clean white coin).
      let center = "";
      if (top.image_url) {
        center = `<img src="${top.image_url}" alt="" loading="lazy" decoding="async"
                       style="position:absolute;left:${frame + pad}px;top:${frame + pad}px;
                              width:${imgSize}px;height:${imgSize}px;border-radius:9999px;
                              object-fit:cover;display:block;background:#111;" />`;
      } else {
        center = `<div style="position:absolute;left:${frame + pad}px;top:${frame + pad}px;
                     width:${imgSize}px;height:${imgSize}px;border-radius:9999px;
                     background:#111;display:grid;place-items:center;color:#fff;
                     font-family:Geist,Inter,sans-serif;font-weight:700;
                     font-size:${Math.round(imgSize * 0.46)}px;line-height:1;">${type.label.charAt(0)}</div>`;
      }

      // Top-right badge: cluster count OR severity rank, colored by severity level.
      const badgeText = isCluster ? String(reports.length) : String(SEVERITY_META[top.severity].rank);
      const badge = Math.round(size * (isCluster ? 0.48 : 0.4));
      const badgeFont = Math.round(badge * (isCluster && reports.length > 9 ? 0.5 : 0.62));
      const badgeEl = `
        <div style="position:absolute;
                    right:${pad - badge * 0.32}px;
                    top:${pad - badge * 0.28}px;
                    min-width:${badge}px;height:${badge}px;padding:0 ${Math.round(badge * 0.18)}px;
                    border-radius:9999px;
                    background:${sevColor};color:#fff;
                    display:grid;place-items:center;
                    font-family:Geist,Inter,sans-serif;font-weight:800;
                    font-size:${badgeFont}px;line-height:1;letter-spacing:-0.02em;
                    box-shadow:0 0 0 1.5px #fff, 0 1px 2px rgba(0,0,0,.25);">
          ${badgeText}
        </div>`;

      div.innerHTML = `
        <div style="position:relative;width:${size + pad * 2}px;height:${totalH + pad * 2}px;
                    filter:drop-shadow(0 6px 9px rgba(0,0,0,.24)) drop-shadow(0 1px 1px rgba(0,0,0,.18));">
          <svg width="${size}" height="${totalH}" viewBox="0 0 ${size} ${totalH}"
               style="position:absolute;left:${pad}px;top:${pad}px;display:block;">
            <path d="${path}" fill="#ffffff"/>
            <circle cx="${cx}" cy="${cx}" r="${cx}" fill="#ffffff"/>
          </svg>
          ${center}
          ${badgeEl}
        </div>
      `;
      div.title = isCluster
        ? `${reports.length} reports nearby`
        : `${type.label} · ${SEVERITY_META[top.severity].label}: ${top.title}`;
      div.addEventListener("click", (e) => {
        e.stopPropagation();
        onClick();
      });
      this.div = div;
      const panes = this.getPanes();
      panes?.overlayMouseTarget.appendChild(div);
    }
    draw() {
      if (!this.div) return;
      const proj = this.getProjection();
      if (!proj) return;
      const pos = proj.fromLatLngToDivPixel(new google.maps.LatLng(lat, lng));
      if (!pos) return;
      this.div.style.left = `${pos.x}px`;
      this.div.style.top = `${pos.y}px`;
    }
    onRemove() {
      this.div?.parentNode?.removeChild(this.div);
      this.div = null;
    }
  }
  return new PinOverlay();
}

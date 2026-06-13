import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { ReportType, Severity } from "./report-meta";

type Seed = { title: string; type: ReportType; severity: Severity; description: string; latitude: number; longitude: number; address: string; image_url: string };

const MOCK: Seed[] = [
  { title: "Fender bender near Blloku", type: "traffic_accident", severity: "serious", description: "Two cars blocking the right lane on Rruga Ismail Qemali.", latitude: 41.3203, longitude: 19.8187, address: "Blloku, Tirana", image_url: "https://images.unsplash.com/photo-1599043513900-ed6fe01d3833?w=800&q=80" },
  { title: "Protest at Skanderbeg Square", type: "protest", severity: "serious", description: "Large gathering, expect closures.", latitude: 41.3281, longitude: 19.8189, address: "Sheshi Skënderbej", image_url: "https://images.unsplash.com/photo-1591189824344-3d2f1e6f1f2c?w=800&q=80" },
  { title: "Heavy traffic toward TEG", type: "heavy_traffic", severity: "low", description: "Stop-and-go for ~3km on Rruga Elbasanit.", latitude: 41.2913, longitude: 19.8511, address: "Rruga Elbasanit", image_url: "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&q=80" },
  { title: "Road closed for repairs", type: "road_block", severity: "serious", description: "Bulevardi Zogu I closed until evening.", latitude: 41.3343, longitude: 19.8200, address: "Bulevardi Zogu I", image_url: "https://images.unsplash.com/photo-1583912267550-d49d6e7ff7e6?w=800&q=80" },
  { title: "Critical: building fire", type: "fire", severity: "critical", description: "Active fire response near Pazari i Ri. Avoid the area.", latitude: 41.3289, longitude: 19.8246, address: "Pazari i Ri", image_url: "https://images.unsplash.com/photo-1486915309851-b0cc1f8a0084?w=800&q=80" },
  { title: "Pothole damaging cars", type: "broken_road", severity: "low", description: "Deep pothole on the right turn.", latitude: 41.3128, longitude: 19.8014, address: "Kombinat", image_url: "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=800&q=80" },
  { title: "Police checkpoint", type: "police_activity", severity: "low", description: "Routine document checks.", latitude: 41.3422, longitude: 19.8123, address: "Don Bosko", image_url: "https://images.unsplash.com/photo-1453873531674-2151bcd01707?w=800&q=80" },
  { title: "Flooded underpass", type: "flood", severity: "critical", description: "Underpass impassable after the storm.", latitude: 41.3360, longitude: 19.8290, address: "21 Dhjetori", image_url: "https://images.unsplash.com/photo-1547683905-f686c993aae5?w=800&q=80" },
  { title: "Construction lane closure", type: "construction", severity: "low", description: "Right lane closed for cable work.", latitude: 41.3247, longitude: 19.8073, address: "Rruga e Kavajës", image_url: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800&q=80" },
  { title: "Dangerous intersection", type: "dangerous_area", severity: "serious", description: "Visibility blocked by parked trucks.", latitude: 41.3145, longitude: 19.8260, address: "Astir", image_url: "https://images.unsplash.com/photo-1494522855154-9297ac14b55f?w=800&q=80" },
  { title: "Tram of cars near university", type: "heavy_traffic", severity: "low", description: "Slow morning rush near Mother Teresa Sq.", latitude: 41.3173, longitude: 19.8146, address: "Sheshi Nënë Tereza", image_url: "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&q=80" },
  { title: "Critical accident on ring road", type: "traffic_accident", severity: "critical", description: "Multiple vehicles, ambulance on site.", latitude: 41.3445, longitude: 19.8347, address: "Unaza e Re", image_url: "https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?w=800&q=80" },
  { title: "Tree fallen on sidewalk", type: "other", severity: "low", description: "Blocking pedestrian path.", latitude: 41.3215, longitude: 19.8231, address: "Parku Rinia", image_url: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&q=80" },
  { title: "Suspicious package reported", type: "dangerous_area", severity: "critical", description: "Police responding, area cordoned.", latitude: 41.3299, longitude: 19.8155, address: "Rruga Dëshmorët e Kombit", image_url: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&q=80" },
  { title: "Road work overnight", type: "construction", severity: "low", description: "Lane reductions 22:00–05:00.", latitude: 41.3050, longitude: 19.8195, address: "Lana riverside", image_url: "https://images.unsplash.com/photo-1581094488379-6c0ed2b80a8d?w=800&q=80" },
];

export const ensureSeed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { count } = await context.supabase
      .from("reports")
      .select("id", { count: "exact", head: true });
    if ((count ?? 0) > 0) return { seeded: false, count };
    const now = Date.now();
    const rows = MOCK.map((m, i) => ({
      ...m,
      created_by: context.userId,
      created_at: new Date(now - i * 1000 * 60 * 17).toISOString(),
    }));
    const { error } = await context.supabase.from("reports").insert(rows);
    if (error) throw new Error(error.message);
    return { seeded: true, count: rows.length };
  });

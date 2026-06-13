import { create } from "zustand";

import { fetchCityData, fetchProfile } from "@/services/city";
import { supabase } from "@/lib/supabase";
import { demoReports } from "@/data/demoReports";
import type { LiveEvent, Profile, Report } from "@/types/domain";

type CityStore = {
  reports: Report[];
  events: LiveEvent[];
  profile: Profile | null;
  isLoading: boolean;
  error: string | null;
  hydrate: (userId?: string | null) => Promise<void>;
  subscribe: (userId?: string | null) => () => void;
  reset: () => void;
};

export const useCityStore = create<CityStore>((set, get) => ({
  reports: [],
  events: [],
  profile: null,
  isLoading: false,
  error: null,
  hydrate: async (userId) => {
    set({ isLoading: true, error: null });
    try {
      const [{ combined, events }, profile] = await Promise.all([
        fetchCityData(),
        userId ? fetchProfile(userId) : Promise.resolve(null),
      ]);
      const existingIds = new Set(combined.map((report) => report.id));
      const demos = demoReports.filter((report) => !existingIds.has(report.id));
      set({ reports: combined.length >= 12 ? combined : [...combined, ...demos], events, profile, isLoading: false });
    } catch (error) {
      set({ reports: demoReports, isLoading: false, error: error instanceof Error ? error.message : "Could not load TiranaFlow." });
    }
  },
  subscribe: (userId) => {
    if (!supabase) return () => undefined;
    const client = supabase;
    const refresh = () => { void get().hydrate(userId); };
    const channel = client.channel("tiranaflow-mobile")
      .on("postgres_changes", { event: "*", schema: "public", table: "reports" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, refresh)
      .subscribe();
    return () => { void client.removeChannel(channel); };
  },
  reset: () => set({ reports: [], events: [], profile: null, isLoading: false, error: null }),
}));

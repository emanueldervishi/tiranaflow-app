import { createFileRoute, Outlet, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/bottom-nav";
import { useServerFn } from "@tanstack/react-start";
import { ensureSeed } from "@/lib/seed.functions";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      const { redirect } = await import("@tanstack/react-router");
      throw redirect({ to: "/auth" });
    }
    return { user: data.user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const router = useRouter();
  const seed = useServerFn(ensureSeed);

  useEffect(() => {
    seed({}).catch(() => {});
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") router.invalidate();
    });
    return () => data.subscription.unsubscribe();
  }, [router, seed]);

  return (
    <div className="relative min-h-screen bg-background pb-24">
      <Outlet />
      <BottomNav />
    </div>
  );
}

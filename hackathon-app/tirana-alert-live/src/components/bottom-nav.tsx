import { Link, useRouterState } from "@tanstack/react-router";
import { Compass, ListOrdered, MessageCircle, Plus, User } from "lucide-react";

const left = [
  { to: "/map", label: "Map", icon: Compass },
  { to: "/feed", label: "Feed", icon: ListOrdered },
] as const;

const right = [
  { to: "/assistant", label: "Ask AI", icon: MessageCircle },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="pointer-events-none fixed bottom-0 left-0 right-0 z-40 safe-bottom">
      <div className="pointer-events-auto relative mx-auto mb-4 max-w-[360px] px-4">
        {/* Raised FAB */}
        <Link
          to="/report"
          aria-label="Create report"
          style={{
            background: "var(--color-glass)",
            borderColor: "var(--color-glass-border)",
            backdropFilter: "blur(30px) saturate(190%)",
            boxShadow: "inset 0 1px 0 oklch(1 0 0 / 0.28)",
          }}
          className="absolute left-1/2 -top-6 z-50 grid h-14 w-14 -translate-x-1/2 place-items-center rounded-full border text-foreground ring-[3px] ring-background transition-transform duration-200 hover:scale-105 active:scale-95"
        >
          {/* Glass border overlay — only the portion above the navbar's top edge */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full border"
            style={{
              borderColor: "var(--color-glass-border)",
              clipPath: "inset(0 0 56% 0)",
              boxShadow: "inset 0 1px 0 oklch(1 0 0 / 0.3)",
            }}
          />
          <Plus className="h-6 w-6" strokeWidth={2.4} />
        </Link>

        <div
          className="flex items-center justify-between rounded-full border px-2 py-1.5"
          style={{
            background: "var(--color-glass)",
            borderColor: "var(--color-glass-border)",
            backdropFilter: "blur(36px) saturate(200%)",
            boxShadow:
              "inset 0 1px 0 oklch(1 0 0 / 0.28), inset 0 -1px 0 oklch(0 0 0 / 0.04)",
          }}
        >
          <div className="flex flex-1 justify-around">
            {left.map((it) => (
              <NavBtn key={it.to} item={it} active={pathname === it.to} />
            ))}
          </div>
          <div className="w-12 shrink-0" aria-hidden />
          <div className="flex flex-1 justify-around">
            {right.map((it) => (
              <NavBtn key={it.to} item={it} active={pathname === it.to} />
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}

function NavBtn({ item, active }: { item: { to: string; label: string; icon: typeof Compass }; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      className={`flex w-[48px] flex-col items-center gap-0.5 rounded-full py-1 transition ${
        active ? "text-foreground" : "text-muted-foreground"
      }`}
    >
      <Icon className="h-[16px] w-[16px]" strokeWidth={active ? 2.4 : 1.8} />
      <span className="text-[8px] font-semibold uppercase tracking-[0.14em]">{item.label}</span>
    </Link>
  );
}

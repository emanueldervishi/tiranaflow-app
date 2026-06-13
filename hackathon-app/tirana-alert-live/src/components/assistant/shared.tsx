import { motion } from "motion/react";

export type Suggestion = { icon: string; label: string };

interface Props {
  items: Suggestion[];
  onPick: (q: string) => void;
  dense?: boolean;
}

export function AssistantSuggestions({ items, onPick, dense }: Props) {
  return (
    <div className={dense ? "grid gap-1.5" : "grid gap-2"}>
      {items.map((s, i) => (
        <motion.button
          key={s.label}
          onClick={() => onPick(s.label)}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: i * 0.04 }}
          whileTap={{ scale: 0.98 }}
          className={`group relative flex items-center gap-3 overflow-hidden rounded-2xl border border-border bg-muted text-left text-foreground transition-all duration-150 hover:border-border hover:shadow-[0_0_24px_-6px_rgba(124,92,255,0.4)] active:translate-y-px ${
            dense ? "px-3 py-2 text-[13px]" : "px-4 py-3 text-[15px]"
          }`}
        >
          {/* Gradient left edge */}
          <span
            aria-hidden
            className="tirana-gradient absolute inset-y-2 left-0 w-[3px] rounded-full opacity-80"
          />
          <span className={dense ? "text-base leading-none" : "text-lg leading-none"}>{s.icon}</span>
          <span className="flex-1 font-medium">{s.label}</span>
        </motion.button>
      ))}
    </div>
  );
}

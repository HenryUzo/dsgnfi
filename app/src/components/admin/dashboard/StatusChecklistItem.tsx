import { Link } from "react-router-dom";

import type { DashboardReadinessItem, DashboardReadinessState } from "../../../services/adminDashboard";

type StatusChecklistItemProps = {
  item: DashboardReadinessItem;
};

function stateMeta(state: DashboardReadinessState) {
  switch (state) {
    case "complete":
      return {
        badge: "border-emerald-400/30 bg-emerald-400/10 text-emerald-100",
        icon: "border-emerald-400/25 bg-emerald-400/18 text-emerald-100",
        glyph: "C",
        label: "Complete",
      };
    case "blocked":
      return {
        badge: "border-rose-300/30 bg-rose-400/10 text-rose-100",
        icon: "border-rose-300/25 bg-rose-400/12 text-rose-100",
        glyph: "X",
        label: "Blocked",
      };
    case "warning":
      return {
        badge: "border-amber-300/30 bg-amber-300/10 text-amber-100",
        icon: "border-amber-300/25 bg-amber-300/12 text-amber-100",
        glyph: "!",
        label: "Warning",
      };
    default:
      return {
        badge: "border-white/12 bg-white/[0.04] text-white/70",
        icon: "border-white/12 bg-white/[0.06] text-white/80",
        glyph: "-",
        label: "Needs action",
      };
  }
}

export function StatusChecklistItem({ item }: StatusChecklistItemProps) {
  const meta = stateMeta(item.state);

  return (
    <div className="flex items-start gap-4 rounded-[1.6rem] bg-black/28 px-4 py-4">
      <span
        className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${meta.icon}`}
      >
        {meta.glyph}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-white">{item.label}</p>
          <span
            className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] ${meta.badge}`}
          >
            {meta.label}
          </span>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-white/68">{item.helper}</p>
        {item.action ? (
          <Link
            to={item.action.to}
            className="mt-3 inline-flex items-center text-xs uppercase tracking-[0.22em] text-white/78 transition hover:text-white"
          >
            {item.action.label}
          </Link>
        ) : null}
      </div>
    </div>
  );
}

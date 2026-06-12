import { Link } from "react-router-dom";

type SidebarNavSectionItem = {
  label: string;
  to: string;
  active: boolean;
};

type SidebarNavSectionProps = {
  label: string;
  items: SidebarNavSectionItem[];
  compact?: boolean;
};

export function SidebarNavSection({
  label,
  items,
  compact = false,
}: SidebarNavSectionProps) {
  return (
    <div className={compact ? "space-y-1.5" : "space-y-2"}>
      <p className="px-2 text-[10px] uppercase tracking-[0.24em] text-white/52">{label}</p>
      <div className="space-y-1">
        {items.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={`flex items-center justify-between rounded-2xl transition ${
              compact ? "px-3 py-2.5 text-xs" : "px-4 py-3 text-sm"
            } ${
              item.active
                ? "bg-white text-black"
                : "text-white/65 hover:bg-white/[0.06] hover:text-white"
            }`}
          >
            <span className="truncate">{item.label}</span>
            {!compact && item.active ? (
              <span className="text-[10px] uppercase tracking-[0.18em]">Open</span>
            ) : null}
          </Link>
        ))}
      </div>
    </div>
  );
}

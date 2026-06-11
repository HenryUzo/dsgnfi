type WorkAdminTab = "page" | "tags" | "projects";

type WorkTabsProps = {
  activeTab: WorkAdminTab;
  onChange: (tab: WorkAdminTab) => void;
};

const tabItems: Array<{ id: WorkAdminTab; label: string }> = [
  { id: "page", label: "Page" },
  { id: "tags", label: "Tags" },
  { id: "projects", label: "Projects" },
];

export function WorkTabs({ activeTab, onChange }: WorkTabsProps) {
  return (
    <div className="inline-flex rounded-full border border-white/15 bg-white/5 p-1">
      {tabItems.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`rounded-full px-4 py-2 text-xs uppercase tracking-widest transition-colors ${
            activeTab === tab.id
              ? "bg-white text-black"
              : "text-white/70 hover:text-white"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export type { WorkAdminTab };

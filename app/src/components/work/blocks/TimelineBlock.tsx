import { readObjectArray, readString } from "./blockUtils";

type TimelineItem = {
  year?: string;
  title?: string;
  description?: string;
};

type TimelineBlockProps = {
  data: Record<string, unknown>;
  variant?: string;
  showFrame?: boolean;
  flushX?: boolean;
};

export function TimelineBlock({
  data,
  variant,
  showFrame = true,
  flushX = false,
}: TimelineBlockProps) {
  const title = readString(data.title, "Timeline");
  const items = readObjectArray<TimelineItem>(data.items);
  const isProcess = variant === "process";

  if (isProcess) {
    return (
      <section className="relative">
        <h3 className="font-serif text-3xl text-white md:text-4xl">{title}</h3>
        <div className="mt-10 grid gap-12 md:grid-cols-2">
          {items.length === 0 ? (
            <p className="text-sm text-white/60">No timeline items configured.</p>
          ) : (
            items.map((item, index) => (
              <div key={`${item.year}-${item.title}-${index}`} className="space-y-4">
                <div className="flex items-center gap-4">
                  <span className="text-xs uppercase tracking-[0.3em] text-white/50">
                    {readString(item.year, "Stage")}
                  </span>
                  <span className="h-px flex-1 bg-white/10" />
                </div>
                <h4 className="font-serif text-2xl text-white md:text-3xl">
                  {readString(item.title, "Title")}
                </h4>
                <p className="text-white/70">{readString(item.description, "")}</p>
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/40">
                  <span>Deliverables</span>
                  <span className="text-lg leading-none">+</span>
                </div>
                <div className="h-px bg-white/10" />
              </div>
            ))
          )}
        </div>
      </section>
    );
  }

  return (
    <section
      className={`rounded-2xl bg-black/30 ${
        showFrame ? "border border-white/10" : ""
      } ${flushX ? "py-8 px-0" : "p-8"}`}
    >
      <h3 className="font-serif text-3xl text-white md:text-4xl">{title}</h3>
      <div className="mt-6 space-y-4 border-l border-white/20 pl-6">
        {items.length === 0 ? (
          <p className="text-sm text-white/60">No timeline items configured.</p>
        ) : (
          items.map((item, index) => (
            <div key={`${item.year}-${item.title}-${index}`} className="relative">
              <span className="absolute -left-[1.9rem] top-1 h-3 w-3 rounded-full bg-[var(--brand)]" />
              <p className="text-xs uppercase tracking-[0.25em] text-white/50">
                {readString(item.year, "Stage")}
              </p>
              <p className="mt-1 text-lg font-medium text-white">{readString(item.title, "Title")}</p>
              <p className="mt-1 text-white/70">{readString(item.description, "")}</p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

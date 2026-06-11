import { readObjectArray, readString } from "./blockUtils";

type MetricItem = {
  label?: string;
  value?: string;
};

type MetricsBlockProps = {
  data: Record<string, unknown>;
  showFrame?: boolean;
  flushX?: boolean;
};

export function MetricsBlock({
  data,
  showFrame = true,
  flushX = false,
}: MetricsBlockProps) {
  const title = readString(data.title, "Metrics");
  const items = readObjectArray<MetricItem>(data.items);

  return (
    <section
      className={`rounded-2xl bg-black/30 ${
        showFrame ? "border border-white/10" : ""
      } ${flushX ? "py-8 px-0" : "p-8"}`}
    >
      <h3 className="font-serif text-3xl text-white md:text-4xl">{title}</h3>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {items.length === 0 ? (
          <p className="text-sm text-white/60">No metrics configured.</p>
        ) : (
          items.map((item, index) => (
            <div key={`${item.label}-${index}`} className="rounded-xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-white/50">
                {readString(item.label, "Metric")}
              </p>
              <p className="mt-2 text-3xl font-semibold text-white">
                {readString(item.value, "0")}
              </p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

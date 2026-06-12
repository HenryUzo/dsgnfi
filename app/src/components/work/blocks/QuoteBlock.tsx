import { readString } from "./blockUtils";

type QuoteBlockProps = {
  data: Record<string, unknown>;
  showFrame?: boolean;
  flushX?: boolean;
};

export function QuoteBlock({
  data,
  showFrame = true,
  flushX = false,
}: QuoteBlockProps) {
  const quote = readString(data.quote, "Insert quote");
  const author = readString(data.author, "Author");
  const role = readString(data.role);

  return (
    <section
      className={`rounded-2xl bg-gradient-to-br from-white/10 to-white/5 ${
        showFrame ? "border border-white/10" : ""
      } ${flushX ? "py-8 px-0 md:py-10 md:px-0" : "p-8 md:p-10"}`}
    >
      <p className="font-serif text-3xl leading-relaxed text-white md:text-4xl">“{quote}”</p>
      <div className="mt-6">
        <p className="text-sm font-medium uppercase tracking-[0.25em] text-white">{author}</p>
        {role ? <p className="mt-1 text-sm text-white/60">{role}</p> : null}
      </div>
    </section>
  );
}

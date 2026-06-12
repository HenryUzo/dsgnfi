import { readString } from "./blockUtils";

type RichTextBlockProps = {
  data: Record<string, unknown>;
  variant?: string;
  showFrame?: boolean;
  flushX?: boolean;
};

export function RichTextBlock({
  data,
  variant,
  showFrame = true,
  flushX = false,
}: RichTextBlockProps) {
  const eyebrow = readString(data.eyebrow);
  const title = readString(data.title, "Section Title");
  const body = readString(data.body, "Section body text");
  const isSticky = variant === "sticky";
  const isProcess = variant === "process";

  return (
    <section
      className={`${
        isProcess
          ? "bg-transparent p-0"
          : `rounded-2xl bg-black/40 ${showFrame ? "border border-white/10" : ""} ${
              flushX ? "py-8 px-0 md:py-10 md:px-0" : "p-8 md:p-10"
            }`
      } ${isSticky ? "lg:sticky lg:top-24" : ""}`}
    >
      {eyebrow ? (
        <p className="text-xs uppercase tracking-[0.3em] text-white/50">{eyebrow}</p>
      ) : null}
      <h3
        className={`font-serif text-white ${
          isProcess ? "mt-3 text-2xl md:text-3xl" : "text-3xl md:text-4xl"
        }`}
      >
        {title}
      </h3>
      <p className="mt-4 whitespace-pre-wrap leading-relaxed text-white/75">{body}</p>
    </section>
  );
}

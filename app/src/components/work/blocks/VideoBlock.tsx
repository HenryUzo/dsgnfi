import { readString } from "./blockUtils";

type VideoBlockProps = {
  data: Record<string, unknown>;
  showFrame?: boolean;
  flushX?: boolean;
};

export function VideoBlock({
  data,
  showFrame = true,
  flushX = false,
}: VideoBlockProps) {
  const url = readString(data.url);
  const title = readString(data.title, "Video");
  const caption = readString(data.caption);

  return (
    <section
      className={`overflow-hidden rounded-2xl bg-black/40 ${
        showFrame ? "border border-white/10" : ""
      }`}
    >
      <div className={`border-b border-white/10 py-4 ${flushX ? "px-0" : "px-5"}`}>
        <h3 className="font-serif text-2xl text-white">{title}</h3>
      </div>
      {url ? (
        <video src={url} controls className="w-full bg-black" />
      ) : (
        <div className="flex h-64 items-center justify-center text-sm uppercase tracking-[0.25em] text-white/40">
          No video URL
        </div>
      )}
      {caption ? (
        <p className={`py-4 text-sm text-white/60 ${flushX ? "px-0" : "px-5"}`}>
          {caption}
        </p>
      ) : null}
    </section>
  );
}

import { readString } from "./blockUtils";

type ImageBlockProps = {
  data: Record<string, unknown>;
  showFrame?: boolean;
  flushX?: boolean;
};

export function ImageBlock({
  data,
  showFrame = true,
  flushX = false,
}: ImageBlockProps) {
  const url = readString(data.url);
  const caption = readString(data.caption);

  return (
    <figure
      className={`overflow-hidden rounded-2xl bg-black/40 ${
        showFrame ? "border border-white/10" : ""
      }`}
    >
      {url ? (
        <img src={url} alt={caption || "Project image"} className="h-auto w-full object-cover" />
      ) : (
        <div className="flex h-56 items-center justify-center text-sm uppercase tracking-[0.25em] text-white/40">
          No Image URL
        </div>
      )}
      {caption ? (
        <figcaption
          className={`py-4 text-sm text-white/60 ${flushX ? "px-0" : "px-5"}`}
        >
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

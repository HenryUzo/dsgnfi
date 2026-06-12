import { readString, readStringArray } from "./blockUtils";

type GalleryBlockProps = {
  data: Record<string, unknown>;
  variant?: string;
  showFrame?: boolean;
  flushX?: boolean;
};

export function GalleryBlock({
  data,
  variant,
  showFrame = true,
  flushX = false,
}: GalleryBlockProps) {
  const images = readStringArray(data.images);
  const caption = readString(data.caption);
  const isProcess = variant === "process";
  const columnsClass =
    variant === "mosaic"
      ? "sm:grid-cols-2 lg:grid-cols-4"
      : "sm:grid-cols-2 lg:grid-cols-3";

  if (isProcess) {
    return (
      <section className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          {images.length === 0 ? (
            <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-white/20 text-sm uppercase tracking-[0.25em] text-white/40 md:col-span-3">
              No gallery images
            </div>
          ) : (
            images.map((url, index) => {
              const isPrimary = index === 0;
              return (
                <div
                  key={`${url}-${index}`}
                  className={`overflow-hidden rounded-2xl border border-white/10 bg-black/30 ${
                    isPrimary ? "md:col-span-2 md:row-span-2" : ""
                  }`}
                >
                  {url ? (
                    <img
                      src={url}
                      alt={`Gallery ${index + 1}`}
                      className={`w-full object-cover ${isPrimary ? "h-full min-h-[320px]" : "h-52"}`}
                    />
                  ) : (
                    <div className="flex h-52 items-center justify-center text-xs uppercase tracking-[0.25em] text-white/40">
                      Missing URL
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
        {caption ? <p className="text-sm text-white/60">{caption}</p> : null}
      </section>
    );
  }

  return (
    <section
      className={`rounded-2xl bg-black/30 ${
        showFrame ? "border border-white/10" : ""
      } ${flushX ? "py-4 px-0" : "p-4"}`}
    >
      <div className={`grid grid-cols-1 gap-3 ${columnsClass}`}>
        {images.length === 0 ? (
          <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-white/20 text-sm uppercase tracking-[0.25em] text-white/40">
            No gallery images
          </div>
        ) : (
          images.map((url, index) => (
            <div key={`${url}-${index}`} className="overflow-hidden rounded-xl border border-white/10 bg-black/30">
              {url ? (
                <img
                  src={url}
                  alt={`Gallery ${index + 1}`}
                  className="h-52 w-full object-cover"
                />
              ) : (
                <div className="flex h-52 items-center justify-center text-xs uppercase tracking-[0.25em] text-white/40">
                  Missing URL
                </div>
              )}
            </div>
          ))
        )}
      </div>
      {caption ? (
        <p className="mt-4 text-sm text-white/60">{caption}</p>
      ) : null}
    </section>
  );
}

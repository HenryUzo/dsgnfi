import { readObjectArray, readString } from "./blockUtils";

type Slide = {
  title?: string;
  mainImageUrl?: string;
  peekImageUrl?: string;
};

type ProcessMediaPeekCarouselBlockProps = {
  data: Record<string, unknown>;
};

export function ProcessMediaPeekCarouselBlock({ data }: ProcessMediaPeekCarouselBlockProps) {
  const heading = readString(data.heading, "Introducing Brand Seasoning");
  const description = readString(data.description);
  const slides = readObjectArray<Slide>(data.slides);
  const showCounter = Boolean(data.showCounter ?? true);

  const mainSlide = slides[0];
  const peekSlide = slides[1] ?? slides[0];

  return (
    <section className="bg-black px-6 py-16 md:px-12 md:py-20">
      <div className="mx-auto w-full max-w-6xl">
        <h2 className="font-serif text-4xl text-white md:text-5xl">{heading}</h2>
        {description ? (
          <p className="mt-4 max-w-3xl leading-relaxed text-white/60">{description}</p>
        ) : null}

        <div className="mt-10 grid gap-6 md:grid-cols-[2fr_1fr]">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5">
            {mainSlide?.mainImageUrl ? (
              <img
                src={mainSlide.mainImageUrl}
                alt={readString(mainSlide.title, "Slide")}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-64 items-center justify-center text-xs uppercase tracking-[0.3em] text-white/40">
                Main media
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/40 bg-black/50">
                <span className="ml-1 h-0 w-0 border-y-[7px] border-l-[12px] border-y-transparent border-l-white/80" />
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5">
            {peekSlide?.peekImageUrl || peekSlide?.mainImageUrl ? (
              <img
                src={peekSlide.peekImageUrl || peekSlide.mainImageUrl || ""}
                alt={readString(peekSlide.title, "Next slide")}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-64 items-center justify-center text-xs uppercase tracking-[0.3em] text-white/40">
                Peek media
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/40 bg-black/50">
                <span className="ml-1 h-0 w-0 border-y-[6px] border-l-[10px] border-y-transparent border-l-white/80" />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/40">
          <span>{readString(mainSlide?.title, "Brand Framework")}</span>
          {showCounter ? (
            <span>
              1/{slides.length > 0 ? slides.length : 1}
            </span>
          ) : null}
        </div>
      </div>
    </section>
  );
}

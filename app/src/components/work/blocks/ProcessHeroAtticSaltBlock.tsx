import { readString } from "./blockUtils";

type ProcessHeroAtticSaltBlockProps = {
  data: Record<string, unknown>;
};

export function ProcessHeroAtticSaltBlock({ data }: ProcessHeroAtticSaltBlockProps) {
  const title = readString(data.title, "Don't be the side show,\nwhen you can be the star.");
  const collageImageUrl = readString(data.collageImageUrl);
  const collageAlt = readString(data.collageAlt, "Process collage");

  return (
    <section className="relative min-h-[95vh] bg-black px-6 pt-28 pb-16 md:px-12 md:pt-32 md:pb-20">
      <div className="mx-auto w-full max-w-6xl">
        <h1 className="max-w-3xl whitespace-pre-line font-serif text-5xl leading-tight text-white md:text-7xl">
          {title}
        </h1>

        {collageImageUrl ? (
          <div className="mt-16 flex justify-center">
            <img
              src={collageImageUrl}
              alt={collageAlt}
              className="w-full max-w-3xl object-contain"
            />
          </div>
        ) : (
          <div className="mt-16 flex h-60 items-center justify-center rounded-3xl border border-dashed border-white/10 text-xs uppercase tracking-[0.3em] text-white/40">
            Collage image
          </div>
        )}
      </div>
    </section>
  );
}

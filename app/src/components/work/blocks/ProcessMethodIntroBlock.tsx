import { readString, readStringArray } from "./blockUtils";

type ProcessMethodIntroBlockProps = {
  data: Record<string, unknown>;
};

export function ProcessMethodIntroBlock({ data }: ProcessMethodIntroBlockProps) {
  const kicker = readString(data.kicker, "OUR APPROACH TO BRAND BUILDING");
  const paragraphs = readStringArray(data.paragraphs);

  return (
    <section className="bg-black px-6 py-12 md:px-12 md:py-16">
      <div className="mx-auto w-full max-w-6xl">
        <p className="text-xs uppercase tracking-[0.3em] text-white/40">{kicker}</p>
        <div className="mt-6 max-w-3xl space-y-6">
          {paragraphs.length === 0 ? (
            <p className="text-sm text-white/50">Add intro paragraphs.</p>
          ) : (
            paragraphs.map((paragraph, index) => (
              <p
                key={`${index}-${paragraph.slice(0, 12)}`}
                className={`leading-relaxed ${
                  index === 0 ? "text-white/80" : "text-white/60"
                }`}
              >
                {paragraph}
              </p>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

import { readString } from "./blockUtils";

type HeroBlockProps = {
  data: Record<string, unknown>;
  variant?: string;
  showFrame?: boolean;
  flushX?: boolean;
  fullBleed?: boolean;
};

export function HeroBlock({
  data,
  variant,
  showFrame = true,
  flushX = false,
  fullBleed = false,
}: HeroBlockProps) {
  const eyebrow = readString(data.eyebrow);
  const headline = readString(data.headline, "Project headline");
  const subheadline = readString(data.subheadline);
  const backgroundImage = readString(data.backgroundImage);
  const isSplit = variant === "split";
  const isProcess = variant === "process";
  const heroImage = readString(data.heroImage) || backgroundImage;

  return (
    <section
      className={`relative overflow-hidden bg-black ${
        fullBleed ? "rounded-none" : "rounded-2xl"
      } ${showFrame ? "border border-white/10" : ""} ${
        isSplit
          ? "p-0"
          : fullBleed
            ? isProcess
              ? "min-h-[95vh] px-6 pt-24 pb-16 md:px-12 md:pt-28 md:pb-20"
              : "min-h-[95vh] px-6 py-16 md:px-12 md:py-20"
            : flushX
              ? "py-10 px-0 md:py-14 md:px-0"
              : "p-10 md:p-14"
      } ${
        fullBleed && !isSplit
          ? isProcess
            ? "flex items-start"
            : "flex items-end"
          : ""
      }`}
      style={
        !isSplit && backgroundImage && !isProcess
          ? {
              backgroundImage: `linear-gradient(rgba(0,0,0,.55), rgba(0,0,0,.65)), url(${backgroundImage})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : undefined
      }
    >
      {isSplit ? (
        <div className="grid min-h-[360px] gap-0 md:grid-cols-2">
          <div
            className={`flex flex-col justify-center ${
              fullBleed
                ? "min-h-[60vh] py-16 px-6 md:py-16 md:px-12"
                : flushX
                  ? "py-10 px-0 md:py-14 md:px-0"
                  : "p-10 md:p-14"
            }`}
          >
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">{eyebrow}</p>
            <h2 className="mt-4 font-serif text-4xl leading-tight text-white md:text-5xl">
              {headline}
            </h2>
            {subheadline ? (
              <p className="mt-5 max-w-xl text-white/70">{subheadline}</p>
            ) : null}
          </div>
          <div
            className="min-h-[220px] bg-white/5"
            style={
              backgroundImage
                ? { backgroundImage: `url(${backgroundImage})`, backgroundSize: "cover", backgroundPosition: "center" }
                : undefined
            }
          />
        </div>
      ) : (
        <div className="relative z-10 w-full">
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">{eyebrow}</p>
          <h2
            className={`mt-4 max-w-4xl font-serif leading-tight text-white ${
              fullBleed || isProcess ? "text-5xl md:text-7xl" : "text-4xl md:text-6xl"
            }`}
          >
            {headline}
          </h2>
          {subheadline ? (
            <p className="mt-5 max-w-2xl text-white/70">{subheadline}</p>
          ) : null}

          {isProcess && heroImage ? (
            <div className="mt-12 w-full max-w-4xl">
              <img
                src={heroImage}
                alt=""
                className="w-full object-contain drop-shadow-[0_20px_80px_rgba(0,0,0,0.75)]"
              />
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}

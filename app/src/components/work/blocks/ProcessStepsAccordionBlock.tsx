import { useState } from "react";
import { Minus, Plus } from "lucide-react";

import { readObjectArray, readString, readStringArray } from "./blockUtils";

type StepItem = {
  number?: string;
  title?: string;
  description?: string;
  deliverables?: string[];
};

type ProcessStepsAccordionBlockProps = {
  data: Record<string, unknown>;
};

export function ProcessStepsAccordionBlock({ data }: ProcessStepsAccordionBlockProps) {
  const heading = readString(data.heading, "The method to our mastery");
  const steps = readObjectArray<StepItem>(data.steps);
  const [openIndices, setOpenIndices] = useState<Record<number, boolean>>({});

  return (
    <section className="relative bg-black px-6 py-16 md:px-12 md:py-20">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-24 h-[360px] w-[360px] rounded-full bg-[radial-gradient(circle_at_20%_60%,rgba(20,80,255,0.55),transparent_55%)] blur-[120px]" />
        <div className="absolute right-[-140px] bottom-0 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle_at_60%_80%,rgba(20,80,255,0.25),transparent_60%)] blur-[140px]" />
      </div>

      <div className="relative mx-auto w-full max-w-6xl">
        <h2 className="font-serif text-4xl text-white md:text-5xl">{heading}</h2>
        <div className="mt-12 grid gap-12 md:grid-cols-2">
          {steps.length === 0 ? (
            <p className="text-sm text-white/60">No steps configured.</p>
          ) : (
            steps.map((step, index) => {
              const isRightColumn = index % 2 === 1;
              const isOpen = Boolean(openIndices[index]);
              const deliverables = readStringArray(step.deliverables);

              return (
                <div
                  key={`${step.number}-${step.title}-${index}`}
                  className={`space-y-4 ${isRightColumn ? "md:mt-16" : ""}`}
                >
                  <p className="text-xs uppercase tracking-[0.3em] text-white/40">
                    {readString(step.number, `0${index + 1}`)}
                  </p>
                  <h3 className="font-serif text-3xl text-white md:text-4xl">
                    {readString(step.title, "Step Title")}
                  </h3>
                  <p className="text-white/60">{readString(step.description, "")}</p>

                  <button
                    type="button"
                    onClick={() =>
                      setOpenIndices((prev) => ({ ...prev, [index]: !prev[index] }))
                    }
                    className="flex w-full items-center justify-between border-b border-white/10 pb-3 text-xs uppercase tracking-[0.3em] text-white/50"
                  >
                    <span>Deliverables</span>
                    <span className="text-base text-white/70">
                      {isOpen ? <Minus size={16} /> : <Plus size={16} />}
                    </span>
                  </button>

                  <div
                    className={`overflow-hidden transition-all duration-300 ${
                      isOpen ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
                    }`}
                  >
                    <ul className="mt-4 space-y-2 text-sm text-white/60">
                      {deliverables.length === 0 ? (
                        <li className="text-white/40">Add deliverables.</li>
                      ) : (
                        deliverables.map((item, deliverableIndex) => (
                          <li key={`${deliverableIndex}-${item.slice(0, 12)}`}>{item}</li>
                        ))
                      )}
                    </ul>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}

"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type MultiOptionInputProps = {
  description?: string;
  label: string;
  name: string;
  options: readonly string[];
  value?: string[];
};

export function MultiOptionInput({
  description,
  label,
  name,
  options,
  value = [],
}: MultiOptionInputProps) {
  const [selected, setSelected] = useState<string[]>(value);
  const serializedValue = useMemo(() => JSON.stringify(selected), [selected]);

  function toggle(option: string) {
    setSelected((current) =>
      current.includes(option)
        ? current.filter((item) => item !== option)
        : [...current, option],
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label>{label}</Label>
        {description ? (
          <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <input name={name} type="hidden" value={serializedValue} />
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = selected.includes(option);

          return (
            <Button
              key={option}
              className={cn(
                "rounded-full",
                isSelected
                  ? "border-transparent bg-primary text-primary-foreground"
                  : "",
              )}
              onClick={() => toggle(option)}
              type="button"
              variant={isSelected ? "default" : "outline"}
            >
              {option}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

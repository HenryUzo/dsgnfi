"use client";

import { Plus, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ListInputProps = {
  description?: string;
  label: string;
  name: string;
  placeholder?: string;
  value?: string[];
};

export function ListInput({
  description,
  label,
  name,
  placeholder = "Add an item",
  value = [],
}: ListInputProps) {
  const [items, setItems] = useState<string[]>(value.filter(Boolean));
  const [draft, setDraft] = useState("");
  const serializedItems = useMemo(() => JSON.stringify(items), [items]);

  function addItem() {
    const nextItem = draft.trim();

    if (!nextItem) {
      return;
    }

    if (items.includes(nextItem)) {
      setDraft("");
      return;
    }

    setItems((currentItems) => [...currentItems, nextItem]);
    setDraft("");
  }

  function removeItem(itemToRemove: string) {
    setItems((currentItems) =>
      currentItems.filter((item) => item !== itemToRemove),
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor={`${name}-draft`}>{label}</Label>
        {description ? (
          <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <input name={name} type="hidden" value={serializedItems} />
      <div className="flex gap-3">
        <Input
          id={`${name}-draft`}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addItem();
            }
          }}
          placeholder={placeholder}
          value={draft}
        />
        <Button onClick={addItem} type="button" variant="outline">
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 px-4 py-3 text-sm text-muted-foreground">
            No entries yet.
          </div>
        ) : null}
        {items.map((item) => (
          <div
            key={item}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-foreground"
          >
            <span>{item}</span>
            <button
              className="text-muted-foreground transition hover:text-foreground"
              onClick={() => removeItem(item)}
              type="button"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import { Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { FAQEntry } from "@/lib/clients/types";

type FAQInputProps = {
  name: string;
  value?: FAQEntry[];
};

export function FAQInput({ name, value = [] }: FAQInputProps) {
  const [items, setItems] = useState<FAQEntry[]>(
    value.length > 0 ? value : [{ answer: "", question: "" }],
  );
  const serializedItems = useMemo(() => JSON.stringify(items), [items]);

  function updateItem(index: number, key: keyof FAQEntry, nextValue: string) {
    setItems((currentItems) =>
      currentItems.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: nextValue } : item,
      ),
    );
  }

  function addItem() {
    setItems((currentItems) => [...currentItems, { answer: "", question: "" }]);
  }

  function removeItem(index: number) {
    setItems((currentItems) => {
      const nextItems = currentItems.filter((_, itemIndex) => itemIndex !== index);
      return nextItems.length > 0 ? nextItems : [{ answer: "", question: "" }];
    });
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label>FAQs</Label>
        <p className="text-sm leading-6 text-muted-foreground">
          Capture common questions the agency should answer consistently.
        </p>
      </div>
      <input name={name} type="hidden" value={serializedItems} />
      <div className="space-y-3">
        {items.map((item, index) => (
          <div
            key={`${name}-${index}`}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">FAQ {index + 1}</p>
              <Button
                onClick={() => removeItem(index)}
                size="sm"
                type="button"
                variant="ghost"
              >
                <Trash2 className="h-4 w-4" />
                Remove
              </Button>
            </div>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor={`${name}-question-${index}`}>Question</Label>
                <Input
                  id={`${name}-question-${index}`}
                  onChange={(event) =>
                    updateItem(index, "question", event.target.value)
                  }
                  placeholder="What should pet parents know?"
                  value={item.question}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${name}-answer-${index}`}>Answer</Label>
                <Textarea
                  id={`${name}-answer-${index}`}
                  onChange={(event) =>
                    updateItem(index, "answer", event.target.value)
                  }
                  placeholder="Provide the approved answer or guidance."
                  value={item.answer}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      <Button onClick={addItem} type="button" variant="outline">
        <Plus className="h-4 w-4" />
        Add FAQ
      </Button>
    </div>
  );
}

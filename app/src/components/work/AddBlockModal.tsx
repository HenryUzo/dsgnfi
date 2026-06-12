import { X } from "lucide-react";

import { blockRegistry } from "../../cms/blockRegistry";
import type { ProjectBlockType } from "./blockTypes";

type AddBlockModalProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (type: ProjectBlockType) => void;
};

export function AddBlockModal({ open, onClose, onSelect }: AddBlockModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120]">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-3xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-black p-6 shadow-2xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-white/50">
              Add Block
            </p>
            <h3 className="mt-2 text-xl font-semibold text-white">
              Choose a block type
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white/80 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {blockRegistry.map((block) => (
            <button
              key={block.type}
              type="button"
              onClick={() => onSelect(block.type)}
              className="group rounded-xl border border-white/10 bg-white/5 p-4 text-left transition-colors hover:border-white/40 hover:bg-white/10"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-black/40 text-white">
                <block.icon className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold text-white">{block.label}</p>
              <p className="mt-1 text-xs text-white/60">{block.description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

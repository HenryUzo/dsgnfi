import type { ReactNode } from "react";
import { GripVertical, Pencil, Trash2 } from "lucide-react";

type EditableBlockProps = {
  editable?: boolean;
  manageBlocks?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
  children: ReactNode;
};

export function EditableBlock({
  editable = false,
  manageBlocks = false,
  selected = false,
  onSelect,
  onEdit,
  onDelete,
  dragHandleProps,
  children,
}: EditableBlockProps) {
  return (
    <div
      className={`relative rounded-2xl transition-shadow ${
        selected ? "ring-1 ring-white/40 shadow-[0_0_0_1px_rgba(255,255,255,0.15)]" : ""
      }`}
      onClick={(event) => {
        event.stopPropagation();
        if (manageBlocks) {
          onSelect?.();
        }
      }}
    >
      {manageBlocks ? (
        <>
          <button
            type="button"
            {...dragHandleProps}
            onClick={(event) => event.stopPropagation()}
            className="absolute left-3 top-3 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-black/60 text-white/80 transition-colors hover:text-white"
            aria-label="Drag block"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onDelete?.();
            }}
            className="absolute right-3 top-3 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-black/60 text-white/80 transition-colors hover:text-white"
            aria-label="Delete block"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </>
      ) : null}
      {editable ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onEdit?.();
          }}
          className={`absolute top-3 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-black/60 text-white/80 transition-colors hover:text-white ${
            manageBlocks ? "right-14" : "right-3"
          }`}
          aria-label="Edit block"
        >
          <Pencil className="h-4 w-4" />
        </button>
      ) : null}
      {children}
    </div>
  );
}

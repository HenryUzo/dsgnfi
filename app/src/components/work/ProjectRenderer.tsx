import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { AddBlockButton } from "./AddBlockButton";
import { AddBlockModal } from "./AddBlockModal";
import { BlockReveal } from "./BlockReveal";
import { EditableBlock } from "./EditableBlock";
import { normalizeProjectContent, type ProjectBlock } from "./blockTypes";
import { createDefaultBlock } from "../../cms/blockFactory";
import { CtaBlock } from "./blocks/CtaBlock";
import { GalleryBlock } from "./blocks/GalleryBlock";
import { HeroBlock } from "./blocks/HeroBlock";
import { ImageBlock } from "./blocks/ImageBlock";
import { MetricsBlock } from "./blocks/MetricsBlock";
import { QuoteBlock } from "./blocks/QuoteBlock";
import { RichTextBlock } from "./blocks/RichTextBlock";
import { TimelineBlock } from "./blocks/TimelineBlock";
import { VideoBlock } from "./blocks/VideoBlock";
import { ProcessHeroAtticSaltBlock } from "./blocks/ProcessHeroAtticSaltBlock";
import { ProcessMethodIntroBlock } from "./blocks/ProcessMethodIntroBlock";
import { ProcessStepsAccordionBlock } from "./blocks/ProcessStepsAccordionBlock";
import { ProcessMediaPeekCarouselBlock } from "./blocks/ProcessMediaPeekCarouselBlock";
import { ProcessCtaOutlineBlock } from "./blocks/ProcessCtaOutlineBlock";

type ProjectRendererProps = {
  content: unknown;
  editable?: boolean;
  onEditBlock?: (index: number, block: ProjectBlock) => void;
  blocks?: ProjectBlock[];
  onBlocksChange?: (blocks: ProjectBlock[]) => void;
  selectedBlockId?: string | null;
  setSelectedBlockId?: (id: string | null) => void;
  flushXOverride?: boolean;
  stackClassName?: string;
};

function renderBlock(block: ProjectBlock, showFrame: boolean, flushX: boolean) {
  switch (block.type) {
    case "hero":
      return (
        <HeroBlock
          data={block.data}
          variant={block.variant}
          showFrame={showFrame}
          flushX={flushX}
        />
      );
    case "richText":
      return (
        <RichTextBlock
          data={block.data}
          variant={block.variant}
          showFrame={showFrame}
          flushX={flushX}
        />
      );
    case "image":
      return <ImageBlock data={block.data} showFrame={showFrame} flushX={flushX} />;
    case "gallery":
      return (
        <GalleryBlock
          data={block.data}
          variant={block.variant}
          showFrame={showFrame}
          flushX={flushX}
        />
      );
    case "metrics":
      return <MetricsBlock data={block.data} showFrame={showFrame} flushX={flushX} />;
    case "quote":
      return <QuoteBlock data={block.data} showFrame={showFrame} flushX={flushX} />;
    case "timeline":
      return (
        <TimelineBlock
          data={block.data}
          variant={block.variant}
          showFrame={showFrame}
          flushX={flushX}
        />
      );
    case "video":
      return <VideoBlock data={block.data} showFrame={showFrame} flushX={flushX} />;
    case "cta":
      return (
        <CtaBlock
          data={block.data}
          variant={block.variant}
          showFrame={showFrame}
          flushX={flushX}
        />
      );
    case "processHeroAtticSalt":
      return <ProcessHeroAtticSaltBlock data={block.data} />;
    case "processMethodIntro":
      return <ProcessMethodIntroBlock data={block.data} />;
    case "processStepsAccordion":
      return <ProcessStepsAccordionBlock data={block.data} />;
    case "processMediaPeekCarousel":
      return <ProcessMediaPeekCarouselBlock data={block.data} />;
    case "processCtaOutline":
      return <ProcessCtaOutlineBlock data={block.data} />;
    default:
      return (
        <section
          className={`rounded-xl bg-black/30 p-6 text-sm text-white/60 ${
            showFrame ? "border border-white/10" : ""
          }`}
        >
          Unsupported block type: {block.type}
        </section>
      );
  }
}

export function ProjectRenderer({
  content,
  editable = false,
  onEditBlock,
  blocks: blocksProp,
  onBlocksChange,
  selectedBlockId,
  setSelectedBlockId,
  flushXOverride,
  stackClassName,
}: ProjectRendererProps) {
  const normalized = useMemo(() => normalizeProjectContent(content), [content]);
  const blocks = blocksProp ?? normalized.blocks;
  const flushX = flushXOverride ?? !editable;
  const manageBlocks = editable && typeof onBlocksChange === "function";
  const [internalSelected, setInternalSelected] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const selectedId = selectedBlockId ?? internalSelected;
  const setSelectedId = setSelectedBlockId ?? setInternalSelected;
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    if (!manageBlocks || !onBlocksChange) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = blocks.findIndex((block) => block.id === active.id);
    const newIndex = blocks.findIndex((block) => block.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const nextBlocks = arrayMove(blocks, oldIndex, newIndex);
    onBlocksChange(nextBlocks);
  };

  const handleInsertBlock = (type: ProjectBlock["type"]) => {
    if (!manageBlocks || !onBlocksChange) return;
    const newBlock = createDefaultBlock(type);
    const selectedIndex = blocks.findIndex((block) => block.id === selectedId);
    const insertIndex = selectedIndex >= 0 ? selectedIndex + 1 : blocks.length;
    const nextBlocks = [
      ...blocks.slice(0, insertIndex),
      newBlock,
      ...blocks.slice(insertIndex),
    ];
    onBlocksChange(nextBlocks);
    setSelectedId(newBlock.id);
    setAddModalOpen(false);
  };

  const handleDeleteBlock = (block: ProjectBlock, index: number) => {
    if (!manageBlocks || !onBlocksChange) return;
    if (block.type === "hero" && index === 0) {
      return;
    }
    if (!window.confirm("Delete this block?")) return;
    const nextBlocks = blocks.filter((_, idx) => idx !== index);
    onBlocksChange(nextBlocks);
    if (selectedId === block.id) {
      setSelectedId(null);
    }
  };

  if (blocks.length === 0) {
    return (
      <section
        className={`rounded-2xl bg-black/20 p-8 text-sm text-white/60 ${
          editable ? "border border-dashed border-white/20" : ""
        }`}
      >
        No blocks in `draftContent`. Choose a template or initialize content.
      </section>
    );
  }

  const list = (
    <div
      className={stackClassName ?? "space-y-6"}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          if (manageBlocks) {
            setSelectedId(null);
          }
        }
      }}
    >
      {blocks.map((block, index) => (
        <SortableBlock
          key={block.id || `${block.type}-${index}`}
          block={block}
          index={index}
          editable={editable}
          manageBlocks={manageBlocks}
          selected={manageBlocks && selectedId === block.id}
          onSelect={() => {
            if (manageBlocks) {
              setSelectedId(block.id);
            }
          }}
          onEdit={() => onEditBlock?.(index, block)}
          onDelete={() => handleDeleteBlock(block, index)}
          onAddBelow={() => setAddModalOpen(true)}
          showFrame={editable}
          flushX={flushX}
        />
      ))}
    </div>
  );

  return (
    <>
      {manageBlocks ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={blocks.map((block) => block.id)} strategy={verticalListSortingStrategy}>
            {list}
          </SortableContext>
        </DndContext>
      ) : (
        list
      )}

      {manageBlocks ? (
        <AddBlockModal
          open={addModalOpen}
          onClose={() => setAddModalOpen(false)}
          onSelect={(type) => handleInsertBlock(type)}
        />
      ) : null}
    </>
  );
}

type SortableBlockProps = {
  block: ProjectBlock;
  index: number;
  editable: boolean;
  manageBlocks: boolean;
  selected: boolean;
  onSelect: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onAddBelow: () => void;
  showFrame: boolean;
  flushX: boolean;
};

function SortableBlock({
  block,
  index,
  editable,
  manageBlocks,
  selected,
  onSelect,
  onEdit,
  onDelete,
  onAddBelow,
  showFrame,
  flushX,
}: SortableBlockProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
    disabled: !manageBlocks,
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? "opacity-60" : ""}>
      <BlockReveal enabled={!manageBlocks} delay={index * 80}>
        <EditableBlock
          editable={editable}
          manageBlocks={manageBlocks}
          selected={selected}
          onSelect={onSelect}
          onEdit={onEdit}
          onDelete={onDelete}
          dragHandleProps={{ ...attributes, ...listeners }}
        >
          {renderBlock(block, showFrame, flushX)}
        </EditableBlock>
      </BlockReveal>

      {manageBlocks && selected ? <AddBlockButton onClick={onAddBelow} /> : null}
    </div>
  );
}

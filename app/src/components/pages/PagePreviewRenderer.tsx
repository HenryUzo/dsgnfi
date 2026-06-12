import { PageBlocksRenderer, type RenderablePageBlock } from "./PageBlocksRenderer";

type PagePreviewRendererProps = {
  title: string;
  blocks: RenderablePageBlock[];
};

export function PagePreviewRenderer({ title, blocks }: PagePreviewRendererProps) {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-16">
        <header className="border-b border-white/10 pb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-white/40">Draft Preview</p>
          <h1 className="mt-3 font-serif text-4xl md:text-5xl">{title}</h1>
        </header>
        <PageBlocksRenderer blocks={blocks} />
      </div>
    </div>
  );
}

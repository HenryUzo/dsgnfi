import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { SiteScopedLink } from "../components/SiteScopedLink";
import { useAdminMe } from "../hooks/useAdminMe";
import { BlockEditorDrawer } from "../components/work/BlockEditorDrawer";
import { ProjectRenderer } from "../components/work/ProjectRenderer";
import {
  cloneProjectContent,
  normalizeProjectContent,
  type ProjectBlock,
} from "../components/work/blockTypes";
import { getWorkPublicProjectBySlug, type WorkPublicProject } from "../services/workPublic";
import { updateWorkProject } from "../services/workAdmin";

export function Project() {
  const { slug } = useParams<{ slug: string }>();
  const { isAdmin } = useAdminMe();
  const [project, setProject] = useState<WorkPublicProject | null>(null);
  const [contentDraft, setContentDraft] = useState<{ blocks: Array<Record<string, unknown>> }>(
    { blocks: [] }
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingBlock, setEditingBlock] = useState<ProjectBlock | null>(null);

  useEffect(() => {
    if (typeof slug !== "string" || slug.length === 0) return;
    const currentSlug: string = slug;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await getWorkPublicProjectBySlug(currentSlug);
        if (cancelled) return;
        setProject(response);
        setContentDraft(cloneProjectContent(response.content));
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Failed to load project.";
        setError(message);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const normalizedDraft = useMemo(
    () => normalizeProjectContent(contentDraft),
    [contentDraft]
  );

  const handleEditBlock = (index: number, block: ProjectBlock) => {
    setEditingIndex(index);
    setEditingBlock(block);
  };

  const handleSaveBlock = (nextBlock: ProjectBlock) => {
    if (editingIndex === null) {
      setEditingBlock(null);
      return;
    }
    const nextBlocks = normalizedDraft.blocks.map((block, idx) =>
      idx === editingIndex ? nextBlock : block
    );
    setContentDraft({ blocks: nextBlocks as Array<Record<string, unknown>> });
    setEditingBlock(null);
    setEditingIndex(null);
  };

  const handleSaveDraft = async () => {
    if (!project) return;
    if (project.tags.length === 0) {
      const message = "This project has no tags. Add at least one tag from /admin/work.";
      setError(message);
      toast.error(message);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateWorkProject(project.id, {
        title: project.title,
        slug: project.slug,
        excerpt: project.excerpt,
        coverImage: project.coverImage,
        tagIds: project.tags.map((tag) => tag.id),
        draftContent: contentDraft as Record<string, unknown>,
      });
      toast.success("Draft content updated.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save draft.";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black px-6 pt-28 text-white">
        <p className="text-sm text-white/60">Loading project...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-black px-6 pt-28 text-white">
        <h1 className="font-serif text-4xl">Project not found</h1>
        <SiteScopedLink to="/work" className="mt-4 inline-flex items-center gap-2 text-white/70 hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Back to Work
        </SiteScopedLink>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-20 text-white">
      <header
        className="relative mb-10 pt-24 pb-16"
        style={
          project.coverImage
            ? {
                backgroundImage: `linear-gradient(rgba(0,0,0,.6), rgba(0,0,0,.7)), url(${project.coverImage})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : undefined
        }
      >
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-black" />
        <div className="relative z-10 mx-auto w-full max-w-6xl px-6 lg:px-12">
          <SiteScopedLink
            to="/work"
            className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Work
          </SiteScopedLink>
          <h1 className="font-serif text-5xl leading-tight md:text-6xl">{project.title}</h1>
          {project.excerpt ? <p className="mt-4 max-w-3xl text-white/70">{project.excerpt}</p> : null}
          <div className="mt-4 flex flex-wrap gap-2">
            {project.tags.map((tag) => (
              <span
                key={tag.id}
                className="rounded-full border border-white/15 px-2 py-1 text-[10px] uppercase tracking-widest text-white/60"
              >
                {tag.name}
              </span>
            ))}
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-6 lg:px-12">

        {isAdmin ? (
          <div className="mb-6 rounded-xl border border-white/15 bg-white/5 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.25em] text-white/60">
                Admin Overlay Editing Enabled
              </p>
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSaveDraft()}
                className="rounded-full bg-white px-4 py-2 text-xs uppercase tracking-widest text-black hover:bg-white/90 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Draft"}
              </button>
            </div>
            <p className="mt-2 text-sm text-white/60">
              Click edit icons on blocks to update content in-place.
            </p>
          </div>
        ) : null}

        <ProjectRenderer
          content={contentDraft}
          editable={isAdmin}
          onEditBlock={handleEditBlock}
        />

        {error ? <p className="mt-6 text-sm text-red-300">{error}</p> : null}
      </div>

      <BlockEditorDrawer
        open={Boolean(editingBlock)}
        block={editingBlock}
        onClose={() => {
          setEditingBlock(null);
          setEditingIndex(null);
        }}
        onSave={handleSaveBlock}
      />
    </div>
  );
}

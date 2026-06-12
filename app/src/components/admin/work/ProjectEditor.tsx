import { useEffect, useState } from "react";

import { BlockEditorDrawer } from "../../work/BlockEditorDrawer";
import { ProjectRenderer } from "../../work/ProjectRenderer";
import {
  normalizeProjectContent,
  type ProjectBlock,
} from "../../work/blockTypes";
import { getTemplateContent, projectTemplates } from "../../../cms/projectTemplates";
import { uploadMedia } from "../../../lib/cmsAdmin";
import type { PublishStatus, WorkProject, WorkTag } from "../../../services/workAdmin";

export type ProjectDraftForm = {
  id: string | null;
  templateId: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage: string;
  tagIds: string[];
  draftContent: Record<string, unknown>;
  status: PublishStatus;
  publishedAt: string | null;
};

type ProjectEditorProps = {
  value: ProjectDraftForm;
  tags: WorkTag[];
  projects: WorkProject[];
  loadingProjects: boolean;
  saving: boolean;
  publishing: boolean;
  error: string | null;
  onPickProject: (id: string) => Promise<void>;
  onCreate: () => void;
  onDuplicate: (id: string) => Promise<void>;
  onChange: (next: ProjectDraftForm) => void;
  onSave: () => Promise<void>;
  onPublish: () => Promise<void>;
};

const inputClassName =
  "w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white placeholder:text-white/40 focus:border-white focus:outline-none";

const labelClassName = "text-xs uppercase tracking-widest text-white/50";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function ProjectEditor({
  value,
  tags,
  projects,
  loadingProjects,
  saving,
  publishing,
  error,
  onPickProject,
  onCreate,
  onDuplicate,
  onChange,
  onSave,
  onPublish,
}: ProjectEditorProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingBlock, setEditingBlock] = useState<ProjectBlock | null>(null);
  const [slugEdited, setSlugEdited] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverUploadError, setCoverUploadError] = useState<string | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const normalized = normalizeProjectContent(value.draftContent);

  const statusBadgeClass =
    value.status === "PUBLISHED"
      ? "border-emerald-500/40 text-emerald-200 bg-emerald-500/10"
      : "border-amber-500/40 text-amber-200 bg-amber-500/10";
  const hasAtLeastOneTag = value.tagIds.length > 0;

  const handleEditBlock = (index: number, block: ProjectBlock) => {
    setEditingIndex(index);
    setEditingBlock(block);
    setSelectedBlockId(block.id);
  };

  const handleSaveBlock = (nextBlock: ProjectBlock) => {
    if (editingIndex === null) {
      setEditingBlock(null);
      return;
    }

    const nextBlocks = normalized.blocks.map((block, index) =>
      index === editingIndex ? nextBlock : block
    );

    onChange({
      ...value,
      draftContent: { blocks: nextBlocks },
    });
    setEditingBlock(null);
    setEditingIndex(null);
  };

  const handleCloseDrawer = () => {
    setEditingBlock(null);
    setEditingIndex(null);
  };

  useEffect(() => {
    setSlugEdited(false);
  }, [value.id]);

  useEffect(() => {
    setSelectedBlockId(null);
  }, [value.id]);

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
      <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm uppercase tracking-[0.2em] text-white/60">Projects</h3>
          <button
            type="button"
            onClick={onCreate}
            className="rounded-full border border-white/20 px-3 py-1.5 text-[10px] uppercase tracking-widest text-white hover:border-white"
          >
            New Project
          </button>
        </div>

        {loadingProjects ? (
          <p className="text-sm text-white/60">Loading projects...</p>
        ) : projects.length === 0 ? (
          <p className="text-sm text-white/60">No projects yet.</p>
        ) : (
          <div className="space-y-2">
            {projects.map((project) => (
              <button
                key={project.id}
                type="button"
                onClick={() => void onPickProject(project.id)}
                className={`w-full rounded-xl border p-3 text-left transition-colors ${
                  value.id === project.id
                    ? "border-white/50 bg-white/10"
                    : "border-white/10 bg-black/30 hover:border-white/30"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-white">{project.title || "(Untitled)"}</p>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-widest ${
                      project.status === "PUBLISHED"
                        ? "border-emerald-500/40 text-emerald-200 bg-emerald-500/10"
                        : "border-amber-500/40 text-amber-200 bg-amber-500/10"
                    }`}
                  >
                    {project.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-white/50">{project.slug}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {project.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] uppercase tracking-widest text-white/60"
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      void onDuplicate(project.id);
                    }}
                    className="rounded-full border border-white/20 px-3 py-1 text-[10px] uppercase tracking-widest text-white/70 hover:text-white"
                  >
                    Duplicate
                  </button>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <header className="-mx-6 -mt-6 mb-6 flex flex-col gap-3 rounded-t-2xl border-b border-white/10 bg-black/85 px-6 py-4 backdrop-blur sticky top-[7rem] z-20 md:flex-row md:items-center md:justify-between lg:top-6">
          <div>
            <h2 className="text-xl font-semibold text-white">Project Editor</h2>
            <p className="text-xs uppercase tracking-[0.2em] text-white/40">
              Last published:{" "}
              {value.publishedAt
                ? new Date(value.publishedAt).toLocaleString()
                : "Not published yet"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`rounded-full border px-3 py-1 text-xs uppercase tracking-widest ${statusBadgeClass}`}
            >
              {value.status}
            </span>
            <button
              type="button"
              disabled={saving || publishing || !hasAtLeastOneTag}
              onClick={() => void onSave()}
              className="rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-widest text-white hover:border-white disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Draft"}
            </button>
            <button
              type="button"
              disabled={saving || publishing || !hasAtLeastOneTag}
              onClick={() => void onPublish()}
              className="rounded-full bg-white px-4 py-2 text-xs uppercase tracking-widest text-black hover:bg-white/90 disabled:opacity-50"
            >
              {publishing ? "Publishing..." : "Publish"}
            </button>
          </div>
        </header>

        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <label className={labelClassName}>Title</label>
              <input
                value={value.title}
                onChange={(event) => {
                  const nextTitle = event.target.value;
                  const nextSlug =
                    !slugEdited || !value.slug ? slugify(nextTitle) : value.slug;
                  onChange({ ...value, title: nextTitle, slug: nextSlug });
                }}
                className={inputClassName}
                placeholder="Project title"
              />
            </div>
            <div className="space-y-2">
              <label className={labelClassName}>Slug</label>
              <input
                value={value.slug}
                onChange={(event) => {
                  setSlugEdited(true);
                  onChange({ ...value, slug: event.target.value });
                }}
                className={inputClassName}
                placeholder="project-slug"
              />
            </div>
            <div className="space-y-2">
              <label className={labelClassName}>Template</label>
              <select
                value={value.templateId}
                onChange={(event) => {
                  const nextTemplateId = event.target.value;
                  const nextContent =
                    getTemplateContent(nextTemplateId) ?? { blocks: [] };
                  onChange({
                    ...value,
                    templateId: nextTemplateId,
                    draftContent: nextContent,
                  });
                }}
                className={inputClassName}
              >
                <option value="">Select a template...</option>
                {projectTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className={labelClassName}>Excerpt</label>
            <textarea
              rows={4}
              value={value.excerpt}
              onChange={(event) => onChange({ ...value, excerpt: event.target.value })}
              className={inputClassName}
              placeholder="Short project summary for listing cards."
            />
          </div>

          <div className="space-y-2">
            <label className={labelClassName}>Cover Image URL</label>
            <input
              value={value.coverImage}
              onChange={(event) => onChange({ ...value, coverImage: event.target.value })}
              className={inputClassName}
              placeholder="https://..."
            />
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="file"
                accept="image/*"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  setCoverUploading(true);
                  setCoverUploadError(null);
                  try {
                    const result = await uploadMedia(file);
                    onChange({ ...value, coverImage: result.url });
                  } catch (err) {
                    const message =
                      err instanceof Error ? err.message : "Upload failed.";
                    setCoverUploadError(message);
                  } finally {
                    setCoverUploading(false);
                    event.currentTarget.value = "";
                  }
                }}
                className="text-xs uppercase tracking-widest text-white/60"
              />
              {coverUploading ? (
                <span className="text-xs uppercase tracking-widest text-white/40">
                  Uploading...
                </span>
              ) : null}
            </div>
            {coverUploadError ? (
              <p className="text-xs text-red-300">{coverUploadError}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className={labelClassName}>Tags (select at least one)</label>
            <div className="grid gap-2 md:grid-cols-2">
              {tags.map((tag) => {
                const checked = value.tagIds.includes(tag.id);
                return (
                  <label
                    key={tag.id}
                    className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/80"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => {
                        const nextTagIds = event.target.checked
                          ? [...value.tagIds, tag.id]
                          : value.tagIds.filter((id) => id !== tag.id);
                        onChange({ ...value, tagIds: nextTagIds });
                      }}
                      className="h-4 w-4 rounded border-white/30 bg-black/40"
                    />
                    {tag.name}
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-white/10 bg-black/25 p-4 md:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-sm uppercase tracking-[0.25em] text-white/60">
              Template Preview (Editable Blocks)
            </h3>
            <p className="text-xs text-white/50">Click the pencil on any block to edit.</p>
          </div>
          <ProjectRenderer
            content={value.draftContent}
            blocks={normalized.blocks}
            editable
            selectedBlockId={selectedBlockId}
            setSelectedBlockId={setSelectedBlockId}
            onEditBlock={handleEditBlock}
            onBlocksChange={(nextBlocks) => {
              onChange({ ...value, draftContent: { blocks: nextBlocks } });
            }}
          />
        </div>

        {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}
        {!hasAtLeastOneTag ? (
          <p className="mt-2 text-sm text-amber-300">
            Select at least one tag to save or publish this project.
          </p>
        ) : null}
      </section>

      <BlockEditorDrawer
        open={Boolean(editingBlock)}
        block={editingBlock}
        onClose={handleCloseDrawer}
        onSave={handleSaveBlock}
      />
    </div>
  );
}

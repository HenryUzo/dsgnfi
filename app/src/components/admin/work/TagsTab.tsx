import { useState } from "react";
import { z } from "zod";

import type { WorkTag } from "../../../services/workAdmin";

const tagSchema = z.object({
  name: z.string().min(1, "Name is required."),
  slug: z
    .string()
    .min(1, "Slug is required.")
    .regex(/^[a-z0-9-]+$/, "Slug must use lowercase letters, numbers, and hyphens."),
});

type TagsTabProps = {
  tags: WorkTag[];
  loading: boolean;
  error: string | null;
  busyId: string | null;
  creating: boolean;
  onCreate: (input: { name: string; slug: string }) => Promise<void>;
  onUpdate: (id: string, input: { name: string; slug: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

const inputClassName =
  "w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white placeholder:text-white/40 focus:border-white focus:outline-none";

const labelClassName = "text-xs uppercase tracking-widest text-white/50";

export function TagsTab({
  tags,
  loading,
  error,
  busyId,
  creating,
  onCreate,
  onUpdate,
  onDelete,
}: TagsTabProps) {
  const [newTag, setNewTag] = useState({ name: "", slug: "" });
  const [newError, setNewError] = useState<string | null>(null);
  const [editingById, setEditingById] = useState<Record<string, WorkTag>>({});
  const [editErrorById, setEditErrorById] = useState<Record<string, string | null>>({});

  const handleCreate = async () => {
    const parsed = tagSchema.safeParse(newTag);
    if (!parsed.success) {
      setNewError(parsed.error.issues[0]?.message ?? "Invalid tag.");
      return;
    }
    setNewError(null);
    await onCreate(parsed.data);
    setNewTag({ name: "", slug: "" });
  };

  const handleSaveEdit = async (id: string) => {
    const editValue = editingById[id];
    if (!editValue) return;
    const parsed = tagSchema.safeParse(editValue);
    if (!parsed.success) {
      setEditErrorById((prev) => ({
        ...prev,
        [id]: parsed.error.issues[0]?.message ?? "Invalid tag.",
      }));
      return;
    }
    setEditErrorById((prev) => ({ ...prev, [id]: null }));
    await onUpdate(id, parsed.data);
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <header className="mb-6">
        <h2 className="text-xl font-semibold text-white">Work Tags</h2>
        <p className="mt-1 text-sm text-white/60">
          Manage tags used for filtering and assigning projects.
        </p>
      </header>

      <div className="rounded-xl border border-white/10 bg-black/30 p-4">
        <p className="mb-4 text-xs uppercase tracking-[0.25em] text-white/50">Create Tag</p>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-2">
            <label className={labelClassName}>Name</label>
            <input
              value={newTag.name}
              onChange={(event) =>
                setNewTag((prev) => ({ ...prev, name: event.target.value }))
              }
              className={inputClassName}
              placeholder="Brand Strategy"
            />
          </div>
          <div className="space-y-2">
            <label className={labelClassName}>Slug</label>
            <input
              value={newTag.slug}
              onChange={(event) =>
                setNewTag((prev) => ({ ...prev, slug: event.target.value }))
              }
              className={inputClassName}
              placeholder="brand-strategy"
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              disabled={creating}
              onClick={handleCreate}
              className="rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-widest text-white hover:border-white disabled:opacity-50"
            >
              {creating ? "Creating…" : "Add Tag"}
            </button>
          </div>
        </div>
        {newError ? <p className="mt-3 text-sm text-red-300">{newError}</p> : null}
      </div>

      <div className="mt-6 space-y-3">
        {loading ? (
          <p className="text-sm text-white/60">Loading tags…</p>
        ) : tags.length === 0 ? (
          <p className="text-sm text-white/60">No tags yet. Create your first tag above.</p>
        ) : (
          tags.map((tag) => {
            const editValue = editingById[tag.id] ?? tag;
            const rowBusy = busyId === tag.id;
            return (
              <div
                key={tag.id}
                className="rounded-xl border border-white/10 bg-black/30 p-4"
              >
                <div className="grid gap-3 md:grid-cols-3">
                  <input
                    value={editValue.name}
                    onChange={(event) =>
                      setEditingById((prev) => ({
                        ...prev,
                        [tag.id]: { ...editValue, name: event.target.value },
                      }))
                    }
                    className={inputClassName}
                    placeholder="Tag name"
                  />
                  <input
                    value={editValue.slug}
                    onChange={(event) =>
                      setEditingById((prev) => ({
                        ...prev,
                        [tag.id]: { ...editValue, slug: event.target.value },
                      }))
                    }
                    className={inputClassName}
                    placeholder="tag-slug"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={rowBusy}
                      onClick={() => void handleSaveEdit(tag.id)}
                      className="rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-widest text-white hover:border-white disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      disabled={rowBusy}
                      onClick={() => void onDelete(tag.id)}
                      className="rounded-full border border-red-400/40 px-4 py-2 text-xs uppercase tracking-widest text-red-200 hover:border-red-300 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                {editErrorById[tag.id] ? (
                  <p className="mt-2 text-sm text-red-300">{editErrorById[tag.id]}</p>
                ) : null}
              </div>
            );
          })
        )}
      </div>

      {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}
    </section>
  );
}

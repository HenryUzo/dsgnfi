import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { useAdmin } from "../../auth/useAdmin";

import { ApiError } from "../../lib/api";
import { EditorStatusBar } from "../../components/admin/EditorStatusBar";
import { BlockEditorDrawer } from "../../components/work/BlockEditorDrawer";
import { ProjectRenderer } from "../../components/work/ProjectRenderer";
import {
  normalizeProjectContent,
  type ProjectBlock,
} from "../../components/work/blockTypes";
import { useProcessAdminContent } from "../../hooks/useProcessAdminContent";
import {
  processTemplates,
  getProcessTemplateContent,
} from "../../cms/processTemplates";
import {
  publishProcessContent,
  saveProcessDraft,
} from "../../services/processAdmin";

export function ProcessAdmin() {
  const navigate = useNavigate();
  const { admin } = useAdmin();
  const {
    content,
    setContent,
    status,
    publishedAt,
    loading,
    error,
    errorStatus,
    setError,
    reload,
    isEmpty,
  } = useProcessAdminContent(admin?.currentSite?.id);
  const [templateId, setTemplateId] = useState(processTemplates[0]?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingBlock, setEditingBlock] = useState<ProjectBlock | null>(null);

  const normalized = normalizeProjectContent(content);

  const handleAuthError = (err: unknown) => {
    if (err instanceof ApiError && err.status === 401) {
      navigate("/admin/login", { replace: true });
      return true;
    }
    return false;
  };

  useEffect(() => {
    setSelectedBlockId(null);
    setEditingIndex(null);
    setEditingBlock(null);
  }, [admin?.currentSite?.id]);

  useEffect(() => {
    if (errorStatus === 401) {
      navigate("/admin/login", { replace: true });
    }
  }, [errorStatus, navigate]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await saveProcessDraft(content);
      toast.success("Process draft saved.");
      await reload();
    } catch (err) {
      if (handleAuthError(err)) return;
      const message = err instanceof Error ? err.message : "Failed to save draft.";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    setError(null);
    try {
      await saveProcessDraft(content);
      await publishProcessContent();
      toast.success("Process page published.");
      await reload();
    } catch (err) {
      if (handleAuthError(err)) return;
      const message = err instanceof Error ? err.message : "Failed to publish.";
      setError(message);
      toast.error(message);
    } finally {
      setPublishing(false);
    }
  };

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

    setContent({ blocks: nextBlocks });
    setEditingBlock(null);
    setEditingIndex(null);
  };



  return (
    <>
      <div className="w-full px-6 py-8">
        <EditorStatusBar
          label="Process Page"
          status={status}
          publishedAt={publishedAt}
          previewHref="/admin/site-settings"
          note="Draft changes are private until you publish. Preview links are generated from Site Settings and expire automatically."
          onSave={() => void handleSave()}
          onPublish={() => void handlePublish()}
          saving={saving}
          publishing={publishing}
        />

        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div />
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs uppercase tracking-[0.25em] text-white/50">Template</label>
              <select
                value={templateId}
                onChange={(event) => setTemplateId(event.target.value)}
                className="rounded-full border border-white/20 bg-black/60 px-3 py-2 text-xs uppercase tracking-widest text-white"
              >
                {processTemplates.map((template) => (
                  <option key={template.id} value={template.id} className="bg-black">
                    {template.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  const next = getProcessTemplateContent(templateId);
                  if (!next) return;
                  if (!window.confirm("Apply template? This will replace the current draft blocks.")) {
                    return;
                  }
                  setContent(next);
                  setSelectedBlockId(null);
                }}
                className="rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-widest text-white hover:border-white"
              >
                Apply
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-white/60">Loading process content...</p>
        ) : isEmpty ? (
          <section className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-6">
            <h2 className="text-xl font-semibold text-white">No draft blocks yet</h2>
            <p className="mt-2 text-sm text-white/60">
              Apply one of the process templates above or start adding blocks to create
              the current site&apos;s process page draft.
            </p>
          </section>
        ) : (
          <ProjectRenderer
            content={content}
            blocks={normalized.blocks}
            editable
            selectedBlockId={selectedBlockId}
            setSelectedBlockId={setSelectedBlockId}
            onEditBlock={handleEditBlock}
            onBlocksChange={(nextBlocks) => setContent({ blocks: nextBlocks })}
            stackClassName={
              normalized.blocks.some((block) =>
                [
                  "processHeroAtticSalt",
                  "processMethodIntro",
                  "processStepsAccordion",
                  "processMediaPeekCarousel",
                  "processCtaOutline",
                ].includes(block.type)
              )
                ? "space-y-0"
                : "space-y-10 md:space-y-14"
            }
            flushXOverride={false}
          />
        )}

        {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}
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
    </>
  );
}


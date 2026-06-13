import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowDown,
  ArrowUpDown,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDashed,
  Copy,
  Eye,
  EyeOff,
  ExternalLink,
  FileText,
  Gauge,
  Grid2X2,
  Home,
  Lightbulb,
  MoreHorizontal,
  PencilLine,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { useAdmin } from "../../auth/useAdmin";
import { ApiError } from "../../lib/api";
import { buildSiteScopedPath } from "../../lib/siteOverride";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";
import { Checkbox } from "../../components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import {
  createAdminPage,
  deleteAdminPage,
  duplicateAdminPage,
  listAdminPages,
  listAdminPageTemplates,
  renameAdminPageTitle,
  setAdminPageVisibility,
  updateAdminPageMeta,
  type AdminPageSummary,
  type AdminPageTemplateSummary,
  type PageHierarchyRole,
} from "../../services/siteSettings";

function slugify(value: string) {
  const trimmed = value.trim().toLowerCase();
  const base = trimmed
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return base ? `/${base}` : "/";
}

function getPageEditorPath(page: AdminPageSummary) {
  return page.editorResolution?.editorRoute ?? `/admin/pages/${encodeURIComponent(page.pageKey)}`;
}

function getPublicPagePath(page: AdminPageSummary, siteSlug?: string | null) {
  return buildSiteScopedPath(page.slug, siteSlug);
}

type PageStatusFilter =
  | "all"
  | "published"
  | "draft"
  | "inherited"
  | "modified"
  | "untracked"
  | "archived";
type PageTypeFilter = "all" | "main" | "template" | "custom" | "inner";
type SortDirection = "desc" | "asc";

const statusBadgeClass: Record<string, string> = {
  Published: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
  Draft: "border-orange-400/25 bg-orange-400/10 text-orange-200",
  Inherited: "border-sky-400/25 bg-sky-400/10 text-sky-200",
  Modified: "border-violet-400/25 bg-violet-400/10 text-violet-200",
  Untracked: "border-yellow-400/25 bg-yellow-400/10 text-yellow-200",
  Archived: "border-white/10 bg-white/5 text-white/45",
};

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function getDisplayStatus(page: AdminPageSummary) {
  if (!page.isVisible) return "Archived";
  if (page.status === "DRAFT") return "Draft";
  if (page.lineage.status === "INHERITED") return "Inherited";
  if (page.lineage.status === "MODIFIED") return "Modified";
  if (page.lineage.status === "UNTRACKED") return "Untracked";
  return "Published";
}

function getPageTypeLabel(page: AdminPageSummary) {
  if (page.hierarchy.role === "INNER") return "Inner";
  if (page.pageKey.startsWith("custom__")) return "Custom";
  if (page.lineage.sourcePageBlueprintKey && page.lineage.sourcePageBlueprintKey !== page.pageKey) {
    return "Template";
  }
  return "Main";
}

function getPageTypeFilterValue(page: AdminPageSummary): PageTypeFilter {
  return getPageTypeLabel(page).toLowerCase() as PageTypeFilter;
}

function getNextStepLabel(page: AdminPageSummary) {
  if (!page.isVisible) return "Review visibility";
  if (page.status === "DRAFT" && page.publishedRevisionNumber === null) return "Complete review";
  if (page.status === "DRAFT") return "Continue editing";
  return "View site";
}

function getPrimaryEditorActionLabel(page: AdminPageSummary) {
  return page.editorResolution?.preferredEditor === "LEGACY"
    ? "Open legacy editor"
    : "Open editor";
}

function PageEditorModeBadge({ page }: { page: AdminPageSummary }) {
  if (page.editorResolution?.contentMode === "MIXED") {
    return (
      <span
        className="inline-flex items-center rounded-full border border-amber-300/25 bg-amber-300/10 px-2.5 py-1 text-xs text-amber-50"
        title="This page has both block-based and legacy section content. The block editor is the default. Legacy content remains available for compatibility."
      >
        Mixed content
      </span>
    );
  }

  if (page.editorResolution?.preferredEditor === "LEGACY") {
    return (
      <span className="inline-flex items-center rounded-full border border-amber-300/20 bg-amber-300/10 px-2.5 py-1 text-xs text-amber-50">
        Legacy editor
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full border border-sky-300/20 bg-sky-300/10 px-2.5 py-1 text-xs text-sky-100">
      Block editor
    </span>
  );
}

function getBlockLabel(blockType: string) {
  return blockType
    .replace(/^blit/, "Blit ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[-_]/g, " ")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .join(" ");
}

function getDefaultCreateForm(template?: AdminPageTemplateSummary | null) {
  const title = template?.defaultTitle ?? "";
  return {
    templateKey: template?.templateKey ?? "",
    title,
    slug: title ? slugify(title) : "",
    seoTitle: "",
    seoDescription: "",
    isVisible: true,
    hierarchyRole: "MAIN" as PageHierarchyRole,
    defaultParentPageKey: "",
  };
}

function PageStatusBadge({ page }: { page: AdminPageSummary }) {
  const status = getDisplayStatus(page);
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${statusBadgeClass[status]}`}
    >
      {status}
    </span>
  );
}

function PageTypeBadge({ page }: { page: AdminPageSummary }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-white/60">
      {getPageTypeLabel(page)}
    </span>
  );
}

function upsertPage(pages: AdminPageSummary[], nextPage: AdminPageSummary) {
  const index = pages.findIndex((entry) => entry.id === nextPage.id);
  if (index === -1) {
    return [...pages, nextPage];
  }

  const nextPages = [...pages];
  nextPages[index] = nextPage;
  return nextPages;
}

type PageDetailsDialogProps = {
  page: AdminPageSummary | null;
  pages: AdminPageSummary[];
  open: boolean;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (input: {
    title: string;
    slug: string;
    seoTitle?: string | null;
    seoDescription?: string | null;
    hierarchyRole: PageHierarchyRole;
    defaultParentPageKey?: string | null;
  }) => void;
};

function PageDetailsDialog({
  page,
  pages,
  open,
  saving,
  onOpenChange,
  onSave,
}: PageDetailsDialogProps) {
  const [form, setForm] = useState({
    title: "",
    slug: "",
    seoTitle: "",
    seoDescription: "",
    hierarchyRole: "MAIN" as PageHierarchyRole,
    defaultParentPageKey: "",
  });

  const parentOptions = useMemo(
    () => pages.filter((entry) => entry.id !== page?.id),
    [page?.id, pages]
  );

  useEffect(() => {
    if (!page || !open) {
      return;
    }

    setForm({
      title: page.title,
      slug: page.slug,
      seoTitle: page.seoTitle ?? "",
      seoDescription: page.seoDescription ?? "",
      hierarchyRole: page.hierarchy.role,
      defaultParentPageKey: page.hierarchy.defaultParentPageKey ?? "",
    });
  }, [open, page]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/10 bg-[#0b0b0b] text-white sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit page details</DialogTitle>
          <DialogDescription className="text-white/55">
            Update the page title, slug, and SEO metadata without opening the full editor.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.24em] text-white/45">Title</label>
            <input
              aria-label="Edit page title"
              value={form.title}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  title: event.target.value,
                }))
              }
              className="w-full rounded-2xl border border-white/15 bg-black/40 px-4 py-3 text-white placeholder:text-white/30 focus:border-white focus:outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.24em] text-white/45">Slug</label>
            <input
              aria-label="Edit page slug"
              value={form.slug}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  slug: event.target.value,
                }))
              }
              className="w-full rounded-2xl border border-white/15 bg-black/40 px-4 py-3 text-white placeholder:text-white/30 focus:border-white focus:outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.24em] text-white/45">Page type</label>
            <select
              aria-label="Edit page hierarchy role"
              value={form.hierarchyRole}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  hierarchyRole: event.target.value as PageHierarchyRole,
                  defaultParentPageKey:
                    event.target.value === "INNER" ? prev.defaultParentPageKey : "",
                }))
              }
              className="w-full rounded-2xl border border-white/15 bg-black/40 px-4 py-3 text-white focus:border-white focus:outline-none"
            >
              <option value="MAIN">Main page</option>
              <option value="INNER">Inner page</option>
            </select>
          </div>

          {form.hierarchyRole === "INNER" ? (
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.24em] text-white/45">
                Default parent page
              </label>
              <select
                aria-label="Edit default parent page"
                value={form.defaultParentPageKey}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    defaultParentPageKey: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-white/15 bg-black/40 px-4 py-3 text-white focus:border-white focus:outline-none"
              >
                <option value="">Select a parent page</option>
                {parentOptions.map((entry) => (
                  <option key={entry.pageKey} value={entry.pageKey}>
                    {entry.title} ({entry.slug})
                  </option>
                ))}
              </select>
              <p className="text-sm text-white/45">
                Direct visits will fall back to this breadcrumb path when no flow context is present.
              </p>
            </div>
          ) : null}

          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.24em] text-white/45">SEO title</label>
            <input
              aria-label="Edit page SEO title"
              value={form.seoTitle}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  seoTitle: event.target.value,
                }))
              }
              className="w-full rounded-2xl border border-white/15 bg-black/40 px-4 py-3 text-white placeholder:text-white/30 focus:border-white focus:outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.24em] text-white/45">
              SEO description
            </label>
            <textarea
              aria-label="Edit page SEO description"
              rows={3}
              value={form.seoDescription}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  seoDescription: event.target.value,
                }))
              }
              className="w-full rounded-2xl border border-white/15 bg-black/40 px-4 py-3 text-white placeholder:text-white/30 focus:border-white focus:outline-none"
            />
          </div>
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-full border border-white/15 px-5 py-2 text-xs uppercase tracking-[0.24em] text-white/70 hover:border-white/30 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() =>
              onSave({
                title: form.title.trim(),
                slug: form.slug.trim(),
                seoTitle: form.seoTitle.trim() || null,
                seoDescription: form.seoDescription.trim() || null,
                hierarchyRole: form.hierarchyRole,
                defaultParentPageKey:
                  form.hierarchyRole === "INNER"
                    ? form.defaultParentPageKey || null
                    : null,
              })
            }
            disabled={saving}
            className="rounded-full bg-white px-5 py-2 text-xs uppercase tracking-[0.24em] text-black hover:bg-white/90 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save details"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type DeleteDialogState = {
  pages: AdminPageSummary[];
} | null;

type CreatePageDialogProps = {
  open: boolean;
  saving: boolean;
  pages: AdminPageSummary[];
  templates: AdminPageTemplateSummary[];
  form: ReturnType<typeof getDefaultCreateForm>;
  formError: string | null;
  selectedTemplate: AdminPageTemplateSummary | null;
  onOpenChange: (open: boolean) => void;
  onFormChange: (form: ReturnType<typeof getDefaultCreateForm>) => void;
  onCreate: () => void;
};

function CreatePageDialog({
  open,
  saving,
  pages,
  templates,
  form,
  formError,
  selectedTemplate,
  onOpenChange,
  onFormChange,
  onCreate,
}: CreatePageDialogProps) {
  const parentPages = useMemo(
    () => pages.filter((page) => page.hierarchy.role === "MAIN"),
    [pages]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-[#0b0b0b] text-white sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Create page</DialogTitle>
          <DialogDescription className="text-white/55">
            Choose an approved template and set the page details before opening the editor.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/70">Page template</label>
              <select
                aria-label="Page template"
                value={form.templateKey}
                onChange={(event) => {
                  const template = templates.find(
                    (entry) => entry.templateKey === event.target.value
                  );
                  onFormChange({
                    ...form,
                    templateKey: event.target.value,
                    title: template?.defaultTitle ?? form.title,
                    slug: slugify(template?.defaultTitle ?? form.title),
                  });
                }}
                className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-3 text-sm text-white focus:border-white focus:outline-none"
              >
                <option value="" disabled>
                  Select a page template
                </option>
                {templates.map((template) => (
                  <option key={template.templateKey} value={template.templateKey}>
                    {template.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-white/70">SEO title</label>
              <input
                aria-label="SEO title"
                value={form.seoTitle}
                placeholder="e.g. Engagement Overview | DSGNFI"
                onChange={(event) => onFormChange({ ...form, seoTitle: event.target.value })}
                className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-3 text-sm text-white placeholder:text-white/30 focus:border-white focus:outline-none"
              />
            </div>
          </div>

          {selectedTemplate ? (
            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/10 text-white">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-white">{selectedTemplate.label}</p>
                  <p className="mt-1 text-sm leading-relaxed text-white/55">
                    {selectedTemplate.description}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {selectedTemplate.allowedBlockTypes.slice(0, 6).map((blockType) => (
                  <span
                    key={`${selectedTemplate.templateKey}-${blockType}`}
                    className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-white/45"
                  >
                    {getBlockLabel(blockType)}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/70">Title *</label>
              <input
                aria-label="Title"
                value={form.title}
                placeholder="e.g. Engagement Overview"
                onChange={(event) =>
                  onFormChange({
                    ...form,
                    title: event.target.value,
                    slug: slugify(event.target.value),
                  })
                }
                className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-3 text-sm text-white placeholder:text-white/30 focus:border-white focus:outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-white/70">Slug *</label>
              <div className="flex rounded-lg border border-white/15 bg-black/40 focus-within:border-white">
                <span className="border-r border-white/10 px-3 py-3 text-sm text-white/45">/</span>
                <input
                  aria-label="Slug"
                  value={form.slug.replace(/^\//, "")}
                  placeholder="engagement-overview"
                  onChange={(event) =>
                    onFormChange({
                      ...form,
                      slug: slugify(event.target.value),
                    })
                  }
                  className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none"
                />
              </div>
              <p className="text-xs text-white/40">URL-friendly version of the title.</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/70">Visibility</label>
              <select
                aria-label="Visibility"
                value={form.isVisible ? "visible" : "hidden"}
                onChange={(event) =>
                  onFormChange({ ...form, isVisible: event.target.value === "visible" })
                }
                className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-3 text-sm text-white focus:border-white focus:outline-none"
              >
                <option value="visible">Visible when published</option>
                <option value="hidden">Hidden when published</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-white/70">Parent page</label>
              <select
                aria-label="Parent page"
                value={form.hierarchyRole === "INNER" ? form.defaultParentPageKey : ""}
                onChange={(event) =>
                  onFormChange({
                    ...form,
                    hierarchyRole: event.target.value ? "INNER" : "MAIN",
                    defaultParentPageKey: event.target.value,
                  })
                }
                className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-3 text-sm text-white focus:border-white focus:outline-none"
              >
                <option value="">None (Top level)</option>
                {parentPages.map((page) => (
                  <option key={page.pageKey} value={page.pageKey}>
                    {page.title} ({page.slug})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {formError ? (
            <div className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              {formError}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-lg border border-white/15 px-4 py-2 text-sm text-white/70 hover:border-white/30 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onCreate}
            disabled={saving || templates.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-white/90 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {saving ? "Creating..." : "Create page"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type CreatePagePanelProps = {
  saving: boolean;
  pages: AdminPageSummary[];
  templates: AdminPageTemplateSummary[];
  form: ReturnType<typeof getDefaultCreateForm>;
  formError: string | null;
  selectedTemplate: AdminPageTemplateSummary | null;
  onOpenTemplateDialog: () => void;
  onFormChange: (form: ReturnType<typeof getDefaultCreateForm>) => void;
  onCreate: () => void;
};

function CreatePagePanel({
  saving,
  pages,
  templates,
  form,
  formError,
  selectedTemplate,
  onOpenTemplateDialog,
  onFormChange,
  onCreate,
}: CreatePagePanelProps) {
  const parentPages = useMemo(
    () => pages.filter((page) => page.hierarchy.role === "MAIN"),
    [pages]
  );

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-white/35">Create page</p>
          <h3 className="mt-2 font-semibold text-white">Guided draft setup</h3>
        </div>
        <button
          type="button"
          onClick={onOpenTemplateDialog}
          className="rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-white/65 hover:border-white/30 hover:text-white"
        >
          Choose template
        </button>
      </div>

      <div className="mt-5 rounded-lg border border-white/10 bg-black/25 p-4">
        <p className="text-xs uppercase tracking-[0.18em] text-white/35">Selected template</p>
        {selectedTemplate ? (
          <>
            <p className="mt-2 text-sm font-semibold text-white">{selectedTemplate.label}</p>
            <p className="mt-1 text-xs leading-relaxed text-white/50">
              {selectedTemplate.description}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {selectedTemplate.allowedBlockTypes.slice(0, 4).map((blockType) => (
                <span
                  key={`panel-${selectedTemplate.templateKey}-${blockType}`}
                  className="rounded-full border border-white/10 px-2 py-1 text-[11px] text-white/45"
                >
                  {getBlockLabel(blockType)}
                </span>
              ))}
            </div>
          </>
        ) : (
          <p className="mt-2 text-sm text-white/50">Choose a template to start from.</p>
        )}
      </div>

      <div className="mt-5 space-y-4">
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.18em] text-white/40">Title</label>
          <input
            aria-label="Create panel title"
            value={form.title}
            placeholder="e.g. Services"
            onChange={(event) =>
              onFormChange({
                ...form,
                title: event.target.value,
                slug: slugify(event.target.value),
              })
            }
            className="w-full rounded-lg border border-white/10 bg-black/35 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-white/40 focus:outline-none"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.18em] text-white/40">Slug</label>
          <div className="flex rounded-lg border border-white/10 bg-black/35 focus-within:border-white/40">
            <span className="border-r border-white/10 px-3 py-2.5 text-sm text-white/35">/</span>
            <input
              aria-label="Create panel slug"
              value={form.slug.replace(/^\//, "")}
              placeholder="services"
              onChange={(event) =>
                onFormChange({
                  ...form,
                  slug: slugify(event.target.value),
                })
              }
              className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.18em] text-white/40">SEO title</label>
          <input
            aria-label="Create panel SEO title"
            value={form.seoTitle}
            placeholder="Optional search title"
            onChange={(event) => onFormChange({ ...form, seoTitle: event.target.value })}
            className="w-full rounded-lg border border-white/10 bg-black/35 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-white/40 focus:outline-none"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.18em] text-white/40">Visibility</label>
            <select
              aria-label="Create panel visibility"
              value={form.isVisible ? "visible" : "hidden"}
              onChange={(event) =>
                onFormChange({ ...form, isVisible: event.target.value === "visible" })
              }
              className="w-full rounded-lg border border-white/10 bg-black/35 px-3 py-2.5 text-sm text-white focus:border-white/40 focus:outline-none"
            >
              <option value="visible">Visible</option>
              <option value="hidden">Hidden</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.18em] text-white/40">Parent</label>
            <select
              aria-label="Create panel parent page"
              value={form.hierarchyRole === "INNER" ? form.defaultParentPageKey : ""}
              onChange={(event) =>
                onFormChange({
                  ...form,
                  hierarchyRole: event.target.value ? "INNER" : "MAIN",
                  defaultParentPageKey: event.target.value,
                })
              }
              className="w-full rounded-lg border border-white/10 bg-black/35 px-3 py-2.5 text-sm text-white focus:border-white/40 focus:outline-none"
            >
              <option value="">Top level</option>
              {parentPages.map((page) => (
                <option key={page.pageKey} value={page.pageKey}>
                  {page.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {formError ? (
          <div className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
            {formError}
          </div>
        ) : null}

        <button
          type="button"
          onClick={onCreate}
          disabled={saving || templates.length === 0}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-semibold text-black hover:bg-white/90 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          {saving ? "Creating..." : "Create draft"}
        </button>
      </div>
    </div>
  );
}

export function PagesAdmin() {
  const navigate = useNavigate();
  const { admin } = useAdmin();
  const [pages, setPages] = useState<AdminPageSummary[]>([]);
  const [templates, setTemplates] = useState<AdminPageTemplateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionLoadingPageId, setActionLoadingPageId] = useState<string | null>(null);
  const [bulkActionLoading, setBulkActionLoading] = useState<string | null>(null);
  const [detailsPage, setDetailsPage] = useState<AdminPageSummary | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>(null);
  const [inlineTitlePageId, setInlineTitlePageId] = useState<string | null>(null);
  const [inlineTitleValue, setInlineTitleValue] = useState("");
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<PageStatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<PageTypeFilter>("all");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [form, setForm] = useState(getDefaultCreateForm());
  const [formError, setFormError] = useState<string | null>(null);

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.templateKey === form.templateKey) ?? null,
    [form.templateKey, templates]
  );

  const selectedPages = useMemo(
    () => pages.filter((page) => selectedPageIds.includes(page.id)),
    [pages, selectedPageIds]
  );

  const canBulkDelete =
    selectedPages.length > 0 && selectedPages.every((page) => page.canDelete);
  const canBulkHide =
    selectedPages.length > 0 && selectedPages.every((page) => page.pageKey !== "home");
  const canBulkShow = selectedPages.length > 0;

  const pageStats = useMemo(() => {
    const total = pages.length;
    const published = pages.filter((page) => page.status === "PUBLISHED").length;
    const drafts = pages.filter((page) => page.status === "DRAFT").length;
    const templatePages = pages.filter((page) => page.lineage.isTracked).length;
    const needsReview = pages.filter(
      (page) => page.status === "DRAFT" && page.publishedRevisionNumber === null
    ).length;

    return { total, published, drafts, templatePages, needsReview };
  }, [pages]);

  const filteredPages = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return pages
      .filter((page) => {
        if (!query) return true;
        return [page.title, page.slug, page.pageKey]
          .join(" ")
          .toLowerCase()
          .includes(query);
      })
      .filter((page) =>
        statusFilter === "all"
          ? true
          : getDisplayStatus(page).toLowerCase() === statusFilter
      )
      .filter((page) =>
        typeFilter === "all" ? true : getPageTypeFilterValue(page) === typeFilter
      )
      .sort((a, b) => {
        const delta = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        return sortDirection === "desc" ? delta : -delta;
      });
  }, [pages, searchTerm, sortDirection, statusFilter, typeFilter]);

  const totalFilteredPages = filteredPages.length;
  const pageCount = Math.max(1, Math.ceil(totalFilteredPages / rowsPerPage));
  const clampedCurrentPage = Math.min(currentPage, pageCount);
  const pageStart = (clampedCurrentPage - 1) * rowsPerPage;
  const paginatedPages = filteredPages.slice(pageStart, pageStart + rowsPerPage);
  const allSelected =
    paginatedPages.length > 0 &&
    paginatedPages.every((page) => selectedPageIds.includes(page.id));

  useEffect(() => {
    setCurrentPage(1);
  }, [rowsPerPage, searchTerm, statusFilter, typeFilter]);

  useEffect(() => {
    if (currentPage > pageCount) {
      setCurrentPage(pageCount);
    }
  }, [currentPage, pageCount]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [nextPages, nextTemplates] = await Promise.all([
          listAdminPages(),
          listAdminPageTemplates(),
        ]);

        if (cancelled) {
          return;
        }

        setPages(nextPages);
        setTemplates(nextTemplates);
        setSelectedPageIds((current) =>
          current.filter((pageId) => nextPages.some((page) => page.id === pageId))
        );
        setForm((prev) => ({
          ...getDefaultCreateForm(nextTemplates[0]),
          ...prev,
          templateKey: prev.templateKey || nextTemplates[0]?.templateKey || "",
          title: prev.title || nextTemplates[0]?.defaultTitle || "",
          slug: prev.slug || slugify(nextTemplates[0]?.defaultTitle || "new-page"),
        }));
      } catch (err) {
        if (!cancelled) {
          if (err instanceof ApiError && err.status === 401) {
            navigate("/admin/login", { replace: true });
            return;
          }
          toast.error(err instanceof Error ? err.message : "Failed to load pages.");
        }
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
  }, [admin?.currentSite?.id, navigate]);

  useEffect(() => {
    if (!selectedTemplate) {
      return;
    }

    setForm((prev) => {
      if (prev.title && prev.templateKey === selectedTemplate.templateKey) {
        return prev;
      }

      return {
        ...prev,
        title: prev.title || selectedTemplate.defaultTitle,
        slug: prev.slug || slugify(prev.title || selectedTemplate.defaultTitle),
      };
    });
  }, [selectedTemplate]);

  const handleCreate = async () => {
    if (!form.templateKey || !form.title.trim() || !form.slug.trim()) {
      setFormError("Template, title, and slug are required.");
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      const page = await createAdminPage({
        templateKey: form.templateKey,
        title: form.title.trim(),
        slug: form.slug.trim(),
        seoTitle: form.seoTitle.trim() || null,
        seoDescription: form.seoDescription.trim() || null,
        isVisible: form.isVisible,
        hierarchyRole: form.hierarchyRole,
        defaultParentPageKey:
          form.hierarchyRole === "INNER" ? form.defaultParentPageKey || null : null,
      });

      toast.success("Page created.");
      setCreateDialogOpen(false);
      navigate(getPageEditorPath(page));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        navigate("/admin/login", { replace: true });
        return;
      }

      setFormError(err instanceof Error ? err.message : "Failed to create page.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDetails = async (input: {
    title: string;
    slug: string;
    seoTitle?: string | null;
    seoDescription?: string | null;
    hierarchyRole: PageHierarchyRole;
    defaultParentPageKey?: string | null;
  }) => {
    if (!detailsPage) {
      return;
    }

    setActionLoadingPageId(detailsPage.id);
    try {
      const updated = await updateAdminPageMeta(detailsPage.pageKey, input);
      setPages((current) => upsertPage(current, updated));
      setDetailsPage(null);
      if (inlineTitlePageId === updated.id) {
        setInlineTitlePageId(null);
      }
      toast.success("Page details updated.");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        navigate("/admin/login", { replace: true });
        return;
      }
      toast.error(err instanceof Error ? err.message : "Failed to update page details.");
    } finally {
      setActionLoadingPageId(null);
    }
  };

  const handleDuplicatePage = async (page: AdminPageSummary) => {
    setActionLoadingPageId(page.id);
    try {
      const duplicated = await duplicateAdminPage(page.pageKey);
      setPages((current) => [...current, duplicated]);
      toast.success("Page duplicated.");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        navigate("/admin/login", { replace: true });
        return;
      }
      toast.error(err instanceof Error ? err.message : "Failed to duplicate page.");
    } finally {
      setActionLoadingPageId(null);
    }
  };

  const handleToggleVisibility = async (page: AdminPageSummary) => {
    setActionLoadingPageId(page.id);
    try {
      const updated = await setAdminPageVisibility(page.pageKey, !page.isVisible);
      setPages((current) => upsertPage(current, updated));
      toast.success(updated.isVisible ? "Page is visible on the site." : "Page hidden from the site.");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        navigate("/admin/login", { replace: true });
        return;
      }
      toast.error(err instanceof Error ? err.message : "Failed to update page visibility.");
    } finally {
      setActionLoadingPageId(null);
    }
  };

  const handleStartInlineTitle = (page: AdminPageSummary) => {
    setInlineTitlePageId(page.id);
    setInlineTitleValue(page.title);
  };

  const handleCancelInlineTitle = () => {
    setInlineTitlePageId(null);
    setInlineTitleValue("");
  };

  const handleSaveInlineTitle = async (page: AdminPageSummary) => {
    const nextTitle = inlineTitleValue.trim();
    if (!nextTitle || nextTitle === page.title) {
      handleCancelInlineTitle();
      return;
    }

    setActionLoadingPageId(page.id);
    try {
      const updated = await renameAdminPageTitle(page.pageKey, nextTitle);
      setPages((current) => upsertPage(current, updated));
      setInlineTitlePageId(null);
      setInlineTitleValue("");
      toast.success("Page title updated.");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        navigate("/admin/login", { replace: true });
        return;
      }
      toast.error(err instanceof Error ? err.message : "Failed to update page title.");
    } finally {
      setActionLoadingPageId(null);
    }
  };

  const handleInlineTitleKeyDown = (
    event: KeyboardEvent<HTMLInputElement>,
    page: AdminPageSummary
  ) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void handleSaveInlineTitle(page);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      handleCancelInlineTitle();
    }
  };

  const toggleSelection = (pageId: string, checked: boolean) => {
    setSelectedPageIds((current) =>
      checked ? [...new Set([...current, pageId])] : current.filter((id) => id !== pageId)
    );
  };

  const handleSelectAll = (checked: boolean) => {
    const visibleIds = paginatedPages.map((page) => page.id);
    setSelectedPageIds((current) =>
      checked
        ? [...new Set([...current, ...visibleIds])]
        : current.filter((id) => !visibleIds.includes(id))
    );
  };

  const handleBulkVisibility = async (isVisible: boolean) => {
    if (selectedPages.length === 0) {
      return;
    }

    const targetPages = selectedPages.filter(
      (page) => page.isVisible !== isVisible && (isVisible || page.pageKey !== "home")
    );

    if (targetPages.length === 0) {
      toast.message(isVisible ? "Selected pages are already visible." : "Nothing to archive.");
      return;
    }

    setBulkActionLoading(isVisible ? "show" : "hide");
    const updatedPages: AdminPageSummary[] = [];
    const failedPages: string[] = [];

    for (const page of targetPages) {
      try {
        const updated = await setAdminPageVisibility(page.pageKey, isVisible);
        updatedPages.push(updated);
      } catch (err) {
        failedPages.push(page.title);
      }
    }

    if (updatedPages.length > 0) {
      setPages((current) => {
        let nextPages = current;
        for (const page of updatedPages) {
          nextPages = upsertPage(nextPages, page);
        }
        return nextPages;
      });
      toast.success(
        isVisible
          ? `${updatedPages.length} page${updatedPages.length === 1 ? "" : "s"} restored to the site.`
          : `${updatedPages.length} page${updatedPages.length === 1 ? "" : "s"} archived from the site.`
      );
    }

    if (failedPages.length > 0) {
      toast.error(`Could not update ${failedPages.join(", ")}.`);
    }

    setBulkActionLoading(null);
  };

  const confirmDeletePages = async () => {
    const pagesToDelete = deleteDialog?.pages ?? [];
    if (pagesToDelete.length === 0) {
      return;
    }

    setBulkActionLoading("delete");
    const deletedIds: string[] = [];
    const failedPages: string[] = [];

    for (const page of pagesToDelete) {
      try {
        await deleteAdminPage(page.pageKey);
        deletedIds.push(page.id);
      } catch (err) {
        failedPages.push(page.title);
      }
    }

    if (deletedIds.length > 0) {
      setPages((current) => current.filter((page) => !deletedIds.includes(page.id)));
      setSelectedPageIds((current) => current.filter((pageId) => !deletedIds.includes(pageId)));
      toast.success(
        `${deletedIds.length} page${deletedIds.length === 1 ? "" : "s"} deleted.`
      );
    }

    if (failedPages.length > 0) {
      toast.error(`Could not delete ${failedPages.join(", ")}.`);
    }

    setDeleteDialog(null);
    setBulkActionLoading(null);
  };

  const openDeleteDialogForPage = (page: AdminPageSummary) => {
    if (!page.canDelete) {
      toast.error("This page is required by the current site template and cannot be deleted.");
      return;
    }

    setDeleteDialog({ pages: [page] });
  };

  const openBulkDeleteDialog = () => {
    if (!canBulkDelete) {
      toast.error("Only removable pages can be deleted.");
      return;
    }

    setDeleteDialog({ pages: selectedPages });
  };

  const healthGradient = pageStats.total
    ? `conic-gradient(#4ade80 0 ${(pageStats.published / pageStats.total) * 100}%, #f59e0b ${(pageStats.published / pageStats.total) * 100}% ${((pageStats.published + pageStats.drafts) / pageStats.total) * 100}%, #facc15 ${((pageStats.published + pageStats.drafts) / pageStats.total) * 100}% 100%)`
    : "conic-gradient(rgba(255,255,255,0.18) 0 100%)";

  return (
    <>
      <div className="w-full px-6 py-8 text-white">
        <div className="mx-auto max-w-[1600px] space-y-6">
          <header className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-white">Pages</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/55">
                Manage current site pages, edit content, control visibility, and create new pages
                from approved templates.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white/65">
                Tenant <span className="ml-2 font-medium text-white">{admin?.currentTenant?.name ?? "DSGNFI"}</span>
              </span>
              <span className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white/65">
                Current Site <span className="ml-2 font-medium text-white">{admin?.currentSite?.name ?? "Main Site"}</span>
              </span>
              <span className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white/65">
                Role <span className="ml-2 font-medium text-white">{admin?.currentRole ?? "Admin"}</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setForm((current) =>
                    current.templateKey ? current : getDefaultCreateForm(templates[0])
                  );
                  setFormError(null);
                  setCreateDialogOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-black hover:bg-white/90"
              >
                <Plus className="h-4 w-4" />
                Create page
              </button>
            </div>
          </header>

          <section className="grid gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-3 md:grid-cols-5">
            {[
              { label: "Total pages", value: pageStats.total, icon: FileText, tone: "text-white/70 bg-white/10" },
              { label: "Published", value: pageStats.published, icon: CheckCircle2, tone: "text-emerald-200 bg-emerald-400/15" },
              { label: "Drafts", value: pageStats.drafts, icon: PencilLine, tone: "text-orange-200 bg-orange-400/15" },
              { label: "Template pages", value: pageStats.templatePages, icon: Grid2X2, tone: "text-violet-200 bg-violet-400/15" },
              { label: "Needs review", value: pageStats.needsReview, icon: CircleDashed, tone: "text-yellow-200 bg-yellow-400/15" },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="rounded-lg border border-white/10 bg-black/25 p-4">
                  <div className="flex items-center gap-3">
                    <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${stat.tone}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-2xl font-semibold text-white">{stat.value}</p>
                      <p className="text-xs text-white/50">{stat.label}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </section>

          <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="rounded-lg border border-white/10 bg-white/[0.04]">
              <div className="border-b border-white/10 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-white">Current site pages</h2>
                    <p className="mt-1 text-sm text-white/45">
                      {totalFilteredPages} page{totalFilteredPages === 1 ? "" : "s"} in the current view.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <div className="relative min-w-[240px]">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                      <input
                        aria-label="Search pages"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder="Search pages..."
                        className="w-full rounded-lg border border-white/10 bg-black/35 py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-white/35 focus:border-white/40 focus:outline-none"
                      />
                    </div>
                    <select
                      aria-label="Filter status"
                      value={statusFilter}
                      onChange={(event) => setStatusFilter(event.target.value as PageStatusFilter)}
                      className="rounded-lg border border-white/10 bg-black/35 px-3 py-2.5 text-sm text-white focus:border-white/40 focus:outline-none"
                    >
                      <option value="all">All status</option>
                      <option value="published">Published</option>
                      <option value="draft">Draft</option>
                      <option value="inherited">Inherited</option>
                      <option value="modified">Modified</option>
                      <option value="untracked">Untracked</option>
                      <option value="archived">Archived</option>
                    </select>
                    <select
                      aria-label="Filter type"
                      value={typeFilter}
                      onChange={(event) => setTypeFilter(event.target.value as PageTypeFilter)}
                      className="rounded-lg border border-white/10 bg-black/35 px-3 py-2.5 text-sm text-white focus:border-white/40 focus:outline-none"
                    >
                      <option value="all">All types</option>
                      <option value="main">Main</option>
                      <option value="template">Template</option>
                      <option value="custom">Custom</option>
                      <option value="inner">Inner</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => setSortDirection((current) => (current === "desc" ? "asc" : "desc"))}
                      className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/35 px-3 py-2.5 text-sm text-white/70 hover:border-white/30 hover:text-white"
                    >
                      <ArrowUpDown className="h-4 w-4" />
                      Last updated
                    </button>
                    <button
                      type="button"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-black/35 text-white/60 hover:border-white/30 hover:text-white"
                      aria-label="Page table settings"
                    >
                      <SlidersHorizontal className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {selectedPages.length > 0 ? (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/35 px-4 py-3">
                    <p className="text-sm text-white/70">
                      {selectedPages.length} page{selectedPages.length === 1 ? "" : "s"} selected
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void handleBulkVisibility(true)}
                        disabled={!canBulkShow || bulkActionLoading !== null}
                        className="rounded-lg border border-white/15 px-3 py-2 text-sm text-white/65 hover:border-white/35 hover:text-white disabled:opacity-40"
                      >
                        {bulkActionLoading === "show" ? "Restoring..." : "Show selected"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleBulkVisibility(false)}
                        disabled={!canBulkHide || bulkActionLoading !== null}
                        className="rounded-lg border border-white/15 px-3 py-2 text-sm text-white/65 hover:border-white/35 hover:text-white disabled:opacity-40"
                      >
                        {bulkActionLoading === "hide" ? "Archiving..." : "Archive selected"}
                      </button>
                      <button
                        type="button"
                        onClick={openBulkDeleteDialog}
                        disabled={!canBulkDelete || bulkActionLoading !== null}
                        className="rounded-lg border border-rose-400/25 px-3 py-2 text-sm text-rose-100 hover:border-rose-300/50 disabled:opacity-40"
                      >
                        Delete selected
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedPageIds([])}
                        className="rounded-lg border border-white/10 px-3 py-2 text-sm text-white/45 hover:border-white/30 hover:text-white"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-left text-sm">
                  <thead className="border-b border-white/10 text-xs text-white/45">
                    <tr>
                      <th className="w-12 px-5 py-3">
                        <Checkbox
                          checked={allSelected}
                          onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
                          aria-label="Select all pages"
                          className="border-white/20 bg-black/40 data-[state=checked]:border-white data-[state=checked]:bg-white data-[state=checked]:text-black"
                        />
                      </th>
                      <th className="px-3 py-3 font-medium">Page</th>
                      <th className="px-3 py-3 font-medium">Status</th>
                      <th className="px-3 py-3 font-medium">Type</th>
                      <th className="px-3 py-3 font-medium">
                        <span className="inline-flex items-center gap-1">
                          Last updated <ArrowDown className="h-3 w-3" />
                        </span>
                      </th>
                      <th className="px-3 py-3 font-medium">Next step</th>
                      <th className="px-5 py-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-10 text-center text-white/50">
                          Loading pages...
                        </td>
                      </tr>
                    ) : paginatedPages.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-10 text-center text-white/50">
                          No pages match the current filters.
                        </td>
                      </tr>
                    ) : (
                      paginatedPages.map((page) => {
                        const isSelected = selectedPageIds.includes(page.id);
                        const canViewLivePage =
                          page.isVisible && page.publishedRevisionNumber !== null;
                        const isInlineEditing = inlineTitlePageId === page.id;
                        const isBusy =
                          actionLoadingPageId === page.id || bulkActionLoading !== null;

                        return (
                          <tr
                            key={page.id}
                            className={`transition hover:bg-white/[0.035] ${
                              isSelected ? "bg-white/[0.06]" : ""
                            }`}
                          >
                            <td className="px-5 py-3">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={(checked) =>
                                  toggleSelection(page.id, Boolean(checked))
                                }
                                aria-label={`Select ${page.title}`}
                                className="border-white/20 bg-black/40 data-[state=checked]:border-white data-[state=checked]:bg-white data-[state=checked]:text-black"
                              />
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-3">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] text-white/70">
                                  {page.slug === "/" ? <Home className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                                </span>
                                <div className="min-w-0">
                                  {isInlineEditing ? (
                                    <div className="flex items-center gap-2">
                                      <input
                                        aria-label={`Inline title for ${page.title}`}
                                        autoFocus
                                        value={inlineTitleValue}
                                        onChange={(event) => setInlineTitleValue(event.target.value)}
                                        onKeyDown={(event) => handleInlineTitleKeyDown(event, page)}
                                        className="w-48 rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white focus:border-white focus:outline-none"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => void handleSaveInlineTitle(page)}
                                        disabled={isBusy}
                                        className="rounded-lg border border-emerald-300/20 p-2 text-emerald-100 hover:border-emerald-200/40 hover:text-white disabled:opacity-40"
                                        aria-label={`Save title for ${page.title}`}
                                      >
                                        <Check className="h-4 w-4" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={handleCancelInlineTitle}
                                        disabled={isBusy}
                                        className="rounded-lg border border-white/15 p-2 text-white/55 hover:border-white/35 hover:text-white disabled:opacity-40"
                                        aria-label={`Cancel title edit for ${page.title}`}
                                      >
                                        <X className="h-4 w-4" />
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleStartInlineTitle(page)}
                                      disabled={isBusy}
                                      className="text-left font-medium text-white hover:text-white/80 disabled:opacity-40"
                                      aria-label={`Rename ${page.title}`}
                                    >
                                      {page.title}
                                    </button>
                                  )}
                                  <p className="mt-1 truncate text-xs text-white/45">{page.slug}</p>
                                  <div className="mt-2 flex flex-wrap items-center gap-2">
                                    <PageEditorModeBadge page={page} />
                                    <PageTypeBadge page={page} />
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <PageStatusBadge page={page} />
                            </td>
                            <td className="px-3 py-3 text-sm text-white/55">
                              {getPageTypeLabel(page)}
                            </td>
                            <td className="px-3 py-3 text-white/60">
                              <div>{formatShortDate(page.updatedAt)}</div>
                              <div className="text-xs text-white/35">by Admin</div>
                            </td>
                            <td className="px-3 py-3">
                              {canViewLivePage && getNextStepLabel(page) === "View site" ? (
                                <Link
                                  to={getPublicPagePath(page, admin?.currentSite?.slug)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-sm text-white/70 hover:text-white"
                                >
                                  View site <ExternalLink className="h-3.5 w-3.5" />
                                </Link>
                              ) : (
                                <span className="text-sm text-white/55">{getNextStepLabel(page)}</span>
                              )}
                            </td>
                            <td className="px-5 py-3">
                              <div className="flex items-center justify-end gap-2">
                                <Link
                                  to={getPageEditorPath(page)}
                                  className="rounded-lg border border-white/10 px-3 py-2 text-sm text-white/75 hover:border-white/30 hover:text-white"
                                >
                                  {getPrimaryEditorActionLabel(page)}
                                </Link>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button
                                      type="button"
                                      disabled={isBusy}
                                      className="rounded-lg border border-white/10 p-2 text-white/60 hover:border-white/30 hover:text-white disabled:opacity-40"
                                      aria-label={`Page actions for ${page.title}`}
                                    >
                                      <MoreHorizontal className="h-4 w-4" />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent
                                    align="end"
                                    className="border-white/10 bg-[#111111] text-white"
                                  >
                                    <DropdownMenuItem
                                      onClick={() => handleStartInlineTitle(page)}
                                      className="focus:bg-white/10 focus:text-white"
                                    >
                                      <PencilLine className="h-4 w-4" />
                                      Rename
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => setDetailsPage(page)}
                                      className="focus:bg-white/10 focus:text-white"
                                    >
                                      <FileText className="h-4 w-4" />
                                      Edit details
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => void handleDuplicatePage(page)}
                                      className="focus:bg-white/10 focus:text-white"
                                    >
                                      <Copy className="h-4 w-4" />
                                      Duplicate
                                    </DropdownMenuItem>
                                    {page.editorResolution?.legacyEditorRoute ? (
                                      <DropdownMenuItem asChild className="focus:bg-white/10 focus:text-white">
                                        <Link to={page.editorResolution.legacyEditorRoute}>
                                          <ExternalLink className="h-4 w-4" />
                                          Open legacy editor
                                        </Link>
                                      </DropdownMenuItem>
                                    ) : null}
                                    <DropdownMenuItem
                                      disabled={page.pageKey === "home"}
                                      onClick={() => void handleToggleVisibility(page)}
                                      className="focus:bg-white/10 focus:text-white disabled:opacity-40"
                                    >
                                      {page.isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                      {page.isVisible ? "Hide page" : "Show page"}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      disabled={!page.canDelete}
                                      onClick={() => openDeleteDialogForPage(page)}
                                      className="focus:bg-rose-500/10 focus:text-rose-100 disabled:opacity-40"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-3 border-t border-white/10 px-5 py-4 text-sm text-white/50 sm:flex-row sm:items-center sm:justify-between">
                <span>{selectedPages.length} selected</span>
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2">
                    Rows per page:
                    <select
                      aria-label="Rows per page"
                      value={rowsPerPage}
                      onChange={(event) => setRowsPerPage(Number(event.target.value))}
                      className="rounded-lg border border-white/10 bg-black/35 px-2 py-1.5 text-white focus:border-white/40 focus:outline-none"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                    </select>
                  </label>
                  <span>
                    {totalFilteredPages === 0 ? "0" : pageStart + 1}-
                    {Math.min(pageStart + rowsPerPage, totalFilteredPages)} of {totalFilteredPages}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                      disabled={clampedCurrentPage <= 1}
                      className="rounded-lg border border-white/10 p-2 text-white/60 hover:border-white/30 hover:text-white disabled:opacity-30"
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))}
                      disabled={clampedCurrentPage >= pageCount}
                      className="rounded-lg border border-white/10 p-2 text-white/60 hover:border-white/30 hover:text-white disabled:opacity-30"
                      aria-label="Next page"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <aside className="space-y-4">
              <CreatePagePanel
                saving={saving}
                pages={pages}
                templates={templates}
                form={form}
                formError={formError}
                selectedTemplate={selectedTemplate}
                onOpenTemplateDialog={() => {
                  setFormError(null);
                  setCreateDialogOpen(true);
                }}
                onFormChange={setForm}
                onCreate={() => void handleCreate()}
              />

              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-yellow-400/15 text-yellow-200">
                    <Lightbulb className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="font-semibold text-white">Guidance</h3>
                    <p className="mt-2 text-sm leading-relaxed text-white/55">
                      Template-approved pages keep structure consistent. Use the block editor to
                      customize content after creation.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold text-white">Page health</h3>
                  <Gauge className="h-4 w-4 text-white/40" />
                </div>
                <div className="mt-5 flex items-center gap-5">
                  <div
                    className="relative h-28 w-28 shrink-0 rounded-full"
                    style={{ background: healthGradient }}
                  >
                    <div className="absolute inset-4 flex flex-col items-center justify-center rounded-full bg-[#0b0b0b]">
                      <span className="text-xl font-semibold text-white">{pageStats.total}</span>
                      <span className="text-xs text-white/45">Total</span>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p className="flex items-center gap-2 text-white/65">
                      <span className="h-2.5 w-2.5 rounded-sm bg-emerald-400" />
                      {pageStats.published} Published
                    </p>
                    <p className="flex items-center gap-2 text-white/65">
                      <span className="h-2.5 w-2.5 rounded-sm bg-orange-400" />
                      {pageStats.drafts} Drafts
                    </p>
                    <p className="flex items-center gap-2 text-white/65">
                      <span className="h-2.5 w-2.5 rounded-sm bg-yellow-300" />
                      {pageStats.needsReview} Needs review
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("all");
                    setTypeFilter("all");
                  }}
                  className="mt-5 inline-flex items-center gap-2 text-sm text-white/65 hover:text-white"
                >
                  View all pages <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </aside>
          </section>
        </div>
      </div>

      <CreatePageDialog
        open={createDialogOpen}
        saving={saving}
        pages={pages}
        templates={templates}
        form={form}
        formError={formError}
        selectedTemplate={selectedTemplate}
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) {
            setFormError(null);
          }
        }}
        onFormChange={setForm}
        onCreate={() => void handleCreate()}
      />

      <PageDetailsDialog
        page={detailsPage}
        pages={pages}
        open={Boolean(detailsPage)}
        saving={Boolean(detailsPage && actionLoadingPageId === detailsPage.id)}
        onOpenChange={(open) => {
          if (!open) {
            setDetailsPage(null);
          }
        }}
        onSave={(input) => void handleSaveDetails(input)}
      />

      <AlertDialog open={Boolean(deleteDialog)} onOpenChange={(open) => !open && setDeleteDialog(null)}>
        <AlertDialogContent className="border-white/10 bg-[#0b0b0b] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteDialog?.pages.length === 1 ? "Delete page" : "Delete selected pages"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/55">
              {deleteDialog?.pages.length === 1
                ? `This will permanently remove ${deleteDialog.pages[0]?.title} and its draft/published revisions.`
                : `This will permanently remove ${deleteDialog?.pages.length ?? 0} selected pages and their revisions.`}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {deleteDialog?.pages.length ? (
            <div className="rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/65">
              {deleteDialog.pages.map((page) => page.title).join(", ")}
            </div>
          ) : null}

          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/15 bg-transparent text-white/70 hover:bg-white/5 hover:text-white">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void confirmDeletePages();
              }}
              className="bg-rose-500 text-white hover:bg-rose-400"
            >
              {bulkActionLoading === "delete" ? "Deleting..." : "Delete permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

}

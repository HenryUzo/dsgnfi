import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { toast } from "sonner";

import { useAdmin } from "../../auth/useAdmin";

import { ApiError } from "../../lib/api";
import { EditorStatusBar } from "../../components/admin/EditorStatusBar";
import { getTemplateContent, type ProjectTemplate } from "../../cms/projectTemplates";
import { normalizeProjectContent } from "../../components/work/blockTypes";
import {
  createWorkProject,
  duplicateWorkProject,
  createWorkTag,
  deleteWorkTag,
  getWorkMeta,
  getWorkProject,
  listWorkProjects,
  listWorkTags,
  publishWorkMeta,
  publishWorkProject,
  saveWorkMetaDraft,
  updateWorkProject,
  updateWorkTag,
  type PublishStatus,
  type WorkProject,
  type WorkTag,
} from "../../services/workAdmin";
import { PageMetaTab } from "../../components/admin/work/PageMetaTab";
import { ProjectEditor, type ProjectDraftForm } from "../../components/admin/work/ProjectEditor";
import { TagsTab } from "../../components/admin/work/TagsTab";
import { TemplatePickerModal } from "../../components/admin/work/TemplatePickerModal";
import { WorkTabs, type WorkAdminTab } from "../../components/admin/work/WorkTabs";

const metaSchema = z.object({
  title: z.string().min(1, "Title is required."),
  subtitle: z.string().min(1, "Subtitle is required."),
});

const projectSchema = z.object({
  title: z.string().min(1, "Project title is required."),
  slug: z
    .string()
    .min(1, "Slug is required.")
    .regex(/^[a-z0-9-]+$/, "Slug must use lowercase letters, numbers, and hyphens."),
  excerpt: z.string().min(1, "Excerpt is required."),
  coverImage: z.string().min(1, "Cover image URL is required."),
  tagIds: z.array(z.string()).min(1, "Select at least one tag."),
});

function makeEmptyProjectForm(): ProjectDraftForm {
  return {
    id: null,
    templateId: "",
    title: "",
    slug: "",
    excerpt: "",
    coverImage: "",
    tagIds: [],
    draftContent: {},
    status: "DRAFT",
    publishedAt: null,
  };
}

function mapProjectToForm(project: WorkProject): ProjectDraftForm {
  const normalized = normalizeProjectContent(project.draftContent);
  const templateContent = getTemplateContent(project.templateId);
  const draftContent =
    normalized.blocks.length > 0
      ? { blocks: normalized.blocks }
      : templateContent ?? { blocks: [] };

  return {
    id: project.id,
    templateId: project.templateId,
    title: project.title,
    slug: project.slug,
    excerpt: project.excerpt,
    coverImage: project.coverImage,
    tagIds: project.tagIds,
    draftContent,
    status: project.status,
    publishedAt: project.publishedAt,
  };
}

function getWorkMutationMessage(
  err: unknown,
  fallback: string,
  options?: {
    conflict?: string;
    notFound?: string;
    forbidden?: string;
  }
) {
  if (err instanceof ApiError) {
    if (err.status === 409) {
      return options?.conflict ?? err.message;
    }
    if (err.status === 404) {
      return options?.notFound ?? err.message;
    }
    if (err.status === 403) {
      return options?.forbidden ?? err.message;
    }
  }

  return err instanceof Error ? err.message : fallback;
}

export function WorkAdmin() {
  const navigate = useNavigate();
  const { admin } = useAdmin();
  const [activeTab, setActiveTab] = useState<WorkAdminTab>("page");

  const [metaValue, setMetaValue] = useState({ title: "", subtitle: "" });
  const [metaStatus, setMetaStatus] = useState<PublishStatus>("DRAFT");
  const [metaPublishedAt, setMetaPublishedAt] = useState<string | null>(null);
  const [metaLoading, setMetaLoading] = useState(true);
  const [metaSaving, setMetaSaving] = useState(false);
  const [metaPublishing, setMetaPublishing] = useState(false);
  const [metaError, setMetaError] = useState<string | null>(null);

  const [tags, setTags] = useState<WorkTag[]>([]);
  const [tagsLoading, setTagsLoading] = useState(true);
  const [tagsError, setTagsError] = useState<string | null>(null);
  const [tagsBusyId, setTagsBusyId] = useState<string | null>(null);
  const [tagsCreating, setTagsCreating] = useState(false);

  const [projects, setProjects] = useState<WorkProject[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectForm, setProjectForm] = useState<ProjectDraftForm>(makeEmptyProjectForm);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [projectSaving, setProjectSaving] = useState(false);
  const [projectPublishing, setProjectPublishing] = useState(false);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);

  const hasTags = tags.length > 0;
  const handleAuthError = (err: unknown) => {
    if (err instanceof ApiError && err.status === 401) {
      navigate("/admin/login", { replace: true });
      return true;
    }
    return false;
  };

  const loadMeta = async () => {
    setMetaLoading(true);
    setMetaError(null);
    try {
      const meta = await getWorkMeta();
      setMetaValue({ title: meta.title, subtitle: meta.subtitle });
      setMetaStatus(meta.status);
      setMetaPublishedAt(meta.publishedAt);
    } catch (err) {
      if (handleAuthError(err)) return;
      const message = err instanceof Error ? err.message : "Failed to load meta.";
      setMetaError(message);
    } finally {
      setMetaLoading(false);
    }
  };

  const loadTags = async () => {
    setTagsLoading(true);
    setTagsError(null);
    try {
      const nextTags = await listWorkTags();
      setTags(nextTags);
      setProjectForm((prev) => ({
        ...prev,
        tagIds: prev.tagIds.filter((id) => nextTags.some((tag) => tag.id === id)),
      }));
    } catch (err) {
      if (handleAuthError(err)) return;
      const message = err instanceof Error ? err.message : "Failed to load tags.";
      setTagsError(message);
    } finally {
      setTagsLoading(false);
    }
  };

  const loadProjects = async () => {
    setProjectsLoading(true);
    setProjectError(null);
    try {
      const nextProjects = await listWorkProjects();
      setProjects(nextProjects);
    } catch (err) {
      if (handleAuthError(err)) return;
      const message = err instanceof Error ? err.message : "Failed to load projects.";
      setProjectError(message);
    } finally {
      setProjectsLoading(false);
    }
  };

  useEffect(() => {
    setMetaError(null);
    setTagsError(null);
    setProjectError(null);
    setTagsBusyId(null);
    setTemplatePickerOpen(false);
    setProjectForm(makeEmptyProjectForm());
    void loadMeta();
    void loadTags();
    void loadProjects();
  }, [admin?.currentSite?.id]);

  const persistMetaDraft = async () => {
    const parsed = metaSchema.safeParse(metaValue);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Invalid page meta.";
      setMetaError(message);
      toast.error(message);
      return false;
    }

    setMetaSaving(true);
    setMetaError(null);

    try {
      await saveWorkMetaDraft(parsed.data);
      toast.success("Work page draft saved.");
      setMetaStatus("DRAFT");
      await loadMeta();
      return true;
    } catch (err) {
      if (handleAuthError(err)) return;
      const message = err instanceof Error ? err.message : "Failed to save page meta.";
      setMetaError(message);
      toast.error(message);
      return false;
    } finally {
      setMetaSaving(false);
    }
  };

  const handleMetaSave = async () => {
    await persistMetaDraft();
  };

  const handleMetaPublish = async () => {
    setMetaPublishing(true);
    setMetaError(null);
    try {
      const saved = await persistMetaDraft();
      if (!saved) {
        return;
      }
      await publishWorkMeta();
      toast.success("Work page meta published.");
      await loadMeta();
    } catch (err) {
      if (handleAuthError(err)) return;
      const message = err instanceof Error ? err.message : "Failed to publish page meta.";
      setMetaError(message);
      toast.error(message);
    } finally {
      setMetaPublishing(false);
    }
  };

  const handleCreateTag = async (input: { name: string; slug: string }) => {
    setTagsCreating(true);
    setTagsError(null);
    try {
      await createWorkTag(input);
      toast.success("Tag created.");
      await loadTags();
    } catch (err) {
      if (handleAuthError(err)) return;
      const message = getWorkMutationMessage(err, "Failed to create tag.", {
        conflict: "A tag with this slug already exists for the current site.",
      });
      setTagsError(message);
      toast.error(message);
    } finally {
      setTagsCreating(false);
    }
  };

  const handleUpdateTag = async (
    id: string,
    input: { name: string; slug: string }
  ) => {
    setTagsBusyId(id);
    setTagsError(null);
    try {
      await updateWorkTag(id, input);
      toast.success("Tag updated.");
      await loadTags();
    } catch (err) {
      if (handleAuthError(err)) return;
      const message = getWorkMutationMessage(err, "Failed to update tag.", {
        conflict: "A tag with this slug already exists for the current site.",
        notFound: "This tag no longer exists for the current site.",
      });
      setTagsError(message);
      toast.error(message);
    } finally {
      setTagsBusyId(null);
    }
  };

  const handleDeleteTag = async (id: string) => {
    setTagsBusyId(id);
    setTagsError(null);
    try {
      await deleteWorkTag(id);
      toast.success("Tag deleted.");
      await loadTags();
      await loadProjects();
    } catch (err) {
      if (handleAuthError(err)) return;
      const message = getWorkMutationMessage(
        err,
        "Failed to delete tag. It may still be in use by projects.",
        {
          conflict: "This tag is still attached to one or more projects.",
          notFound: "This tag no longer exists for the current site.",
        }
      );
      setTagsError(message);
      toast.error(message);
    } finally {
      setTagsBusyId(null);
    }
  };

  const handlePickProject = async (id: string) => {
    setProjectError(null);
    try {
      const project = await getWorkProject(id);
      setProjectForm(mapProjectToForm(project));
      setActiveTab("projects");
    } catch (err) {
      if (handleAuthError(err)) return;
      const message = getWorkMutationMessage(err, "Failed to load project.", {
        notFound: "This project no longer exists for the current site.",
      });
      setProjectError(message);
      toast.error(message);
    }
  };

  const handleStartNewProject = () => {
    setTemplatePickerOpen(true);
  };

  const handleDuplicateProject = async (id: string) => {
    setProjectError(null);
    try {
      const duplicated = await duplicateWorkProject(id);
      toast.success("Project duplicated.");
      await loadProjects();
      setProjectForm(mapProjectToForm(duplicated));
      setActiveTab("projects");
    } catch (err) {
      if (handleAuthError(err)) return;
      const message = getWorkMutationMessage(err, "Failed to duplicate project.", {
        conflict: "Could not create a duplicate slug for this project. Update the slug and try again.",
        notFound: "This project no longer exists for the current site.",
      });
      setProjectError(message);
      toast.error(message);
    }
  };

  const handleSelectTemplate = (template: ProjectTemplate) => {
    const templateContent = getTemplateContent(template.id);
    setTemplatePickerOpen(false);
    setActiveTab("projects");
    setProjectError(null);
    setProjectForm({
      id: null,
      templateId: template.id,
      title: "",
      slug: "",
      excerpt: "",
      coverImage: "",
      tagIds: [],
      draftContent: templateContent ?? { blocks: [] },
      status: "DRAFT",
      publishedAt: null,
    });
  };

  const persistProjectDraft = async (showToast = true) => {
    const parsed = projectSchema.safeParse({
      title: projectForm.title,
      slug: projectForm.slug,
      excerpt: projectForm.excerpt,
      coverImage: projectForm.coverImage,
      tagIds: projectForm.tagIds,
    });

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Invalid project data.";
      setProjectError(message);
      if (showToast) {
        toast.error(message);
      }
      return null;
    }

    if (!projectForm.templateId) {
      const message = "Choose a template before saving this project.";
      setProjectError(message);
      if (showToast) {
        toast.error(message);
      }
      return null;
    }

    const payload = {
      templateId: projectForm.templateId,
      title: projectForm.title,
      slug: projectForm.slug,
      excerpt: projectForm.excerpt,
      coverImage: projectForm.coverImage,
      tagIds: projectForm.tagIds,
      draftContent: projectForm.draftContent,
    };

    const savedProject = projectForm.id
      ? await updateWorkProject(projectForm.id, {
          title: payload.title,
          slug: payload.slug,
          excerpt: payload.excerpt,
          coverImage: payload.coverImage,
          tagIds: payload.tagIds,
          draftContent: payload.draftContent,
        })
      : await createWorkProject(payload);

    await loadProjects();
    const nextId = savedProject.id || projectForm.id;
    if (nextId) {
      const project = await getWorkProject(nextId);
      setProjectForm(mapProjectToForm(project));
    } else {
      const refreshed = await listWorkProjects();
      setProjects(refreshed);
      const bySlug = refreshed.find((project) => project.slug === projectForm.slug);
      if (bySlug) {
        const project = await getWorkProject(bySlug.id);
        setProjectForm(mapProjectToForm(project));
      }
    }

    if (showToast) {
      toast.success("Project draft saved.");
    }
    setProjectError(null);
    return nextId;
  };

  const handleProjectSave = async () => {
    setProjectSaving(true);
    try {
      await persistProjectDraft(true);
    } catch (err) {
      if (handleAuthError(err)) return;
      const message = getWorkMutationMessage(err, "Failed to save project.", {
        conflict: "A project with this slug already exists for the current site.",
        notFound: "This project no longer exists for the current site.",
      });
      setProjectError(message);
      toast.error(message);
    } finally {
      setProjectSaving(false);
    }
  };

  const handleProjectPublish = async () => {
    setProjectPublishing(true);
    try {
      const projectId = await persistProjectDraft(true);
      if (!projectId) {
        return;
      }
      await publishWorkProject(projectId);
      toast.success("Project published.");
      const project = await getWorkProject(projectId);
      setProjectForm(mapProjectToForm(project));
      await loadProjects();
    } catch (err) {
      if (handleAuthError(err)) return;
      const message = getWorkMutationMessage(err, "Failed to publish project.", {
        conflict: "A project with this slug already exists for the current site.",
        notFound: "This project no longer exists for the current site.",
      });
      setProjectError(message);
      toast.error(message);
    } finally {
      setProjectPublishing(false);
    }
  };



  return (
    <>
      <div className="flex w-full flex-col gap-6 px-6 py-8">
        <EditorStatusBar
          label="Work Collection"
          status={metaStatus}
          publishedAt={metaPublishedAt}
          previewHref="/admin/site-settings"
          note="Save the work page draft before publishing. Project drafts stay private until you publish each project."
          onSave={activeTab === "page" ? () => void handleMetaSave() : undefined}
          onPublish={activeTab === "page" ? () => void handleMetaPublish() : undefined}
          saving={metaSaving}
          publishing={metaPublishing}
        />

        <div className="flex flex-wrap items-center justify-between gap-4">
          <WorkTabs activeTab={activeTab} onChange={setActiveTab} />
          {activeTab === "projects" ? (
            <button
              type="button"
              onClick={handleStartNewProject}
              className="rounded-full bg-white px-4 py-2 text-xs uppercase tracking-widest text-black hover:bg-white/90"
            >
              New Project
            </button>
          ) : null}
        </div>

        {activeTab === "page" ? (
          <PageMetaTab
            value={metaValue}
            status={metaStatus}
            publishedAt={metaPublishedAt}
            loading={metaLoading}
            saving={metaSaving}
            publishing={metaPublishing}
            error={metaError}
            onChange={setMetaValue}
            onSave={() => void handleMetaSave()}
            onPublish={() => void handleMetaPublish()}
          />
        ) : null}

        {activeTab === "tags" ? (
          <TagsTab
            tags={tags}
            loading={tagsLoading}
            error={tagsError}
            busyId={tagsBusyId}
            creating={tagsCreating}
            onCreate={handleCreateTag}
            onUpdate={handleUpdateTag}
            onDelete={handleDeleteTag}
          />
        ) : null}

        {activeTab === "projects" ? (
          hasTags ? (
            <ProjectEditor
              value={projectForm}
              tags={tags}
              projects={projects}
              loadingProjects={projectsLoading}
              saving={projectSaving}
              publishing={projectPublishing}
              error={projectError}
              onPickProject={handlePickProject}
              onCreate={handleStartNewProject}
              onDuplicate={handleDuplicateProject}
              onChange={setProjectForm}
              onSave={handleProjectSave}
              onPublish={handleProjectPublish}
            />
          ) : (
            <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-xl font-semibold text-white">Projects</h2>
              <p className="mt-2 text-sm text-white/60">
                Create at least one tag in the Tags tab before creating projects.
              </p>
            </section>
          )
        ) : null}
      </div>

      <TemplatePickerModal
        open={templatePickerOpen}
        onClose={() => setTemplatePickerOpen(false)}
        onSelect={handleSelectTemplate}
      />
    </>
  );
}


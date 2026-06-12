import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { useAdmin } from "../../auth/useAdmin";
import { CreateSiteDialog } from "../../components/admin/CreateSiteDialog";
import { CreateTemplateWizardDialog } from "../../components/admin/templates/CreateTemplateWizardDialog";
import { ImportTemplateDialog } from "../../components/admin/templates/ImportTemplateDialog";
import { SelectedTemplateDrawer } from "../../components/admin/templates/SelectedTemplateDrawer";
import { TemplateCardGrid } from "../../components/admin/templates/TemplateCardGrid";
import { TemplateEditorDrawer } from "../../components/admin/templates/TemplateEditorDrawer";
import { TemplateGuidanceDrawer } from "../../components/admin/templates/TemplateGuidanceDrawer";
import { TemplateLibraryFilters } from "../../components/admin/templates/TemplateLibraryFilters";
import { TemplatesPageHeader } from "../../components/admin/templates/TemplatesPageHeader";
import { TemplateStatsStrip } from "../../components/admin/templates/TemplateStatsStrip";
import { TemplateUsageDrawer } from "../../components/admin/templates/TemplateUsageDrawer";
import {
  getTemplateModules,
  getTemplateTypeFilter,
  type TemplateTypeFilter,
} from "../../components/admin/templates/templatePresentation";
import {
  getAdminSites,
  getAdminTemplate,
  getAdminTemplateUsages,
  getAdminTemplates,
  type AdminSite,
  type AdminSiteDetail,
  type TemplateCategory,
  type TemplateDetail,
  type TemplateSummary,
  type TemplateUsageSite,
} from "../../services/adminSites";

export function TemplatesAdmin() {
  const { admin, changeSite } = useAdmin();
  const canManageTemplates =
    admin?.currentRole === "OWNER" || admin?.currentRole === "ADMIN";
  const currentSiteId = admin?.currentSite?.id ?? null;

  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [sites, setSites] = useState<AdminSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<"all" | TemplateCategory>("all");
  const [typeFilter, setTypeFilter] = useState<TemplateTypeFilter>("all");
  const [createTemplateOpen, setCreateTemplateOpen] = useState(false);
  const [createSiteOpen, setCreateSiteOpen] = useState(false);
  const [importTemplateOpen, setImportTemplateOpen] = useState(false);
  const [usageOpen, setUsageOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [guidanceOpen, setGuidanceOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [usageLoading, setUsageLoading] = useState(false);
  const [templateUsages, setTemplateUsages] = useState<TemplateUsageSite[]>([]);
  const [templateSourceKey, setTemplateSourceKey] = useState<string | null>(null);
  const [siteTemplateKey, setSiteTemplateKey] = useState<string | null>(null);

  const selectedSummary = useMemo(
    () => templates.find((template) => template.key === selectedTemplateKey) ?? null,
    [selectedTemplateKey, templates]
  );

  const filteredTemplates = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    return templates.filter((template) => {
      const matchesType =
        typeFilter === "all" || getTemplateTypeFilter(template) === typeFilter;
      const matchesCategory = category === "all" || template.category === category;
      const moduleText = getTemplateModules(template).join(" ");
      const matchesSearch =
        !normalized ||
        `${template.name} ${template.category} ${template.description} ${moduleText}`
          .toLowerCase()
          .includes(normalized);

      return matchesType && matchesCategory && matchesSearch;
    });
  }, [category, search, templates, typeFilter]);

  const loadLibrary = async () => {
    setLoading(true);
    try {
      const [nextTemplates, nextSites] = await Promise.all([
        getAdminTemplates({ scope: "all" }),
        getAdminSites(),
      ]);
      setTemplates(nextTemplates);
      setSites(nextSites);
      setSelectedTemplateKey((current) => {
        if (current && nextTemplates.some((template) => template.key === current)) {
          return current;
        }
        return nextTemplates[0]?.key ?? null;
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load templates.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadLibrary();
  }, [currentSiteId]);

  useEffect(() => {
    if (!selectedTemplateKey) {
      setSelectedTemplate(null);
      return;
    }

    let cancelled = false;

    const loadDetail = async () => {
      setDetailLoading(true);
      try {
        const detail = await getAdminTemplate(selectedTemplateKey);
        if (!cancelled) {
          setSelectedTemplate(detail);
        }
      } catch (err) {
        if (!cancelled) {
          toast.error(
            err instanceof Error ? err.message : "Failed to load template detail."
          );
        }
      } finally {
        if (!cancelled) {
          setDetailLoading(false);
        }
      }
    };

    void loadDetail();
    return () => {
      cancelled = true;
    };
  }, [selectedTemplateKey]);

  useEffect(() => {
    if (!usageOpen || !selectedTemplate?.id) {
      return;
    }

    let cancelled = false;

    const loadUsage = async () => {
      setUsageLoading(true);
      try {
        const nextUsages = await getAdminTemplateUsages(selectedTemplate.id);
        if (!cancelled) {
          setTemplateUsages(nextUsages);
        }
      } catch (err) {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : "Failed to load template usage.");
        }
      } finally {
        if (!cancelled) {
          setUsageLoading(false);
        }
      }
    };

    void loadUsage();
    return () => {
      cancelled = true;
    };
  }, [selectedTemplate?.id, usageOpen]);

  const handleCreatedTemplate = async (template: TemplateDetail) => {
    await loadLibrary();
    setSelectedTemplateKey(template.key);
    setTemplateSourceKey(null);
    toast.success("Custom template created.");
  };

  const handleCreatedSite = async (site: AdminSiteDetail) => {
    await changeSite(site.id);
    setSiteTemplateKey(null);
    toast.success("Site created.");
  };

  const handleUseTemplate = (templateKey: string) => {
    setSiteTemplateKey(templateKey);
    setCreateSiteOpen(true);
  };

  const handleCreateCustomCopy = (templateKey: string) => {
    if (!canManageTemplates) {
      toast.error("Only owners and admins can create templates.");
      return;
    }

    setTemplateSourceKey(templateKey);
    setCreateTemplateOpen(true);
  };

  return (
    <>
      <div className="w-full space-y-6 px-5 py-8 lg:px-8">
        <TemplatesPageHeader
          canManageTemplates={canManageTemplates}
          onCreateTemplate={() => {
            setTemplateSourceKey(null);
            setCreateTemplateOpen(true);
          }}
          onImportTemplate={() => setImportTemplateOpen(true)}
          onOpenGuidance={() => setGuidanceOpen(true)}
        />

        {!canManageTemplates ? (
          <div className="rounded-2xl border border-amber-300/25 bg-amber-300/10 p-4 text-sm text-amber-100">
            Templates are read-only for your role. Only owners and admins can create or publish custom templates.
          </div>
        ) : null}

        <TemplateStatsStrip
          templates={templates}
          sites={sites}
          currentSiteId={currentSiteId}
          loading={loading}
        />

        <TemplateLibraryFilters
          search={search}
          onSearchChange={setSearch}
          category={category}
          onCategoryChange={setCategory}
          type={typeFilter}
          onTypeChange={setTypeFilter}
        />

        <section>
          <TemplateCardGrid
            templates={filteredTemplates}
            selectedTemplateKey={selectedTemplateKey}
            loading={loading}
            onSelect={(templateKey) => {
              setSelectedTemplateKey(templateKey);
              setInspectorOpen(true);
            }}
            onUseTemplate={handleUseTemplate}
            onCreateTemplate={() => {
              setTemplateSourceKey(null);
              setCreateTemplateOpen(true);
            }}
          />
        </section>
      </div>

      <SelectedTemplateDrawer
        open={inspectorOpen}
        onOpenChange={setInspectorOpen}
        summary={selectedSummary}
        detail={selectedTemplate}
        loading={detailLoading}
        usageCount={selectedSummary?.usageCount ?? templateUsages.length}
        onUseTemplate={handleUseTemplate}
        onCreateCustomCopy={handleCreateCustomCopy}
        onViewUsage={() => setUsageOpen(true)}
        onEditCustomTemplate={() => setEditorOpen(true)}
      />

      <CreateTemplateWizardDialog
        open={createTemplateOpen}
        onOpenChange={setCreateTemplateOpen}
        templates={templates}
        sites={sites}
        currentSiteId={currentSiteId}
        initialSourceTemplateKey={templateSourceKey}
        onCreated={handleCreatedTemplate}
      />

      <ImportTemplateDialog
        open={importTemplateOpen}
        onOpenChange={setImportTemplateOpen}
        onImported={async (template) => {
          await loadLibrary();
          setSelectedTemplateKey(template.key);
          setInspectorOpen(true);
        }}
      />

      <TemplateUsageDrawer
        open={usageOpen}
        onOpenChange={setUsageOpen}
        template={selectedTemplate}
        usages={templateUsages}
        loading={usageLoading}
      />

      <TemplateEditorDrawer
        open={editorOpen}
        onOpenChange={setEditorOpen}
        template={selectedTemplate}
        usageCount={selectedSummary?.usageCount ?? 0}
        onUpdated={async (template) => {
          setSelectedTemplate(template);
          await loadLibrary();
        }}
      />

      <TemplateGuidanceDrawer open={guidanceOpen} onOpenChange={setGuidanceOpen} />

      <CreateSiteDialog
        open={createSiteOpen}
        onClose={() => setCreateSiteOpen(false)}
        onCreated={handleCreatedSite}
        initialTemplateKey={siteTemplateKey}
      />
    </>
  );
}

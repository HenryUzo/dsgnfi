import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { useAdmin } from "../../auth/useAdmin";
import { CreateSiteDialog } from "../../components/admin/CreateSiteDialog";
import { CurrentWorkingSiteCompactCard } from "../../components/admin/sites/CurrentWorkingSiteCompactCard";
import { SetupChecklistDialog } from "../../components/admin/sites/SetupChecklistDialog";
import { SetupChecklistSummaryCard } from "../../components/admin/sites/SetupChecklistSummaryCard";
import { SiteDetailsDrawer } from "../../components/admin/sites/SiteDetailsDrawer";
import { SiteReadinessInfographicCard } from "../../components/admin/sites/SiteReadinessInfographicCard";
import { SitesHeader } from "../../components/admin/sites/SitesHeader";
import { SwitchSiteConfirmDialog } from "../../components/admin/sites/SwitchSiteConfirmDialog";
import { TenantSitesTable } from "../../components/admin/sites/TenantSitesTable";
import { TenantStatsStrip } from "../../components/admin/sites/TenantStatsStrip";
import {
  getAdminSite,
  getAdminSites,
  type AdminSite,
  type AdminSiteDetail,
} from "../../services/adminSites";

function withUpdatedSearchParams(
  searchParams: URLSearchParams,
  updates: Record<string, string | null>
) {
  const next = new URLSearchParams(searchParams);

  Object.entries(updates).forEach(([key, value]) => {
    if (value) {
      next.set(key, value);
      return;
    }

    next.delete(key);
  });

  return next;
}

export function AdminSites() {
  const { admin, changeSite } = useAdmin();
  const [searchParams, setSearchParams] = useSearchParams();
  const [sites, setSites] = useState<AdminSite[]>([]);
  const [loadingSites, setLoadingSites] = useState(true);
  const [currentSiteDetail, setCurrentSiteDetail] = useState<AdminSiteDetail | null>(null);
  const [currentDetailLoading, setCurrentDetailLoading] = useState(false);
  const [drawerSiteDetail, setDrawerSiteDetail] = useState<AdminSiteDetail | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [switchingSiteId, setSwitchingSiteId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [pendingSwitchSite, setPendingSwitchSite] = useState<AdminSite | null>(null);

  const currentSiteId = admin?.currentSite?.id ?? null;
  const drawerSiteId = searchParams.get("details");

  useEffect(() => {
    let cancelled = false;

    const loadSites = async () => {
      setLoadingSites(true);
      try {
        const nextSites = await getAdminSites();
        if (!cancelled) {
          setSites(nextSites);
        }
      } catch (err) {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : "Failed to load sites.");
        }
      } finally {
        if (!cancelled) {
          setLoadingSites(false);
        }
      }
    };

    void loadSites();
    return () => {
      cancelled = true;
    };
  }, [currentSiteId]);

  useEffect(() => {
    if (!currentSiteId) {
      setCurrentSiteDetail(null);
      return;
    }

    let cancelled = false;

    const loadCurrentSite = async () => {
      setCurrentDetailLoading(true);
      try {
        const nextSite = await getAdminSite(currentSiteId);
        if (!cancelled) {
          setCurrentSiteDetail(nextSite);
        }
      } catch (err) {
        if (!cancelled) {
          toast.error(
            err instanceof Error ? err.message : "Failed to load the current site."
          );
        }
      } finally {
        if (!cancelled) {
          setCurrentDetailLoading(false);
        }
      }
    };

    void loadCurrentSite();
    return () => {
      cancelled = true;
    };
  }, [currentSiteId]);

  useEffect(() => {
    if (!drawerSiteId) {
      setDrawerSiteDetail(null);
      setDrawerLoading(false);
      return;
    }

    if (drawerSiteId === currentSiteId && currentSiteDetail) {
      setDrawerSiteDetail(currentSiteDetail);
      setDrawerLoading(false);
      return;
    }

    let cancelled = false;

    const loadDrawerSite = async () => {
      setDrawerLoading(true);
      try {
        const nextSite = await getAdminSite(drawerSiteId);
        if (!cancelled) {
          setDrawerSiteDetail(nextSite);
        }
      } catch (err) {
        if (!cancelled) {
          setDrawerSiteDetail(null);
          toast.error(
            err instanceof Error ? err.message : "Failed to load site details."
          );
        }
      } finally {
        if (!cancelled) {
          setDrawerLoading(false);
        }
      }
    };

    void loadDrawerSite();
    return () => {
      cancelled = true;
    };
  }, [currentSiteDetail, currentSiteId, drawerSiteId]);

  const currentSiteSummary = useMemo(
    () => sites.find((site) => site.id === currentSiteId) ?? null,
    [currentSiteId, sites]
  );

  const currentSitePresentation = currentSiteDetail ?? currentSiteSummary;

  const handleCreated = async (site: AdminSiteDetail) => {
    await changeSite(site.id);
    toast.success("Site created.");
    setSearchParams(withUpdatedSearchParams(searchParams, { details: null }));
  };

  const handleOpenDetails = (siteId: string) => {
    setSearchParams(withUpdatedSearchParams(searchParams, { details: siteId }));
  };

  const handleCloseDetails = () => {
    setSearchParams(withUpdatedSearchParams(searchParams, { details: null }));
  };

  const handleSwitchSite = async (siteId: string) => {
    setSwitchingSiteId(siteId);
    try {
      await changeSite(siteId);
      toast.success("Site context updated.");
      setSearchParams(withUpdatedSearchParams(searchParams, { details: null }));
      setPendingSwitchSite(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to switch site.");
    } finally {
      setSwitchingSiteId(null);
    }
  };

  const handleTemplateUpdated = async (updatedSite: AdminSiteDetail) => {
    setSites((current) =>
      current.map((site) => (site.id === updatedSite.id ? updatedSite : site))
    );

    if (currentSiteId === updatedSite.id) {
      setCurrentSiteDetail(updatedSite);
    }

    if (drawerSiteId === updatedSite.id) {
      setDrawerSiteDetail(updatedSite);
    }
  };

  return (
    <>
      <div className="w-full space-y-6 px-5 py-8 lg:px-8">
        <SitesHeader
          tenantName={admin?.currentTenant?.name}
          currentSiteName={admin?.currentSite?.name}
          role={admin?.currentRole}
          onCreateSite={() => setCreateOpen(true)}
        />

        <TenantStatsStrip sites={sites} loading={loadingSites} />

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_360px]">
          <CurrentWorkingSiteCompactCard
            site={currentSitePresentation}
            loading={currentDetailLoading && !currentSitePresentation}
          />
          <SiteReadinessInfographicCard sites={sites} />
        </section>

        <section className="grid gap-5 md:grid-cols-3">
          <SetupChecklistSummaryCard
            site={currentSitePresentation}
            onOpenChecklist={() => setChecklistOpen(true)}
          />
          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-5">
            <p className="text-xs text-white/48">Publish status</p>
            <h3 className="mt-3 text-lg font-semibold text-white">
              {currentSitePresentation?.statusSummary?.publishedPagesCount ?? 0} published
            </h3>
            <p className="mt-2 text-sm text-white/58">
              Draft work appears in the Pages area when ready for review.
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-5">
            <p className="text-xs text-white/48">Issues</p>
            <h3 className="mt-3 text-lg font-semibold text-white">
              {sites.filter((site) => !site.statusSummary?.domainReady).length} need attention
            </h3>
            <p className="mt-2 text-sm text-white/58">
              Sites missing a connected domain or setup step are visible in the list.
            </p>
          </div>
        </section>

        <TenantSitesTable
          sites={sites}
          loading={loadingSites}
          currentSiteId={currentSiteId}
          switchingSiteId={switchingSiteId}
          onOpenDetails={handleOpenDetails}
          onRequestSwitchSite={setPendingSwitchSite}
        />
      </div>

      <SiteDetailsDrawer
        site={drawerSiteDetail}
        loading={drawerLoading}
        open={Boolean(drawerSiteId)}
        onTemplateUpdated={handleTemplateUpdated}
        onOpenChange={(open) => {
          if (!open) {
            handleCloseDetails();
          }
        }}
      />

      <SetupChecklistDialog
        open={checklistOpen}
        onOpenChange={setChecklistOpen}
        site={currentSitePresentation}
      />

      <SwitchSiteConfirmDialog
        site={pendingSwitchSite}
        switching={Boolean(pendingSwitchSite && switchingSiteId === pendingSwitchSite.id)}
        onOpenChange={(open) => {
          if (!open) {
            setPendingSwitchSite(null);
          }
        }}
        onConfirm={() => {
          if (pendingSwitchSite) {
            void handleSwitchSite(pendingSwitchSite.id);
          }
        }}
      />

      <CreateSiteDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />
    </>
  );
}

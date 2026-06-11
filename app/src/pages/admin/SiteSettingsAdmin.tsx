import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { useAdmin } from "../../auth/useAdmin";
import { ApiError } from "../../lib/api";
import {
  deleteAdminAsset,
  deleteAdminDomain,
  getAdminSiteNavigation,
  getAdminSiteSettings,
  listAdminDomains,
  listAdminAssets,
  listAdminPages,
  listAdminPreviewTokens,
  createAdminDomain,
  createAdminPreviewToken,
  revokeAdminPreviewToken,
  setPrimaryAdminDomain,
  updateAdminAsset,
  updateAdminSiteNavigation,
  updateAdminSiteSettings,
  uploadAdminAsset,
  verifyAdminDomain,
  type AdminPageSummary,
  type NavigationItem,
  type PreviewTokenCreated,
  type PreviewTokenSummary,
  type SiteDomain,
  type SiteAsset,
  type SiteSettingsInput,
  type ThemeSettings,
} from "../../services/siteSettings";

type TabKey = "settings" | "theme" | "navigation" | "assets" | "domains" | "preview";

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "settings", label: "Brand" },
  { key: "theme", label: "Theme" },
  { key: "navigation", label: "Navigation" },
  { key: "assets", label: "Assets" },
  { key: "domains", label: "Domains" },
  { key: "preview", label: "Preview" },
];

const emptySettings: SiteSettingsInput = {
  siteName: "",
  logoUrl: null,
  faviconUrl: null,
  tagline: null,
  contactEmail: null,
  contactPhone: null,
  address: null,
  socialLinks: {},
  seoTitle: null,
  seoDescription: null,
  locale: null,
  timezone: null,
  theme: {},
};

function toSocialEntries(links: Record<string, string>): Array<[string, string]> {
  const entries = Object.entries(links).map(
    ([key, value]) => [key, value] as [string, string]
  );
  return entries.length > 0 ? entries : [["", ""]];
}

function fromSocialEntries(entries: Array<[string, string]>) {
  return entries.reduce<Record<string, string>>((acc, [key, value]) => {
    const normalizedKey = key.trim();
    const normalizedValue = value.trim();
    if (normalizedKey && normalizedValue) {
      acc[normalizedKey] = normalizedValue;
    }
    return acc;
  }, {});
}

function makeNavItem(order: number): NavigationItem {
  return {
    id: `nav-${Date.now()}-${order}`,
    label: "",
    pageKey: null,
    href: null,
    visible: true,
    order,
  };
}

function slugToHref(slug: string) {
  if (!slug || slug === "/") {
    return "/";
  }

  return slug.startsWith("/") ? slug : `/${slug}`;
}

export function SiteSettingsAdmin() {
  const navigate = useNavigate();
  const { admin } = useAdmin();
  const [activeTab, setActiveTab] = useState<TabKey>("settings");
  const [settings, setSettings] = useState<SiteSettingsInput>(emptySettings);
  const [socialEntries, setSocialEntries] = useState<Array<[string, string]>>([["", ""]]);
  const [primaryNavigation, setPrimaryNavigation] = useState<NavigationItem[]>([]);
  const [footerNavigation, setFooterNavigation] = useState<NavigationItem[]>([]);
  const [pages, setPages] = useState<AdminPageSummary[]>([]);
  const [assets, setAssets] = useState<SiteAsset[]>([]);
  const [domains, setDomains] = useState<SiteDomain[]>([]);
  const [previewTokens, setPreviewTokens] = useState<PreviewTokenSummary[]>([]);
  const [latestPreview, setLatestPreview] = useState<PreviewTokenCreated | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingNavigation, setSavingNavigation] = useState(false);
  const [uploadingAsset, setUploadingAsset] = useState(false);
  const [creatingDomain, setCreatingDomain] = useState(false);
  const [creatingPreview, setCreatingPreview] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadAltText, setUploadAltText] = useState("");
  const [domainType, setDomainType] = useState<"SUBDOMAIN" | "CUSTOM">("SUBDOMAIN");
  const [subdomainLabel, setSubdomainLabel] = useState("");
  const [customHostname, setCustomHostname] = useState("");
  const [previewPageKey, setPreviewPageKey] = useState("home");
  const [previewExpiresMinutes, setPreviewExpiresMinutes] = useState(60);
  const [previewNote, setPreviewNote] = useState("");
  const [savedSettingsSnapshot, setSavedSettingsSnapshot] = useState("");
  const [savedNavigationSnapshot, setSavedNavigationSnapshot] = useState("");

  const currentSiteId = admin?.currentSite?.id ?? null;

  const handleAuthError = (err: unknown) => {
    if (err instanceof ApiError && err.status === 401) {
      navigate("/admin/login", { replace: true });
      return true;
    }
    return false;
  };

  const reload = async () => {
    setLoading(true);
    try {
      const [nextSettings, nextNavigation, nextAssets, nextPages, nextDomains, nextPreviewTokens] = await Promise.all([
        getAdminSiteSettings(),
        getAdminSiteNavigation(),
        listAdminAssets(),
        listAdminPages(),
        listAdminDomains(),
        listAdminPreviewTokens(),
      ]);
      setSettings({
        ...nextSettings.settings,
        theme: (nextSettings.theme ?? {}) as ThemeSettings,
      });
      setSocialEntries(toSocialEntries(nextSettings.settings.socialLinks ?? {}));
      setPrimaryNavigation(
        nextNavigation.primary.map((item, index) => ({ ...item, order: item.order ?? index }))
      );
      setFooterNavigation(
        nextNavigation.footer.map((item, index) => ({ ...item, order: item.order ?? index }))
      );
      setSavedSettingsSnapshot(
        JSON.stringify({
          ...nextSettings.settings,
          theme: (nextSettings.theme ?? {}) as ThemeSettings,
          socialEntries: toSocialEntries(nextSettings.settings.socialLinks ?? {}),
        })
      );
      setSavedNavigationSnapshot(
        JSON.stringify({
          primary: nextNavigation.primary.map((item, index) => ({ ...item, order: item.order ?? index })),
          footer: nextNavigation.footer.map((item, index) => ({ ...item, order: item.order ?? index })),
        })
      );
      setAssets(nextAssets);
      setPages(nextPages);
      setDomains(nextDomains);
      setPreviewTokens(nextPreviewTokens);
      setPreviewPageKey(nextPages[0]?.pageKey ?? "home");
      setLatestPreview(null);
    } catch (err) {
      if (handleAuthError(err)) return;
      toast.error(err instanceof Error ? err.message : "Failed to load site settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSettings(emptySettings);
    setSocialEntries([["", ""]]);
    setPrimaryNavigation([]);
    setFooterNavigation([]);
    setAssets([]);
    setDomains([]);
    setPreviewTokens([]);
    setLatestPreview(null);
    setPages([]);
    void reload();
  }, [currentSiteId]);

  const assetOptions = useMemo(
    () => [{ id: "", label: "None", url: null as string | null }, ...assets.map((asset) => ({
      id: asset.id,
      label: asset.filename,
      url: asset.url,
    }))],
    [assets]
  );

  const settingsDirty = useMemo(
    () =>
      savedSettingsSnapshot !== "" &&
      savedSettingsSnapshot !==
        JSON.stringify({
          ...settings,
          socialEntries,
        }),
    [savedSettingsSnapshot, settings, socialEntries]
  );

  const navigationDirty = useMemo(
    () =>
      savedNavigationSnapshot !== "" &&
      savedNavigationSnapshot !==
        JSON.stringify({
          primary: primaryNavigation,
          footer: footerNavigation,
        }),
    [savedNavigationSnapshot, primaryNavigation, footerNavigation]
  );

  useEffect(() => {
    const hasUnsavedChanges = settingsDirty || navigationDirty;
    if (!hasUnsavedChanges) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [settingsDirty, navigationDirty]);

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const saved = await updateAdminSiteSettings({
        ...settings,
        socialLinks: fromSocialEntries(socialEntries),
      });
      setSettings({
        ...saved.settings,
        theme: (saved.theme ?? {}) as ThemeSettings,
      });
      setSocialEntries(toSocialEntries(saved.settings.socialLinks ?? {}));
      setSavedSettingsSnapshot(
        JSON.stringify({
          ...saved.settings,
          theme: (saved.theme ?? {}) as ThemeSettings,
          socialEntries: toSocialEntries(saved.settings.socialLinks ?? {}),
        })
      );
      toast.success("Site settings saved.");
    } catch (err) {
      if (handleAuthError(err)) return;
      toast.error(err instanceof Error ? err.message : "Failed to save site settings.");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveNavigation = async () => {
    setSavingNavigation(true);
    try {
      const navigation = await updateAdminSiteNavigation({
        primaryNavigation: primaryNavigation.map((item, index) => ({
          ...item,
          order: index,
        })),
        footerNavigation: footerNavigation.map((item, index) => ({
          ...item,
          order: index,
        })),
      });
      setPrimaryNavigation(navigation.primary);
      setFooterNavigation(navigation.footer);
      setSavedNavigationSnapshot(
        JSON.stringify({ primary: navigation.primary, footer: navigation.footer })
      );
      toast.success("Navigation saved.");
    } catch (err) {
      if (handleAuthError(err)) return;
      toast.error(err instanceof Error ? err.message : "Failed to save navigation.");
    } finally {
      setSavingNavigation(false);
    }
  };

  const handleUploadAsset = async () => {
    if (!uploadFile) {
      toast.error("Choose a file to upload.");
      return;
    }

    setUploadingAsset(true);
    try {
      const asset = await uploadAdminAsset(uploadFile, uploadAltText.trim() || undefined);
      setAssets((current) => [asset, ...current]);
      setUploadFile(null);
      setUploadAltText("");
      toast.success("Asset uploaded.");
    } catch (err) {
      if (handleAuthError(err)) return;
      toast.error(err instanceof Error ? err.message : "Failed to upload asset.");
    } finally {
      setUploadingAsset(false);
    }
  };

  const handleAssetUpdate = async (assetId: string, next: { filename: string; altText: string }) => {
    try {
      const asset = await updateAdminAsset(assetId, {
        filename: next.filename,
        altText: next.altText || null,
      });
      setAssets((current) => current.map((entry) => (entry.id === asset.id ? asset : entry)));
      toast.success("Asset updated.");
    } catch (err) {
      if (handleAuthError(err)) return;
      toast.error(err instanceof Error ? err.message : "Failed to update asset.");
    }
  };

  const handleAssetDelete = async (assetId: string) => {
    try {
      await deleteAdminAsset(assetId);
      setAssets((current) => current.filter((asset) => asset.id !== assetId));
      setSettings((current) => ({
        ...current,
        logoUrl:
          current.logoUrl && assets.find((asset) => asset.id === assetId)?.url === current.logoUrl
            ? null
            : current.logoUrl,
        faviconUrl:
          current.faviconUrl &&
          assets.find((asset) => asset.id === assetId)?.url === current.faviconUrl
            ? null
            : current.faviconUrl,
      }));
      toast.success("Asset deleted.");
    } catch (err) {
      if (handleAuthError(err)) return;
      toast.error(err instanceof Error ? err.message : "Failed to delete asset.");
    }
  };

  const handleCreateDomain = async () => {
    setCreatingDomain(true);
    try {
      const domain =
        domainType === "SUBDOMAIN"
          ? await createAdminDomain({
              type: "SUBDOMAIN",
              subdomainLabel,
            })
          : await createAdminDomain({
              type: "CUSTOM",
              hostname: customHostname,
            });

      setDomains((current) => {
        const next = [...current, domain];
        return next.sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
      });
      setSubdomainLabel("");
      setCustomHostname("");
      toast.success("Domain added.");
    } catch (err) {
      if (handleAuthError(err)) return;
      toast.error(err instanceof Error ? err.message : "Failed to add domain.");
    } finally {
      setCreatingDomain(false);
    }
  };

  const handleVerifyDomain = async (domainId: string) => {
    try {
      const updated = await verifyAdminDomain(domainId);
      setDomains((current) => current.map((domain) => (domain.id === updated.id ? updated : domain)));
      toast.success(
        updated.verificationStatus === "VERIFIED"
          ? "Domain verified."
          : "Verification check completed."
      );
    } catch (err) {
      if (handleAuthError(err)) return;
      toast.error(err instanceof Error ? err.message : "Failed to verify domain.");
    }
  };

  const handleSetPrimaryDomain = async (domainId: string) => {
    try {
      const updated = await setPrimaryAdminDomain(domainId);
      setDomains((current) =>
        current
          .map((domain) => ({ ...domain, isPrimary: domain.id === updated.id }))
          .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary))
      );
      toast.success("Primary domain updated.");
    } catch (err) {
      if (handleAuthError(err)) return;
      toast.error(err instanceof Error ? err.message : "Failed to set primary domain.");
    }
  };

  const handleDeleteDomain = async (domainId: string) => {
    try {
      await deleteAdminDomain(domainId);
      setDomains((current) => current.filter((domain) => domain.id !== domainId));
      toast.success("Domain deleted.");
    } catch (err) {
      if (handleAuthError(err)) return;
      toast.error(err instanceof Error ? err.message : "Failed to delete domain.");
    }
  };

  const handleCreatePreview = async () => {
    setCreatingPreview(true);
    try {
      const token = await createAdminPreviewToken({
        pageKey: previewPageKey,
        note: previewNote || null,
        expiresInMinutes: previewExpiresMinutes,
      });
      setLatestPreview(token);
      setPreviewTokens((current) => [token, ...current]);
      toast.success("Preview link created.");
    } catch (err) {
      if (handleAuthError(err)) return;
      toast.error(err instanceof Error ? err.message : "Failed to create preview link.");
    } finally {
      setCreatingPreview(false);
    }
  };

  const handleRevokePreview = async (tokenId: string) => {
    try {
      await revokeAdminPreviewToken(tokenId);
      setPreviewTokens((current) =>
        current.map((token) =>
          token.id === tokenId ? { ...token, revokedAt: new Date().toISOString() } : token
        )
      );
      if (latestPreview?.id === tokenId) {
        setLatestPreview(null);
      }
      toast.success("Preview link revoked.");
    } catch (err) {
      if (handleAuthError(err)) return;
      toast.error(err instanceof Error ? err.message : "Failed to revoke preview link.");
    }
  };

  const activeToolbarAction =
    activeTab === "settings"
      ? {
          eyebrow: "Brand",
          description: settingsDirty
            ? "Brand and contact changes are ready to save."
            : "Brand and contact details are up to date.",
          buttonLabel: "Save settings",
          disabled: savingSettings || !settingsDirty,
          busy: savingSettings,
          onClick: () => void handleSaveSettings(),
        }
      : activeTab === "theme"
        ? {
            eyebrow: "Theme",
            description: settingsDirty
              ? "Theme token changes are ready to save."
              : "Theme tokens are up to date.",
            buttonLabel: "Save theme",
            disabled: savingSettings || !settingsDirty,
            busy: savingSettings,
            onClick: () => void handleSaveSettings(),
          }
        : activeTab === "navigation"
          ? {
              eyebrow: "Navigation",
              description: navigationDirty
                ? "Navigation changes are ready to save."
                : "Navigation structure is up to date.",
              buttonLabel: "Save navigation",
              disabled: savingNavigation || !navigationDirty,
              busy: savingNavigation,
              onClick: () => void handleSaveNavigation(),
            }
          : activeTab === "assets"
            ? {
                eyebrow: "Assets",
                description: "Upload and organize the media used across this site.",
                buttonLabel: null,
                disabled: true,
                busy: false,
                onClick: undefined,
              }
            : activeTab === "domains"
              ? {
                  eyebrow: "Domains",
                  description: "Add, verify, and promote the domains mapped to this site.",
                  buttonLabel: null,
                  disabled: true,
                  busy: false,
                  onClick: undefined,
                }
              : {
                  eyebrow: "Preview",
                  description: "Create time-limited preview links for draft content review.",
                  buttonLabel: null,
                  disabled: true,
                  busy: false,
                  onClick: undefined,
                };

  const renderNavigationEditor = (
    title: string,
    items: NavigationItem[],
    setItems: Dispatch<SetStateAction<NavigationItem[]>>
  ) => (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <p className="text-sm text-white/55">
            Reference a site page or provide a direct href.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setItems((current) => [...current, makeNavItem(current.length)])}
          className="rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-[0.24em] text-white/75 hover:border-white/40 hover:text-white"
        >
          Add item
        </button>
      </div>

      <div className="space-y-4">
        {items.map((item) => {
          const linkedPage = item.pageKey
            ? pages.find((page) => page.pageKey === item.pageKey)
            : null;
          const resolvedHref = linkedPage ? slugToHref(linkedPage.slug) : item.href ?? "";
          const unpublishedLink = Boolean(
            item.visible && linkedPage && !linkedPage.publishedRevisionNumber
          );

          return (
          <div key={item.id} className="grid gap-3 rounded-2xl border border-white/10 bg-black/30 p-4 md:grid-cols-6">
            <input
              value={item.label}
              onChange={(event) =>
                setItems((current) =>
                  current.map((entry) =>
                    entry.id === item.id ? { ...entry, label: event.target.value } : entry
                  )
                )
              }
              placeholder="Label"
              className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none md:col-span-2"
            />
            <select
              value={item.pageKey ?? ""}
              onChange={(event) =>
                setItems((current) =>
                  current.map((entry) =>
                    entry.id === item.id
                      ? {
                          ...entry,
                          pageKey: event.target.value || null,
                          href: event.target.value
                            ? null
                            : entry.href,
                        }
                      : entry
                  )
                )
              }
              className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none"
            >
              <option value="">Custom href</option>
              {pages.map((page) => (
                <option key={page.pageKey} value={page.pageKey}>
                  {page.title}{page.publishedRevisionNumber ? "" : " (unpublished)"}
                </option>
              ))}
            </select>
            <input
              value={resolvedHref}
              onChange={(event) =>
                setItems((current) =>
                  current.map((entry) =>
                    entry.id === item.id
                      ? { ...entry, href: event.target.value || null, pageKey: null }
                      : entry
                  )
                )
              }
              placeholder="/contact or https://..."
              className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none md:col-span-2"
              disabled={Boolean(item.pageKey)}
            />
            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm text-white/70">
                <input
                  type="checkbox"
                  checked={item.visible}
                  onChange={(event) =>
                    setItems((current) =>
                      current.map((entry) =>
                        entry.id === item.id
                          ? { ...entry, visible: event.target.checked }
                          : entry
                      )
                    )
                  }
                />
                Visible
              </label>
              <button
                type="button"
                onClick={() =>
                  setItems((current) => current.filter((entry) => entry.id !== item.id))
                }
                className="text-xs uppercase tracking-[0.24em] text-red-300 hover:text-red-200"
              >
                Remove
              </button>
            </div>
            {unpublishedLink ? (
              <p className="text-xs text-amber-200 md:col-span-6">
                This item will be saved, but it is hidden from public navigation until the linked page is published.
              </p>
            ) : null}
          </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="w-full space-y-6 px-6 py-8">
      <div className="sticky top-[7rem] z-30 rounded-3xl border border-white/10 bg-black/85 p-4 backdrop-blur lg:top-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-full px-4 py-2 text-xs uppercase tracking-[0.24em] ${
                  activeTab === tab.key
                    ? "bg-white text-black"
                    : "border border-white/15 text-white/70 hover:border-white/40 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-end">
            <div>
              <p className="text-[10px] uppercase tracking-[0.24em] text-white/40">
                {activeToolbarAction.eyebrow}
              </p>
              <p className="mt-1 text-sm text-white/70">{activeToolbarAction.description}</p>
            </div>
            {activeToolbarAction.buttonLabel && activeToolbarAction.onClick ? (
              <button
                type="button"
                disabled={activeToolbarAction.disabled}
                onClick={activeToolbarAction.onClick}
                className="rounded-full bg-white px-5 py-3 text-xs uppercase tracking-[0.24em] text-black hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {activeToolbarAction.busy ? "Saving..." : activeToolbarAction.buttonLabel}
              </button>
            ) : null}
          </div>
        </div>

        {settingsDirty || navigationDirty ? (
          <p className="mt-3 rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
            You have unsaved changes on this site settings screen. Save before switching sites or closing the tab.
          </p>
        ) : null}
      </div>

      {loading ? <p className="text-sm text-white/60">Loading site settings...</p> : null}

      {!loading && activeTab === "settings" ? (
        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold text-white">Brand & Contact</h2>
            <div className="mt-5 grid gap-4">
              <input
                value={settings.siteName}
                onChange={(event) =>
                  setSettings((current) => ({ ...current, siteName: event.target.value }))
                }
                placeholder="Site name"
                className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
              />
              <textarea
                value={settings.tagline ?? ""}
                onChange={(event) =>
                  setSettings((current) => ({ ...current, tagline: event.target.value || null }))
                }
                placeholder="Tagline"
                className="min-h-28 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
              />
              <input
                value={settings.contactEmail ?? ""}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    contactEmail: event.target.value || null,
                  }))
                }
                placeholder="Contact email"
                className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
              />
              <input
                value={settings.contactPhone ?? ""}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    contactPhone: event.target.value || null,
                  }))
                }
                placeholder="Contact phone"
                className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
              />
              <textarea
                value={settings.address ?? ""}
                onChange={(event) =>
                  setSettings((current) => ({ ...current, address: event.target.value || null }))
                }
                placeholder="Address"
                className="min-h-24 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
              />
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold text-white">SEO, Locale & Assets</h2>
            <div className="mt-5 grid gap-4">
              <input
                value={settings.seoTitle ?? ""}
                onChange={(event) =>
                  setSettings((current) => ({ ...current, seoTitle: event.target.value || null }))
                }
                placeholder="Default SEO title"
                className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
              />
              <textarea
                value={settings.seoDescription ?? ""}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    seoDescription: event.target.value || null,
                  }))
                }
                placeholder="Default SEO description"
                className="min-h-24 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
              />
              <div className="grid gap-4 md:grid-cols-2">
                <input
                  value={settings.locale ?? ""}
                  onChange={(event) =>
                    setSettings((current) => ({ ...current, locale: event.target.value || null }))
                  }
                  placeholder="Locale"
                  className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
                />
                <input
                  value={settings.timezone ?? ""}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      timezone: event.target.value || null,
                    }))
                  }
                  placeholder="Timezone"
                  className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <select
                  value={settings.logoUrl ?? ""}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      logoUrl: event.target.value || null,
                    }))
                  }
                  className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
                >
                  {assetOptions.map((asset) => (
                    <option key={`logo-${asset.id}`} value={asset.url ?? ""}>
                      Logo: {asset.label}
                    </option>
                  ))}
                </select>
                <select
                  value={settings.faviconUrl ?? ""}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      faviconUrl: event.target.value || null,
                    }))
                  }
                  className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
                >
                  {assetOptions.map((asset) => (
                    <option key={`favicon-${asset.id}`} value={asset.url ?? ""}>
                      Favicon: {asset.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 lg:col-span-2">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-white">Social Links</h2>
                <p className="mt-1 text-sm text-white/55">
                  Use labels like linkedin, instagram, dribbble, behance, or custom.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSocialEntries((current) => [...current, ["", ""]])}
                className="rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-[0.24em] text-white/75 hover:border-white/40 hover:text-white"
              >
                Add social
              </button>
            </div>
            <div className="mt-5 space-y-3">
              {socialEntries.map(([key, value], index) => (
                <div key={`${index}-${key}`} className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)_auto]">
                  <input
                    value={key}
                    onChange={(event) =>
                      setSocialEntries((current) =>
                        current.map((entry, entryIndex) =>
                          entryIndex === index ? [event.target.value, entry[1]] : entry
                        )
                      )
                    }
                    placeholder="Label"
                    className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
                  />
                  <input
                    value={value}
                    onChange={(event) =>
                      setSocialEntries((current) =>
                        current.map((entry, entryIndex) =>
                          entryIndex === index ? [entry[0], event.target.value] : entry
                        )
                      )
                    }
                    placeholder="https://..."
                    className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setSocialEntries((current) =>
                        current.filter((_, entryIndex) => entryIndex !== index)
                      )
                    }
                    className="text-xs uppercase tracking-[0.24em] text-red-300 hover:text-red-200"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {!loading && activeTab === "theme" ? (
        <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold text-white">Theme Tokens</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {[
              ["primaryColor", "Primary"],
              ["accentColor", "Accent"],
              ["backgroundColor", "Background"],
              ["textColor", "Text"],
            ].map(([key, label]) => (
              <label key={key} className="space-y-2">
                <span className="text-sm text-white/65">{label}</span>
                <input
                  type="color"
                  value={(settings.theme as Record<string, string>)[key] ?? "#1a4ce0"}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      theme: { ...current.theme, [key]: event.target.value },
                    }))
                  }
                  className="h-12 w-full rounded-2xl border border-white/10 bg-black/30 p-2"
                />
              </label>
            ))}
            <label className="space-y-2">
              <span className="text-sm text-white/65">Button radius</span>
              <input
                type="number"
                min={0}
                max={48}
                value={settings.theme.buttonRadius ?? 24}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    theme: {
                      ...current.theme,
                      buttonRadius: Number(event.target.value),
                    },
                  }))
                }
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
              />
            </label>
          </div>
        </section>
      ) : null}

      {!loading && activeTab === "navigation" ? (
        <section className="space-y-6">
          {renderNavigationEditor("Primary navigation", primaryNavigation, setPrimaryNavigation)}
          {renderNavigationEditor("Footer navigation", footerNavigation, setFooterNavigation)}
        </section>
      ) : null}

      {!loading && activeTab === "assets" ? (
        <section className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold text-white">Upload Asset</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_220px_auto]">
              <input
                type="file"
                accept="image/*,video/*"
                onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)}
                className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
              />
              <input
                value={uploadAltText}
                onChange={(event) => setUploadAltText(event.target.value)}
                placeholder="Alt text"
                className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
              />
              <button
                type="button"
                disabled={uploadingAsset}
                onClick={() => void handleUploadAsset()}
                className="rounded-full bg-white px-5 py-3 text-xs uppercase tracking-[0.24em] text-black hover:bg-white/90 disabled:opacity-50"
              >
                {uploadingAsset ? "Uploading..." : "Upload"}
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold text-white">Asset Library</h2>
            {assets.length === 0 ? (
              <p className="mt-4 text-sm text-white/60">
                No assets uploaded for the current site yet.
              </p>
            ) : (
              <div className="mt-5 space-y-4">
                {assets.map((asset) => (
                  <AssetRow
                    key={asset.id}
                    asset={asset}
                    onSave={handleAssetUpdate}
                    onDelete={handleAssetDelete}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      ) : null}

      {!loading && activeTab === "domains" ? (
        <section className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold text-white">Add Domain</h2>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setDomainType("SUBDOMAIN")}
                className={`rounded-full px-4 py-2 text-xs uppercase tracking-[0.24em] ${
                  domainType === "SUBDOMAIN"
                    ? "bg-white text-black"
                    : "border border-white/15 text-white/70"
                }`}
              >
                DSGNFI subdomain
              </button>
              <button
                type="button"
                onClick={() => setDomainType("CUSTOM")}
                className={`rounded-full px-4 py-2 text-xs uppercase tracking-[0.24em] ${
                  domainType === "CUSTOM"
                    ? "bg-white text-black"
                    : "border border-white/15 text-white/70"
                }`}
              >
                Custom domain
              </button>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
              {domainType === "SUBDOMAIN" ? (
                <input
                  value={subdomainLabel}
                  onChange={(event) => setSubdomainLabel(event.target.value)}
                  placeholder="site-label"
                  className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
                />
              ) : (
                <input
                  value={customHostname}
                  onChange={(event) => setCustomHostname(event.target.value)}
                  placeholder="www.example.com"
                  className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
                />
              )}
              <button
                type="button"
                disabled={creatingDomain}
                onClick={() => void handleCreateDomain()}
                className="rounded-full bg-white px-5 py-3 text-xs uppercase tracking-[0.24em] text-black hover:bg-white/90 disabled:opacity-50"
              >
                {creatingDomain ? "Adding..." : "Add domain"}
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold text-white">Domains</h2>
            {domains.length === 0 ? (
              <p className="mt-4 text-sm text-white/60">No domains added for the current site yet.</p>
            ) : (
              <div className="mt-5 space-y-4">
                {domains.map((domain) => (
                  <div key={domain.id} className="rounded-2xl border border-white/10 bg-black/30 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-lg font-medium text-white">{domain.hostname}</p>
                          {domain.isPrimary ? (
                            <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-emerald-200">
                              Primary
                            </span>
                          ) : null}
                          <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-white/55">
                            {domain.type}
                          </span>
                          <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-white/55">
                            {domain.verificationStatus}
                          </span>
                        </div>
                        {domain.verificationInstructions ? (
                          <div className="mt-3 rounded-2xl border border-white/10 bg-black/40 p-3 text-sm text-white/65">
                            <p>Add TXT record:</p>
                            <p className="mt-1 break-all text-white/80">
                              {domain.verificationInstructions.host} = {domain.verificationInstructions.value}
                            </p>
                          </div>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {domain.type === "CUSTOM" ? (
                          <button
                            type="button"
                            onClick={() => void handleVerifyDomain(domain.id)}
                            className="rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-[0.24em] text-white/75 hover:border-white/40 hover:text-white"
                          >
                            Verify
                          </button>
                        ) : null}
                        <button
                          type="button"
                          disabled={domain.type === "CUSTOM" && domain.verificationStatus !== "VERIFIED"}
                          onClick={() => void handleSetPrimaryDomain(domain.id)}
                          className="rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-[0.24em] text-white/75 hover:border-white/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Set primary
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteDomain(domain.id)}
                          className="text-xs uppercase tracking-[0.24em] text-red-300 hover:text-red-200"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    {domain.type === "CUSTOM" && domain.verificationStatus !== "VERIFIED" ? (
                      <p className="mt-3 text-sm text-amber-200/80">
                        Custom domains must be verified before they can become primary.
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      ) : null}

      {!loading && activeTab === "preview" ? (
        <section className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold text-white">Generate Preview Link</h2>
            <p className="mt-2 max-w-3xl text-sm text-white/60">
              The generated link opens the browser preview route. That page then fetches
              draft content from the separate token-gated preview API. Normal public routes
              stay published-only.
            </p>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <select
                value={previewPageKey}
                onChange={(event) => setPreviewPageKey(event.target.value)}
                className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
              >
                {pages.map((page) => (
                  <option key={page.pageKey} value={page.pageKey}>
                    {page.title}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={5}
                max={1440}
                value={previewExpiresMinutes}
                onChange={(event) => setPreviewExpiresMinutes(Number(event.target.value))}
                className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
                placeholder="Expires in minutes"
              />
              <input
                value={previewNote}
                onChange={(event) => setPreviewNote(event.target.value)}
                placeholder="Note (optional)"
                className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
              />
            </div>
            <div className="mt-5">
              <button
                type="button"
                disabled={creatingPreview}
                onClick={() => void handleCreatePreview()}
                className="rounded-full bg-white px-5 py-3 text-xs uppercase tracking-[0.24em] text-black hover:bg-white/90 disabled:opacity-50"
              >
                {creatingPreview ? "Creating..." : "Create preview link"}
              </button>
            </div>
            {latestPreview ? (
              <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-emerald-200">Latest preview</p>
                <a
                  href={latestPreview.previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 block break-all text-sm text-white underline decoration-white/30 underline-offset-4"
                >
                  {latestPreview.previewUrl}
                </a>
                <p className="mt-2 text-sm text-white/70">
                  Expires {new Date(latestPreview.expiresAt).toLocaleString()}
                </p>
              </div>
            ) : null}
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold text-white">Active Preview Tokens</h2>
            {previewTokens.length === 0 ? (
              <p className="mt-4 text-sm text-white/60">No preview links generated yet.</p>
            ) : (
              <div className="mt-5 space-y-4">
                {previewTokens.map((token) => {
                  const revoked = Boolean(token.revokedAt);
                  return (
                    <div key={token.id} className="rounded-2xl border border-white/10 bg-black/30 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <p className="text-sm uppercase tracking-[0.24em] text-white/45">
                            {token.pageKey ?? "site preview"}
                          </p>
                          <p className="mt-1 text-white/75">
                            Expires {new Date(token.expiresAt).toLocaleString()}
                          </p>
                          {token.note ? <p className="mt-1 text-sm text-white/55">{token.note}</p> : null}
                          {revoked ? (
                            <p className="mt-1 text-sm text-red-300">
                              Revoked {new Date(token.revokedAt!).toLocaleString()}
                            </p>
                          ) : null}
                        </div>
                        {!revoked ? (
                          <button
                            type="button"
                            onClick={() => void handleRevokePreview(token.id)}
                            className="text-xs uppercase tracking-[0.24em] text-red-300 hover:text-red-200"
                          >
                            Revoke
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function AssetRow({
  asset,
  onSave,
  onDelete,
}: {
  asset: SiteAsset;
  onSave: (assetId: string, input: { filename: string; altText: string }) => void;
  onDelete: (assetId: string) => void;
}) {
  const [filename, setFilename] = useState(asset.filename);
  const [altText, setAltText] = useState(asset.altText ?? "");

  useEffect(() => {
    setFilename(asset.filename);
    setAltText(asset.altText ?? "");
  }, [asset.filename, asset.altText]);

  return (
    <div className="grid gap-4 rounded-2xl border border-white/10 bg-black/30 p-4 md:grid-cols-[120px_minmax(0,1fr)_200px_auto]">
      <div className="flex h-24 w-full items-center justify-center overflow-hidden rounded-xl bg-black/50">
        {asset.mimeType.startsWith("image/") ? (
          <img src={asset.url} alt={asset.altText ?? asset.filename} className="h-full w-full object-cover" />
        ) : (
          <span className="text-xs uppercase tracking-[0.24em] text-white/50">Video</span>
        )}
      </div>
      <div className="space-y-3">
        <input
          value={filename}
          onChange={(event) => setFilename(event.target.value)}
          className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
        />
        <input
          value={altText}
          onChange={(event) => setAltText(event.target.value)}
          placeholder="Alt text"
          className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
        />
        <p className="text-xs text-white/45">
          {asset.mimeType} · {(asset.size / 1024).toFixed(1)} KB
        </p>
      </div>
      <div className="space-y-2 text-sm text-white/60">
        <p className="break-all">{asset.url}</p>
        <p>{new Date(asset.createdAt).toLocaleString()}</p>
      </div>
      <div className="flex flex-col items-start gap-2">
        <button
          type="button"
          onClick={() => onSave(asset.id, { filename, altText })}
          className="rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-[0.24em] text-white/75 hover:border-white/40 hover:text-white"
        >
          Save
        </button>
        <button
          type="button"
          onClick={() => onDelete(asset.id)}
          className="text-xs uppercase tracking-[0.24em] text-red-300 hover:text-red-200"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

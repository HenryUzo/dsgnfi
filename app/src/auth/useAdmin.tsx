import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { ApiError } from "../lib/api";
import {
  adminLogout,
  adminMe,
  type AdminMembership,
  type AdminProfile,
  type AdminSiteSummary,
} from "../lib/cmsAdmin";
import { getAdminSites, switchAdminSite } from "../services/adminSites";

type AdminContextValue = {
  admin: AdminProfile | null;
  loading: boolean;
  switchingSite: boolean;
  availableSites: AdminSiteSummary[];
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  changeSite: (siteId: string) => Promise<void>;
};

const AdminContext = createContext<AdminContextValue | null>(null);

function getSitesForCurrentTenant(admin: AdminProfile | null) {
  if (!admin?.currentTenant) {
    return [];
  }

  const membership = admin.memberships.find(
    (entry: AdminMembership) => entry.tenant.id === admin.currentTenant?.id
  );

  return membership?.sites ?? [];
}

export function AdminProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [switchingSite, setSwitchingSite] = useState(false);
  const [discoveredSites, setDiscoveredSites] = useState<AdminSiteSummary[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);

    try {
      const profile = await adminMe();
      setAdmin(profile);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setAdmin(null);
      } else {
        setAdmin(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    let cancelled = false;

    async function loadSites() {
      if (!admin) {
        setDiscoveredSites([]);
        return;
      }

      const membershipSites = getSitesForCurrentTenant(admin);
      if (membershipSites.length > 0) {
        setDiscoveredSites(membershipSites);
        return;
      }

      try {
        const sites = await getAdminSites();
        if (!cancelled) {
          setDiscoveredSites(
            sites.map((site) => ({
              id: site.id,
              name: site.name,
              slug: site.slug,
              status: site.status,
              isDefault: site.isDefault,
            }))
          );
        }
      } catch {
        if (!cancelled) {
          setDiscoveredSites([]);
        }
      }
    }

    void loadSites();

    return () => {
      cancelled = true;
    };
  }, [admin]);

  const logout = useCallback(async () => {
    try {
      await adminLogout();
    } finally {
      setAdmin(null);
    }
  }, []);

  const changeSite = useCallback(
    async (siteId: string) => {
      setSwitchingSite(true);
      try {
        const switched = await switchAdminSite(siteId);
        setAdmin((current) => {
          if (!current) {
            return current;
          }

          return {
            ...current,
            currentTenant: switched.currentTenant,
            currentSite: switched.currentSite,
            currentRole: switched.currentRole,
          };
        });
        await refresh();
      } finally {
        setSwitchingSite(false);
      }
    },
    [refresh]
  );

  const value = useMemo<AdminContextValue>(
    () => ({
      admin,
      loading,
      switchingSite,
      availableSites: (() => {
        const membershipSites = getSitesForCurrentTenant(admin);
        return membershipSites.length > 0 ? membershipSites : discoveredSites;
      })(),
      refresh,
      logout,
      changeSite,
    }),
    [admin, loading, switchingSite, discoveredSites, refresh, logout, changeSite]
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error("useAdmin must be used within an AdminProvider.");
  }
  return context;
}

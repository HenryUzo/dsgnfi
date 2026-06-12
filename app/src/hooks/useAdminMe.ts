import { useEffect, useState } from "react";

import { ApiError } from "../lib/api";
import { adminMe, type AdminProfile } from "../lib/cmsAdmin";

export function useAdminMe() {
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const profile = await adminMe();
        if (!cancelled) {
          setAdmin(profile);
        }
      } catch (err) {
        if (!cancelled) {
          if (err instanceof ApiError && err.status === 401) {
            setAdmin(null);
          } else {
            setAdmin(null);
          }
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
  }, []);

  return { admin, loading, isAdmin: Boolean(admin) };
}

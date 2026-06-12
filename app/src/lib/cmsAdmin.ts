import { apiFetch } from "./api";

export type MembershipRole = "OWNER" | "ADMIN" | "EDITOR" | "VIEWER";

export type AdminSiteSummary = {
  id: string;
  name: string;
  slug: string;
  status: string;
  isDefault: boolean;
};

export type AdminTenantSummary = {
  id: string;
  name: string;
  slug: string;
};

export type AdminMembership = {
  tenant: AdminTenantSummary;
  role: MembershipRole;
  sites: AdminSiteSummary[];
};

export type AdminProfile = {
  ok: true;
  id: string;
  email: string;
  memberships: AdminMembership[];
  currentTenant: AdminTenantSummary | null;
  currentSite: AdminSiteSummary | null;
  currentRole: MembershipRole | null;
};

export type AdminSection = {
  page: string;
  section: string;
  draftData: Record<string, unknown>;
  publishedData: Record<string, unknown>;
  status: "DRAFT" | "PUBLISHED";
  publishedAt: string | null;
};

export async function adminLogin(email: string, password: string) {
  return apiFetch<{ ok: true }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function adminMe() {
  return apiFetch<AdminProfile>("/auth/me");
}

export async function adminLogout() {
  return apiFetch<{ ok: true }>("/auth/logout", {
    method: "POST",
  });
}

export async function getAdminSection(page: string, section: string) {
  return apiFetch<AdminSection>(
    `/admin/cms/section?page=${encodeURIComponent(
      page
    )}&section=${encodeURIComponent(section)}`
  );
}

export async function saveDraft(
  page: string,
  section: string,
  draftData: Record<string, unknown>
) {
  return apiFetch<{ ok: true }>("/admin/cms/section", {
    method: "PUT",
    body: JSON.stringify({ page, section, draftData }),
  });
}

export async function publishSection(page: string, section: string) {
  return apiFetch<{ ok: true }>("/admin/cms/publish", {
    method: "POST",
    body: JSON.stringify({ page, section }),
  });
}

export const login = adminLogin;
export const me = adminMe;
export const logout = adminLogout;
export const publish = publishSection;

export async function uploadMedia(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return apiFetch<{ ok: true; url: string }>("/admin/uploads", {
    method: "POST",
    body: formData,
  });
}

export async function uploadImage(file: File) {
  return uploadMedia(file);
}

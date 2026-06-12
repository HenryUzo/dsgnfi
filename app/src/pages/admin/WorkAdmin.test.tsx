import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";

import { WorkAdmin } from "./WorkAdmin";
import { useAdmin } from "../../auth/useAdmin";
import { ApiError } from "../../lib/api";
import {
  createWorkTag,
  getWorkMeta,
  listWorkProjects,
  listWorkTags,
} from "../../services/workAdmin";

vi.mock("../../auth/useAdmin", () => ({
  useAdmin: vi.fn(),
}));

vi.mock("../../cms/projectTemplates", () => ({
  getTemplateContent: vi.fn(() => ({ blocks: [] })),
}));

vi.mock("../../services/workAdmin", () => ({
  createWorkProject: vi.fn(),
  duplicateWorkProject: vi.fn(),
  createWorkTag: vi.fn(),
  deleteWorkTag: vi.fn(),
  getWorkMeta: vi.fn(),
  getWorkProject: vi.fn(),
  listWorkProjects: vi.fn(),
  listWorkTags: vi.fn(),
  publishWorkMeta: vi.fn(),
  publishWorkProject: vi.fn(),
  saveWorkMetaDraft: vi.fn(),
  updateWorkProject: vi.fn(),
  updateWorkTag: vi.fn(),
}));

vi.mock("../../components/admin/work/PageMetaTab", () => ({
  PageMetaTab: () => <div>Page Meta</div>,
}));

vi.mock("../../components/admin/work/TagsTab", () => ({
  TagsTab: ({
    onCreate,
  }: {
    onCreate: (input: { name: string; slug: string }) => void;
  }) => (
    <button type="button" onClick={() => onCreate({ name: "Tag", slug: "duplicate" })}>
      Create tag
    </button>
  ),
}));

vi.mock("../../components/admin/work/ProjectEditor", () => ({
  ProjectEditor: () => <div>Project Editor</div>,
}));

vi.mock("../../components/admin/work/TemplatePickerModal", () => ({
  TemplatePickerModal: () => null,
}));

vi.mock("../../components/admin/work/WorkTabs", () => ({
  WorkTabs: ({
    onChange,
  }: {
    activeTab: string;
    onChange: (tab: "page" | "tags" | "projects") => void;
  }) => (
    <div>
      <button type="button" onClick={() => onChange("page")}>
        Page
      </button>
      <button type="button" onClick={() => onChange("tags")}>
        Tags
      </button>
      <button type="button" onClick={() => onChange("projects")}>
        Projects
      </button>
    </div>
  ),
}));

describe("WorkAdmin", () => {
  let currentSiteId = "site-1";

  beforeEach(() => {
    vi.clearAllMocks();
    currentSiteId = "site-1";

    vi.mocked(useAdmin).mockImplementation(() => ({
      admin: {
        ok: true,
        id: "admin-1",
        email: "admin@dsgnfi.com",
        memberships: [],
        currentTenant: { id: "tenant-1", name: "Dsgnfi", slug: "dsgnfi" },
        currentSite: {
          id: currentSiteId,
          name: currentSiteId,
          slug: currentSiteId,
          status: "ACTIVE",
          isDefault: currentSiteId === "site-1",
        },
        currentRole: "OWNER",
      },
      loading: false,
      switchingSite: false,
      availableSites: [],
      refresh: vi.fn(),
      logout: vi.fn(),
      changeSite: vi.fn(),
    }));

    vi.mocked(getWorkMeta).mockResolvedValue({
      title: "Work",
      subtitle: "Subtitle",
      status: "DRAFT",
      publishedAt: null,
    });
    vi.mocked(listWorkTags).mockResolvedValue([]);
    vi.mocked(listWorkProjects).mockResolvedValue([]);
  });

  it("reloads site-scoped data when the active site changes", async () => {
    const view = render(
      <MemoryRouter>
        <WorkAdmin />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(getWorkMeta).toHaveBeenCalledTimes(1);
      expect(listWorkTags).toHaveBeenCalledTimes(1);
      expect(listWorkProjects).toHaveBeenCalledTimes(1);
    });

    currentSiteId = "site-2";
    view.rerender(
      <MemoryRouter>
        <WorkAdmin />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(getWorkMeta).toHaveBeenCalledTimes(2);
      expect(listWorkTags).toHaveBeenCalledTimes(2);
      expect(listWorkProjects).toHaveBeenCalledTimes(2);
    });
  });

  it("surfaces 409 tag conflicts with a site-specific message", async () => {
    vi.mocked(createWorkTag).mockRejectedValue(
      new ApiError("Conflict", 409)
    );

    render(
      <MemoryRouter>
        <WorkAdmin />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: "Tags" }));
    fireEvent.click(screen.getByRole("button", { name: "Create tag" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "A tag with this slug already exists for the current site."
      );
    });
  });
});

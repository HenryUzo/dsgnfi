import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProcessAdmin } from "./ProcessAdmin";
import { useAdmin } from "../../auth/useAdmin";
import { useProcessAdminContent } from "../../hooks/useProcessAdminContent";
import {
  publishProcessContent,
  saveProcessDraft,
} from "../../services/processAdmin";

vi.mock("../../auth/useAdmin", () => ({
  useAdmin: vi.fn(),
}));

vi.mock("../../hooks/useProcessAdminContent", () => ({
  useProcessAdminContent: vi.fn(),
}));

vi.mock("../../services/processAdmin", () => ({
  saveProcessDraft: vi.fn(),
  publishProcessContent: vi.fn(),
}));

vi.mock("../../components/work/ProjectRenderer", () => ({
  ProjectRenderer: () => <div>Process Renderer</div>,
}));

vi.mock("../../components/work/BlockEditorDrawer", () => ({
  BlockEditorDrawer: () => null,
}));

describe("ProcessAdmin", () => {
  const reload = vi.fn();
  const setContent = vi.fn();
  const setError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useAdmin).mockReturnValue({
      admin: {
        ok: true,
        id: "admin-1",
        email: "admin@dsgnfi.com",
        memberships: [],
        currentTenant: { id: "tenant-1", name: "Dsgnfi", slug: "dsgnfi" },
        currentSite: {
          id: "site-1",
          name: "Main Site",
          slug: "main",
          status: "ACTIVE",
          isDefault: true,
        },
        currentRole: "OWNER",
      },
      loading: false,
      switchingSite: false,
      availableSites: [],
      refresh: vi.fn(),
      logout: vi.fn(),
      changeSite: vi.fn(),
    });

    vi.mocked(useProcessAdminContent).mockReturnValue({
      content: {
        blocks: [
          {
            id: "hero-1",
            type: "processHeroAtticSalt",
            data: { title: "Process" },
          },
        ],
      },
      setContent,
      status: "DRAFT",
      publishedAt: null,
      loading: false,
      error: null,
      errorStatus: null,
      setError,
      reload,
      isEmpty: false,
    });

    vi.mocked(saveProcessDraft).mockResolvedValue({
      ok: true,
      data: { blocks: [] },
    });
    vi.mocked(publishProcessContent).mockResolvedValue({
      ok: true,
      data: { blocks: [] },
    });
  });

  it("saves and publishes through the current process endpoints", async () => {
    render(
      <MemoryRouter>
        <ProcessAdmin />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: "Save Draft" }));

    await waitFor(() => {
      expect(saveProcessDraft).toHaveBeenCalledTimes(1);
    });
    expect(reload).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Publish" }));

    await waitFor(() => {
      expect(saveProcessDraft).toHaveBeenCalledTimes(2);
      expect(publishProcessContent).toHaveBeenCalledTimes(1);
    });
  });
});

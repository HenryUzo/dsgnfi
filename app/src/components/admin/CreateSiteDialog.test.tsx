import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "../../lib/api";
import { CreateSiteDialog } from "./CreateSiteDialog";
import {
  createAdminSite,
  getAdminTemplate,
  getAdminTemplates,
} from "../../services/adminSites";

vi.mock("../../services/adminSites", () => ({
  createAdminSite: vi.fn(),
  getAdminTemplates: vi.fn(),
  getAdminTemplate: vi.fn(),
}));

describe("CreateSiteDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(getAdminTemplates).mockResolvedValue([
      {
        id: "template-agency-starter",
        key: "agency-starter",
        name: "Agency Starter",
        category: "agency",
        description: "Agency template",
        status: "ACTIVE",
        sourceType: "STARTER",
        activeVersion: { version: "1.0.0", manifestKey: "agency-starter" },
      },
      {
        id: "template-clinic-starter",
        key: "clinic-starter",
        name: "Clinic Starter",
        category: "healthcare",
        description: "Healthcare template",
        status: "ACTIVE",
        sourceType: "STARTER",
        activeVersion: { version: "1.0.0", manifestKey: "clinic-starter" },
      },
    ]);

    vi.mocked(getAdminTemplate).mockImplementation(async (templateKey: string) => ({
      id: `template-${templateKey}`,
      key: templateKey,
      name: templateKey === "clinic-starter" ? "Clinic Starter" : "Agency Starter",
      category: templateKey === "clinic-starter" ? "healthcare" : "agency",
      description: "Template detail",
      status: "ACTIVE",
      sourceType: "STARTER",
      activeVersion: {
        id: "tv-1",
        version: "1.0.0",
        manifestKey: templateKey,
      },
      manifest: {
        key: templateKey,
        version: "1.0.0",
        name: "Template",
        category: templateKey === "clinic-starter" ? "healthcare" : "agency",
        description: "Template detail",
        starterNavigation: { primary: ["Home"] },
        starterContentHints: { processEnabled: true, workEnabled: false },
        editableFieldGroups: ["branding"],
        starterSiteSettings: {
          tagline: "Starter",
          contactEmail: "hello@example.com",
          locale: "en",
          timezone: "Africa/Lagos",
        },
      },
    }));
  });

  it("loads templates and submits a site create request", async () => {
    const onCreated = vi.fn();
    vi.mocked(createAdminSite).mockResolvedValue({
      id: "site-2",
      name: "Clinic West",
      slug: "clinic-west",
      status: "DRAFT",
      isDefault: false,
      template: null,
      templateVersion: null,
      settings: null,
    });

    render(<CreateSiteDialog open onClose={vi.fn()} onCreated={onCreated} />);

    await waitFor(() => {
      expect(getAdminTemplates).toHaveBeenCalled();
    });

    fireEvent.change(screen.getByPlaceholderText("Clinic West"), {
      target: { value: "Clinic West" },
    });

    expect(screen.getByPlaceholderText("clinic-west")).toHaveValue("clinic-west");

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.change(screen.getByLabelText("Tagline"), {
      target: { value: "Care that scales" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Review" }));

    fireEvent.click(screen.getByRole("button", { name: "Create Site" }));

    await waitFor(() => {
      expect(createAdminSite).toHaveBeenCalledWith({
        name: "Clinic West",
        slug: "clinic-west",
        templateKey: "agency-starter",
      });
      expect(onCreated).toHaveBeenCalled();
    });
  });

  it("shows duplicate slug errors inline", async () => {
    vi.mocked(createAdminSite).mockRejectedValue(
      new ApiError("Site slug already exists for this tenant.", 409)
    );

    render(<CreateSiteDialog open onClose={vi.fn()} onCreated={vi.fn()} />);

    await waitFor(() => {
      expect(getAdminTemplates).toHaveBeenCalled();
    });

    fireEvent.change(screen.getByPlaceholderText("Clinic West"), {
      target: { value: "Clinic West" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    fireEvent.click(screen.getByRole("button", { name: "Review" }));

    fireEvent.click(screen.getByRole("button", { name: "Create Site" }));

    await waitFor(() => {
      expect(
        screen.getByText("Site slug already exists for this tenant.")
      ).toBeInTheDocument();
    });
  });
});

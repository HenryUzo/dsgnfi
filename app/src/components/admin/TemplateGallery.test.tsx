import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TemplateGallery } from "./TemplateGallery";
import type { TemplateCategory } from "../../services/adminSites";

function GalleryHarness() {
  const [category, setCategory] = useState<"all" | TemplateCategory>("all");
  const [selectedKey, setSelectedKey] = useState<string | null>("agency-starter");

  return (
    <TemplateGallery
      templates={[
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
      ]}
      selectedKey={selectedKey}
      onSelect={setSelectedKey}
      selectedTemplate={{
        id: "template-agency-starter",
        key: "agency-starter",
        name: "Agency Starter",
        category: "agency",
        description: "Agency template",
        status: "ACTIVE",
        sourceType: "STARTER",
        activeVersion: {
          id: "tv-1",
          version: "1.0.0",
          manifestKey: "agency-starter",
        },
        manifest: {
          key: "agency-starter",
          version: "1.0.0",
          name: "Agency Starter",
          category: "agency",
          description: "Agency template",
          starterNavigation: { primary: ["Work"] },
          starterContentHints: { processEnabled: true, workEnabled: true },
          editableFieldGroups: ["branding"],
          starterSiteSettings: {
            tagline: "Built for agencies",
            contactEmail: "hello@example.com",
            locale: "en",
            timezone: "Africa/Lagos",
          },
        },
      }}
      category={category}
      onCategoryChange={setCategory}
    />
  );
}

describe("TemplateGallery", () => {
  it("filters templates by category", () => {
    render(<GalleryHarness />);

    expect(screen.getAllByText("Agency Starter")).toHaveLength(2);
    expect(screen.getAllByText("Clinic Starter")).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Healthcare" }));

    expect(screen.queryAllByText("Agency Starter")).toHaveLength(1);
    expect(screen.getAllByText("Clinic Starter")).toHaveLength(1);
  });
});

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Process } from "./Process";

vi.mock("../hooks/useProcessPublicContent", () => ({
  useProcessPublicContent: vi.fn(),
}));

vi.mock("../components/work/ProjectRenderer", () => ({
  ProjectRenderer: () => <div>Process renderer</div>,
}));

describe("Process page", () => {
  it("renders an explicit empty state when no published content exists", async () => {
    const { useProcessPublicContent } = await import("../hooks/useProcessPublicContent");

    vi.mocked(useProcessPublicContent).mockReturnValue({
      content: null,
      loading: false,
      error: null,
      isEmpty: true,
    });

    render(<Process />);

    expect(screen.getByText("No published process content yet.")).toBeInTheDocument();
    expect(screen.queryByText("Process renderer")).not.toBeInTheDocument();
  });
});

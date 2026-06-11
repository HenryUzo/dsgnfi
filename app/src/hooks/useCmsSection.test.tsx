import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { useCmsSection } from "./useCmsSection";
import { apiFetch } from "../lib/api";
import { PreviewTokenProvider } from "../site/PreviewTokenContext";

vi.mock("../lib/api", () => ({
  apiFetch: vi.fn(),
}));

function Probe() {
  const state = useCmsSection<{ headline?: string }>("home", "hero", null, 0);

  return (
    <div>
      <div data-testid="status">{state.status}</div>
      <div data-testid="data">{state.data?.headline ?? "null"}</div>
      <div data-testid="error">{state.error ?? "none"}</div>
    </div>
  );
}

describe("useCmsSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("normalizes a present CMS section as ready", async () => {
    vi.mocked(apiFetch).mockResolvedValue({
      page: "home",
      section: "hero",
      data: { headline: "Hello" },
    });

    render(
      <MemoryRouter>
        <Probe />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("ready");
    });

    expect(screen.getByTestId("data")).toHaveTextContent("Hello");
  });

  it("normalizes a null CMS section as empty", async () => {
    vi.mocked(apiFetch).mockResolvedValue({
      page: "home",
      section: "hero",
      data: null,
    });

    render(
      <MemoryRouter>
        <Probe />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("empty");
    });

    expect(screen.getByTestId("data")).toHaveTextContent("null");
  });

  it("surfaces errors without pretending content exists", async () => {
    vi.mocked(apiFetch).mockRejectedValue(new Error("Request failed"));

    render(
      <MemoryRouter>
        <Probe />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("error");
    });

    expect(screen.getByTestId("error")).toHaveTextContent("Request failed");
    expect(screen.getByTestId("data")).toHaveTextContent("null");
  });

  it("uses the preview CMS endpoint inside home preview mode", async () => {
    vi.mocked(apiFetch).mockResolvedValue({
      page: "home",
      section: "hero",
      data: { headline: "Preview Hero" },
    });

    render(
      <MemoryRouter initialEntries={["/preview/pages/home?token=abc"]}>
        <PreviewTokenProvider pageKey="home" token="abc">
          <Probe />
        </PreviewTokenProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("ready");
    });

    expect(apiFetch).toHaveBeenCalledWith("/public/preview/cms/section?page=home&section=hero&token=abc");
  });
});

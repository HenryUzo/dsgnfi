import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { RequireAdmin } from "./RequireAdmin";
import { useAdmin } from "./useAdmin";

vi.mock("./useAdmin", () => ({
  useAdmin: vi.fn(),
}));

describe("RequireAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects unauthenticated users to /admin/login", () => {
    vi.mocked(useAdmin).mockReturnValue({
      admin: null,
      loading: false,
      switchingSite: false,
      availableSites: [],
      refresh: vi.fn(),
      logout: vi.fn(),
      changeSite: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <Routes>
          <Route path="/admin/login" element={<div>Admin Login</div>} />
          <Route
            path="/admin"
            element={
              <RequireAdmin>
                <div>Protected Admin</div>
              </RequireAdmin>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("Admin Login")).toBeInTheDocument();
  });
});

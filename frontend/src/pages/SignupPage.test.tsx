// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
const { signup } = vi.hoisted(() => ({ signup: vi.fn() }));
vi.mock("../store/useAuthStore", () => ({
  useAuthStore: () => ({ signup, isSigningUp: false }),
}));
vi.mock("react-hot-toast", () => ({
  default: { error: vi.fn(() => "truthy-toast-id") },
}));
import SignupPage from "./SignupPage";
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
it("does not submit when client validation fails even if toast returns an ID", () => {
  render(
    <MemoryRouter>
      <SignupPage />
    </MemoryRouter>,
  );
  const button = screen.getByRole("button", { name: "Sign up" });
  fireEvent.submit(button.closest("form")!);
  expect(signup).not.toHaveBeenCalled();
});

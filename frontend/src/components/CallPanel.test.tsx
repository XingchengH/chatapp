// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("../lib/axios", () => ({ axiosInstance: { get, post } }));
vi.mock("../store/useAuthStore", () => ({
  useAuthStore: (select: (state: unknown) => unknown) =>
    select({ authUser: { _id: "alice" } }),
}));
vi.mock("../store/useCallStore", () => ({
  useCallStore: Object.assign(
    (select: (state: unknown) => unknown) => select({ session: null }),
    { getState: () => ({ leave: vi.fn(), join: vi.fn() }) },
  ),
}));
vi.mock("../store/useChatStore", () => ({
  useChatStore: (select: (state: unknown) => unknown) => select({ users: [] }),
}));
vi.mock("@livekit/components-react", () => ({
  LiveKitRoom: () => null,
  VideoConference: () => null,
}));
import CallPanel from "./CallPanel";
const invitation = (status: string) => ({
  _id: "call",
  hostId: { _id: "host", fullName: "Host" },
  members: [
    {
      userId: "alice",
      status,
      invitedUntil: new Date(Date.now() + 60000).toISOString(),
    },
  ],
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.useRealTimers();
});
it("does not show accepted calls as incoming invitations", async () => {
  get.mockResolvedValue({ data: [invitation("accepted")] });
  render(<CallPanel />);
  await waitFor(() => expect(get).toHaveBeenCalled());
  expect(screen.queryByText(/invited you/)).toBeNull();
});
it("a stale refresh cannot restore a successfully declined invitation", async () => {
  vi.useFakeTimers();
  get.mockResolvedValueOnce({ data: [invitation("invited")] });
  post.mockResolvedValue({ data: { ok: true } });
  let finish!: (value: unknown) => void;
  get.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  await act(async () => {
    render(<CallPanel />);
  });
  expect(screen.getByText(/invited you/)).toBeTruthy();
  await act(async () => {
    vi.advanceTimersByTime(5000);
  });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Decline" }));
  });
  expect(screen.queryByText(/invited you/)).toBeNull();
  await act(async () => {
    finish({ data: [invitation("invited")] });
  });
  expect(screen.queryByText(/invited you/)).toBeNull();
});

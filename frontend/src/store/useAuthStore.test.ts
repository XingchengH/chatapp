import { beforeEach, expect, it, vi } from "vitest";
vi.mock("../lib/axios", () => ({
  API_ORIGIN: "",
  axiosInstance: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}));
vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));
vi.mock("socket.io-client", () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    removeAllListeners: vi.fn(),
  })),
}));
import { io } from "socket.io-client";
import { axiosInstance } from "../lib/axios";
import { useAuthStore, type AuthUser } from "./useAuthStore";
import { useChatStore } from "./useChatStore";
const user: AuthUser = {
  _id: "alice",
  fullName: "Alice",
  profilePic: "",
  email: "alice@example.com",
  createdAt: "",
  updatedAt: "",
};
beforeEach(() => {
  useAuthStore.getState().clearSession();
  vi.clearAllMocks();
});
it("uses cookie credentials and creates only one socket while connecting", () => {
  useAuthStore.setState({ authUser: user });
  useAuthStore.getState().connectSocket();
  useAuthStore.getState().connectSocket();
  expect(io).toHaveBeenCalledTimes(1);
  expect(io).toHaveBeenCalledWith("", {
    withCredentials: true,
    autoConnect: false,
  });
});
it("clears conversation state and disconnects the socket on logout", async () => {
  useAuthStore.setState({ authUser: user });
  useAuthStore.getState().connectSocket();
  const socket = useAuthStore.getState().socket!;
  useChatStore.getState().setSelectedUser(user);
  vi.mocked(axiosInstance.post).mockResolvedValueOnce({});
  await useAuthStore.getState().logout();
  expect(socket.disconnect).toHaveBeenCalled();
  expect(useAuthStore.getState().authUser).toBeNull();
  expect(useChatStore.getState().selectedUser).toBeNull();
});
it("does not restore a session from an auth check completed after logout", async () => {
  let finish!: (value: { data: AuthUser }) => void;
  vi.mocked(axiosInstance.get).mockReturnValueOnce(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  const pending = useAuthStore.getState().checkAuth();
  useAuthStore.getState().clearSession();
  finish({ data: user });
  await pending;
  expect(useAuthStore.getState().authUser).toBeNull();
});

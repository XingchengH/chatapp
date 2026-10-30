import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("../lib/axios", () => ({
  axiosInstance: { get: vi.fn(), post: vi.fn() },
}));
vi.mock("react-hot-toast", () => ({ default: { error: vi.fn() } }));
import { axiosInstance } from "../lib/axios";
import { useChatStore, type Message } from "./useChatStore";
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};
const message = (
  _id: string,
  senderId = "me",
  receiverId = "alice",
): Message => ({
  _id,
  senderId,
  receiverId,
  text: _id,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
});
const payload = { text: "hello", image: null, clientMessageId: "test-request" };
beforeEach(() => {
  useChatStore.getState().reset();
  vi.resetAllMocks();
});
describe("message reliability", () => {
  it("preserves messages received during a pending send and deduplicates socket echoes", async () => {
    const request = deferred<{ data: Message }>();
    vi.mocked(axiosInstance.post).mockReturnValueOnce(request.promise);
    const pending = useChatStore.getState().sendMessage(payload, "alice");
    useChatStore
      .getState()
      .receiveMessage(message("incoming", "alice", "me"), "me");
    useChatStore.getState().receiveMessage(message("outgoing"), "me");
    request.resolve({ data: message("outgoing") });
    await pending;
    expect(
      useChatStore.getState().conversations.alice.messages.map((m) => m._id),
    ).toEqual(["incoming", "outgoing"]);
  });
  it("keeps late history in its original conversation", async () => {
    const alice = deferred<{
      data: { messages: Message[]; nextCursor: null };
    }>();
    const bob = deferred<{ data: { messages: Message[]; nextCursor: null } }>();
    vi.mocked(axiosInstance.get)
      .mockReturnValueOnce(alice.promise)
      .mockReturnValueOnce(bob.promise);
    const first = useChatStore.getState().getMessages("alice");
    useChatStore
      .getState()
      .setSelectedUser({ _id: "bob", fullName: "Bob", profilePic: "" });
    const second = useChatStore.getState().getMessages("bob");
    bob.resolve({
      data: {
        messages: [message("bob-message", "bob", "me")],
        nextCursor: null,
      },
    });
    await second;
    alice.resolve({
      data: { messages: [message("alice-message")], nextCursor: null },
    });
    await first;
    const state = useChatStore.getState();
    expect(state.selectedUser?._id).toBe("bob");
    expect(state.conversations.bob.messages[0]._id).toBe("bob-message");
    expect(state.conversations.alice.messages[0]._id).toBe("alice-message");
  });
  it("preserves real-time messages arriving while history is loading", async () => {
    const request = deferred<{
      data: { messages: Message[]; nextCursor: null };
    }>();
    vi.mocked(axiosInstance.get).mockReturnValueOnce(request.promise);
    const pending = useChatStore.getState().getMessages("alice");
    useChatStore.getState().receiveMessage(message("new", "alice", "me"), "me");
    request.resolve({ data: { messages: [message("old")], nextCursor: null } });
    await pending;
    expect(useChatStore.getState().conversations.alice.messages).toHaveLength(
      2,
    );
  });
  it("rejects a failed send so the composer can retain its draft", async () => {
    vi.mocked(axiosInstance.post).mockRejectedValueOnce(new Error("offline"));
    await expect(
      useChatStore.getState().sendMessage(payload, "alice"),
    ).rejects.toThrow("offline");
  });
  it("discards pending data after logout", async () => {
    const request = deferred<{ data: Message }>();
    vi.mocked(axiosInstance.post).mockReturnValueOnce(request.promise);
    const pending = useChatStore.getState().sendMessage(payload, "alice");
    useChatStore.getState().reset();
    request.resolve({ data: message("old-session") });
    await pending;
    expect(useChatStore.getState().conversations).toEqual({});
  });
  it("loads older pages with the server cursor and deduplicates overlaps", async () => {
    vi.mocked(axiosInstance.get)
      .mockResolvedValueOnce({
        data: { messages: [message("b")], nextCursor: "cursor" },
      })
      .mockResolvedValueOnce({
        data: { messages: [message("a"), message("b")], nextCursor: null },
      });
    await useChatStore.getState().getMessages("alice");
    await useChatStore.getState().getMessages("alice", true);
    expect(axiosInstance.get).toHaveBeenLastCalledWith("/messages/alice", {
      params: { before: "cursor" },
    });
    expect(
      useChatStore.getState().conversations.alice.messages.map((m) => m._id),
    ).toEqual(["a", "b"]);
  });
  it("ignores directory responses from a previous search", async () => {
    const old = deferred<{ data: { users: []; nextCursor: null } }>();
    vi.mocked(axiosInstance.get)
      .mockReturnValueOnce(old.promise)
      .mockResolvedValueOnce({
        data: { users: [{ _id: "bob" }], nextCursor: null },
      });
    const pending = useChatStore.getState().getUsers("alice");
    await useChatStore.getState().getUsers("bob");
    old.resolve({ data: { users: [], nextCursor: null } });
    await pending;
    expect(useChatStore.getState().users[0]._id).toBe("bob");
  });
});

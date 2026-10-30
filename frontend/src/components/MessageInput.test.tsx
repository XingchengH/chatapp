// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
vi.mock("../store/useChatStore", () => ({
  useChatStore: (selector: (state: unknown) => unknown) =>
    selector({ sendMessage }),
}));
vi.mock("react-hot-toast", () => ({ default: { error: vi.fn() } }));
const { sendMessage } = vi.hoisted(() => ({ sendMessage: vi.fn() }));
import MessageInput from "./MessageInput";
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
it("retains failed drafts and retries the same request ID; clears only on success", async () => {
  sendMessage
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValueOnce(undefined);
  render(<MessageInput userId="alice" />);
  const input = screen.getByRole("textbox", {
    name: "Message",
  }) as HTMLInputElement;
  fireEvent.change(input, { target: { value: "Keep my message" } });
  fireEvent.click(screen.getByRole("button", { name: "Send message" }));
  await screen.findByRole("alert");
  expect(input.value).toBe("Keep my message");
  const first = sendMessage.mock.calls[0][0];
  fireEvent.click(screen.getByRole("button", { name: "Retry message" }));
  await waitFor(() => expect(input.value).toBe(""));
  expect(sendMessage.mock.calls[1][0].clientMessageId).toBe(
    first.clientMessageId,
  );
});
it("blocks duplicate sends while a request is pending", async () => {
  let finish!: () => void;
  sendMessage.mockReturnValueOnce(
    new Promise<void>((resolve) => {
      finish = resolve;
    }),
  );
  render(<MessageInput userId="alice" />);
  fireEvent.change(screen.getByRole("textbox", { name: "Message" }), {
    target: { value: "once" },
  });
  const form = screen
    .getByRole("button", { name: "Send message" })
    .closest("form")!;
  fireEvent.submit(form);
  fireEvent.submit(form);
  expect(sendMessage).toHaveBeenCalledTimes(1);
  finish();
  await waitFor(() =>
    expect((screen.getByRole("textbox") as HTMLInputElement).value).toBe(""),
  );
});

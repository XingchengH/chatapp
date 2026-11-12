// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import VoiceRecorder from "./VoiceRecorder";
const { send, stopTrack } = vi.hoisted(() => ({
  send: vi.fn(),
  stopTrack: vi.fn(),
}));
vi.mock("../store/useChatStore", () => ({
  useChatStore: { getState: () => ({ sendMessage: send }) },
}));
class Recorder {
  static isTypeSupported() {
    return true;
  }
  state = "inactive";
  mimeType = "audio/webm";
  ondataavailable?: (event: { data: Blob }) => void;
  onstop?: () => void;
  start() {
    this.state = "recording";
  }
  stop() {
    this.state = "inactive";
    this.ondataavailable?.({ data: new Blob(["audio"]) });
    this.onstop?.();
  }
}
beforeEach(() => {
  vi.stubGlobal("MediaRecorder", Recorder);
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: {
      getUserMedia: vi
        .fn()
        .mockResolvedValue({ getTracks: () => [{ stop: stopTrack }] }),
    },
  });
  URL.createObjectURL = vi.fn(() => "blob:recording");
  URL.revokeObjectURL = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  send.mockReset();
  stopTrack.mockReset();
});
it("previews before sending and retries the same recording ID after failure", async () => {
  send
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValueOnce(undefined);
  render(<VoiceRecorder userId="alice" />);
  fireEvent.click(screen.getByRole("button", { name: "Record voice message" }));
  fireEvent.click(
    await screen.findByRole("button", { name: "Stop recording" }),
  );
  expect(stopTrack).toHaveBeenCalled();
  expect(send).not.toHaveBeenCalled();
  expect(screen.getByLabelText("Voice message preview")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Send voice message" }));
  await screen.findByRole("alert");
  const original = send.mock.calls[0][0];
  fireEvent.click(screen.getByRole("button", { name: "Send voice message" }));
  await screen.findByRole("button", { name: "Record voice message" });
  expect(send.mock.calls[1][0].clientMessageId).toBe(original.clientMessageId);
  expect(send.mock.calls[1][0].audio).toBe(original.audio);
});
it("stops the microphone when leaving the conversation", async () => {
  const view = render(<VoiceRecorder userId="alice" />);
  fireEvent.click(screen.getByRole("button", { name: "Record voice message" }));
  await screen.findByRole("button", { name: "Stop recording" });
  view.unmount();
  expect(stopTrack).toHaveBeenCalled();
  expect(send).not.toHaveBeenCalled();
});
it("shows microphone permission failure without creating a draft", async () => {
  vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce(
    new Error("Permission denied"),
  );
  render(<VoiceRecorder userId="alice" />);
  fireEvent.click(screen.getByRole("button", { name: "Record voice message" }));
  await waitFor(() =>
    expect(screen.getByRole("alert").textContent).toContain(
      "Permission denied",
    ),
  );
  expect(send).not.toHaveBeenCalled();
});

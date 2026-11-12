import { useEffect, useRef, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { Mic, Loader2 } from "lucide-react";

export default function VoiceRecorder({ userId }: { userId: string }) {
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const alive = useRef(true);
  const [recording, setRecording] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [draft, setDraft] = useState<{
    blob: Blob;
    url: string;
    id: string;
  } | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (recorder.current?.state === "recording") recorder.current.stop();
      stream.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);
  useEffect(
    () => () => {
      if (draft) URL.revokeObjectURL(draft.url);
    },
    [draft],
  );
  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(
      () => setSeconds((value) => value + 1),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [recording]);
  useEffect(() => {
    if (seconds >= 300 && recorder.current?.state === "recording")
      recorder.current.stop();
  }, [seconds]);
  async function start() {
    setError("");
    setRequesting(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder)
        throw new Error(
          "Recording is unavailable in this browser. Use HTTPS and a supported browser.",
        );
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!alive.current) {
        media.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = media;
      const mimeType = [
        "audio/webm;codecs=opus",
        "audio/mp4",
        "audio/ogg;codecs=opus",
      ].find((type) => MediaRecorder.isTypeSupported(type));
      const instance = new MediaRecorder(
        media,
        mimeType ? { mimeType } : undefined,
      );
      recorder.current = instance;
      const chunks: Blob[] = [];
      let bytes = 0;
      instance.ondataavailable = (event) => {
        chunks.push(event.data);
        bytes += event.data.size;
        if (bytes > 10 * 1024 * 1024 && instance.state === "recording")
          instance.stop();
      };
      instance.onstop = () => {
        media.getTracks().forEach((track) => track.stop());
        if (!alive.current) return;
        setRecording(false);
        const blob = new Blob(chunks, { type: instance.mimeType });
        if (!blob.size || blob.size > 10 * 1024 * 1024) {
          setError("Recording is empty or exceeds 10 MB. Please record again.");
          return;
        }
        setDraft({
          blob,
          url: URL.createObjectURL(blob),
          id: crypto.randomUUID(),
        });
      };
      instance.onerror = () => {
        media.getTracks().forEach((track) => track.stop());
        if (alive.current) {
          setRecording(false);
          setError("Recording failed. Please try again.");
        }
      };
      instance.start(1000);
      setSeconds(0);
      setRecording(true);
    } catch (cause) {
      stream.current?.getTracks().forEach((track) => track.stop());
      if (alive.current)
        setError(
          cause instanceof Error ? cause.message : "Microphone access failed",
        );
    } finally {
      if (alive.current) setRequesting(false);
    }
  }
  async function send() {
    if (!draft || sending) return;
    setSending(true);
    setError("");
    try {
      await useChatStore.getState().sendMessage(
        {
          text: "",
          image: null,
          audio: draft.blob,
          clientMessageId: draft.id,
        },
        userId,
      );
      if (alive.current) setDraft(null);
    } catch {
      if (alive.current)
        setError("Voice message not sent. Your recording is ready to retry.");
    } finally {
      if (alive.current) setSending(false);
    }
  }
  return (
    <div className="shrink-0">
      <button
        type="button"
        className={"btn btn-circle btn-sm " + (recording ? "btn-error" : "")}
        aria-label={
          requesting ? "Waiting for microphone" : "Record voice message"
        }
        title="Record voice message"
        disabled={requesting || recording || sending || Boolean(draft)}
        onClick={() => void start()}
      >
        {requesting ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <Mic size={18} />
        )}
      </button>
      {(error || recording || draft) && (
        <div className="absolute bottom-full right-3 mb-2 z-40 w-[min(360px,calc(100vw-2rem))] rounded-xl border border-base-300 bg-base-100 p-3 shadow-lg space-y-2">
          {error && (
            <p role="alert" className="text-error text-sm">
              {error}
            </p>
          )}
          {recording ? (
            <div className="flex items-center gap-2">
              <span role="status">
                Recording {Math.floor(seconds / 60)}:
                {String(seconds % 60).padStart(2, "0")}
              </span>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => recorder.current?.stop()}
              >
                Stop recording
              </button>
            </div>
          ) : draft ? (
            <div className="flex flex-wrap items-center gap-2">
              <audio
                controls
                src={draft.url}
                aria-label="Voice message preview"
                className="max-w-full"
              />
              <button
                type="button"
                className="btn btn-sm"
                disabled={sending}
                onClick={() => setDraft(null)}
              >
                Discard
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={sending}
                onClick={() => void send()}
              >
                {sending ? "Sending…" : "Send voice message"}
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

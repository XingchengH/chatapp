import { lazy, Suspense, useRef, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { Image, Send, SmilePlus, X, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { useClickOutside } from "../lib/CustomHook";
import { IMAGE_ACCEPT, imageError } from "../lib/uploads";

const EmojiPicker = lazy(() => import("emoji-picker-react"));
export default function MessageInput({ userId }: { userId: string }) {
  const [text, setText] = useState("");
  const [imgPreview, setImgPreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);
  const [readingImage, setReadingImage] = useState(false);
  const pending = useRef(false);
  const attempt = useRef<{ content: string; id: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sendMessage = useChatStore((state) => state.sendMessage);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const toggleBtnRef = useRef<HTMLButtonElement>(null);
  useClickOutside([pickerRef, toggleBtnRef], () => setShowEmojiPicker(false));

  const handleImgChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const error = imageError(file);
    if (error) {
      toast.error(error);
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    setReadingImage(true);
    reader.onload = () => {
      setImgPreview(reader.result as string);
      setFailed(false);
    };
    reader.onerror = () => toast.error("Could not read that image");
    reader.onloadend = () => setReadingImage(false);
    reader.readAsDataURL(file);
  };
  const handleSendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (pending.current || readingImage || (!text.trim() && !imgPreview))
      return;
    const content = JSON.stringify([text.trim(), imgPreview]);
    if (attempt.current?.content !== content)
      attempt.current = { content, id: crypto.randomUUID() };
    pending.current = true;
    setSending(true);
    setFailed(false);
    try {
      await sendMessage(
        {
          text: text.trim(),
          image: imgPreview,
          clientMessageId: attempt.current.id,
        },
        userId,
      );
      setText("");
      setImgPreview(null);
      attempt.current = null;
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch {
      setFailed(true);
    } finally {
      pending.current = false;
      setSending(false);
    }
  };
  return (
    <div className="p-3 sm:p-4 w-full">
      {imgPreview && (
        <div className="mb-3 relative w-fit">
          <img
            src={imgPreview}
            alt="Attachment preview"
            className="max-h-36 max-w-full rounded-lg"
          />
          <button
            type="button"
            aria-label="Remove attachment"
            disabled={sending}
            className="absolute -top-2 -right-2 btn btn-circle btn-xs"
            onClick={() => {
              setImgPreview(null);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
          >
            <X size={14} />
          </button>
        </div>
      )}
      {failed && (
        <p role="alert" className="text-error text-sm mb-2">
          Message not sent. Your draft is saved. Try sending again.
        </p>
      )}
      <form onSubmit={handleSendMessage} className="flex items-center gap-2">
        <input
          aria-label="Message"
          type="text"
          maxLength={10000}
          disabled={sending}
          className="input input-bordered min-w-0 flex-1"
          placeholder="Type a message..."
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setFailed(false);
          }}
        />
        <input
          type="file"
          accept={IMAGE_ACCEPT}
          aria-label="Choose image"
          className="hidden"
          ref={fileInputRef}
          onChange={handleImgChange}
          disabled={sending || readingImage}
        />
        <button
          type="button"
          aria-label="Attach image"
          className="btn btn-circle btn-sm"
          disabled={sending || readingImage}
          onClick={() => fileInputRef.current?.click()}
        >
          <Image size={18} />
        </button>
        <button
          type="button"
          aria-label="Choose emoji"
          aria-expanded={showEmojiPicker}
          disabled={sending}
          className="btn btn-circle btn-sm"
          ref={toggleBtnRef}
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
        >
          <SmilePlus size={18} />
        </button>
        {showEmojiPicker && (
          <div
            className="absolute right-4 bottom-24 z-50 max-w-[calc(100vw-2rem)]"
            ref={pickerRef}
          >
            <Suspense fallback={<p role="status">Loading emoji…</p>}>
              <EmojiPicker
                width="min(350px, calc(100vw - 2rem))"
                onEmojiClick={(emoji) => {
                  setText((text) => (text + emoji.emoji).slice(0, 10000));
                  setShowEmojiPicker(false);
                }}
              />
            </Suspense>
          </div>
        )}
        <button
          type="submit"
          aria-label={failed ? "Retry message" : "Send message"}
          className="btn btn-primary btn-circle btn-sm"
          disabled={sending || readingImage || (!text.trim() && !imgPreview)}
        >
          {sending ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Send size={18} />
          )}
        </button>
      </form>
    </div>
  );
}

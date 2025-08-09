import { useRef, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { Image, Send, SmilePlus, X } from "lucide-react";
import toast from "react-hot-toast";
import EmojiPicker from "emoji-picker-react";
import { useClickOutside } from "../lib/CustomHook";

export default function MessageInput() {
  const [text, setText] = useState<string>("");
  const [imgPreview, setImgPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { sendMessage } = useChatStore();

  // emoji picker
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const toggleBtnRef = useRef<HTMLButtonElement>(null);

  useClickOutside([pickerRef, toggleBtnRef], () => setShowEmojiPicker(false));

  const handleImgChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file?.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImgPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() && !imgPreview) return;

    try {
      await sendMessage({
        text: text.trim(),
        image: imgPreview,
      });

      setText("");
      setImgPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const removeImgPreview = (): void => {
    setImgPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="p-4 w-full">
      {imgPreview && (
        <div className="mb-3 flex items-center gap-2">
          <div className="relative">
            <img src={imgPreview} alt="Preview" />
            <button
              type="button"
              className="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-base-300 flex items-center justify-center"
              onClick={removeImgPreview}
            >
              <X className="size-3" />
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSendMessage} className="flex items-center gap-2">
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            className="w-full input input-bordered rounded-lg input-sm sm:input-md focus:outline-none"
            placeholder="Type a message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImgChange}
          />
          <button
            type="button"
            className={`hidden sm:flex btn btn-circle ${
              imgPreview ? "text-emerald-500" : "text-zinc-400"
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <Image size={20} />
          </button>
          {/* Emoji picker */}
          <button
            type="button"
            className="hidden sm:flex btn btn-circle"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            ref={toggleBtnRef}
          >
            <span
              role="img"
              aria-label="emoji-picker"
              className={`${
                showEmojiPicker ? "text-emerald-500" : "text-zinc-400"
              }`}
            >
              <SmilePlus size={20} />
            </span>
          </button>

          {showEmojiPicker && (
            <div className="absolute right-10 bottom-30 z-50" ref={pickerRef}>
              <EmojiPicker
                onEmojiClick={(emoji) => {
                  setText((prevText) => prevText + emoji.emoji);
                  setShowEmojiPicker(false);
                }}
              />
            </div>
          )}
        </div>
        <button
          type="submit"
          className="btn btn-sm btn-circle"
          disabled={!text.trim() && !imgPreview}
        >
          <Send size={20} />
        </button>
      </form>
    </div>
  );
}

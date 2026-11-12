import { X, Video, Loader2 } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { useCallStore } from "../store/useCallStore";
import toast from "react-hot-toast";
import { errorMessage } from "../lib/errors";

export default function ChatWindowHeader() {
  const { selectedUser, setSelectedUser } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const starting = useCallStore((state) => state.starting);

  return (
    <div className="p-2.5 border-b border-base-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="avatar">
            <div className="size-10 rounded-full relative">
              <img
                src={selectedUser?.profilePic || "/avatar.png"}
                alt={selectedUser?.fullName}
              />
            </div>
          </div>

          {/* User info */}
          <div>
            <h3 className="font-medium">{selectedUser?.fullName}</h3>
            <p className="text-sm text-base-content/70">
              {selectedUser?._id && onlineUsers.includes(selectedUser._id)
                ? "Online"
                : "Offline"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn btn-circle btn-sm"
            aria-label={starting ? "Calling" : "Start video call"}
            title="Start video call"
            disabled={starting}
            onClick={() => {
              if (selectedUser)
                void useCallStore
                  .getState()
                  .start(selectedUser._id)
                  .catch((error) =>
                    toast.error(errorMessage(error, "Could not start call")),
                  );
            }}
          >
            {starting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Video size={18} />
            )}
          </button>
          <button
            type="button"
            aria-label="Back to contacts"
            onClick={() => setSelectedUser(null)}
            className="cursor-pointer hover:opacity-80"
          >
            <X />
          </button>
        </div>
      </div>
    </div>
  );
}

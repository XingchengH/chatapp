import { useEffect, useLayoutEffect, useRef } from "react";
import { EMPTY_CONVERSATION, useChatStore } from "../store/useChatStore";
import ChatWindowHeader from "./ChatWindowHeader";
import MessageInput from "./MessageInput";
import VoiceRecorder from "./VoiceRecorder";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTimestamp } from "../lib/utils";

export default function ChatWindow() {
  const selectedUser = useChatStore((state) => state.selectedUser);
  const conversation = useChatStore((state) =>
    selectedUser
      ? state.conversations[selectedUser._id] || EMPTY_CONVERSATION
      : EMPTY_CONVERSATION,
  );
  const getMessages = useChatStore((state) => state.getMessages);
  const authUser = useAuthStore((state) => state.authUser);
  const isConnected = useAuthStore((state) => state.isConnected);
  const scrollRef = useRef<HTMLDivElement>(null);
  const previous = useRef({
    userId: "",
    lastId: "",
    height: 0,
    loadingOlder: false,
  });
  const { messages, nextCursor, isLoading, isLoadingOlder } = conversation;
  useEffect(() => {
    if (selectedUser) void getMessages(selectedUser._id);
  }, [getMessages, selectedUser]);
  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (!element || !selectedUser) return;
    const last = messages.at(-1);
    if (
      previous.current.userId !== selectedUser._id ||
      !previous.current.lastId
    )
      element.scrollTop = element.scrollHeight;
    else if (previous.current.loadingOlder && !isLoadingOlder)
      element.scrollTop += element.scrollHeight - previous.current.height;
    else if (
      previous.current.lastId !== last?._id &&
      (element.scrollHeight - element.scrollTop - element.clientHeight < 250 ||
        last?.senderId === authUser?._id)
    )
      element.scrollTop = element.scrollHeight;
    previous.current = {
      userId: selectedUser._id,
      lastId: last?._id || "",
      height: element.scrollHeight,
      loadingOlder: isLoadingOlder,
    };
  }, [messages, selectedUser, isLoadingOlder, authUser?._id]);
  if (!selectedUser) return null;
  return (
    <div className="relative flex-1 min-w-0 flex flex-col overflow-hidden">
      <ChatWindowHeader />
      {!isConnected && (
        <p role="status" className="px-4 py-1 text-xs bg-base-200">
          Reconnecting to live updates…
        </p>
      )}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {nextCursor && (
          <button
            className="btn btn-sm mx-auto block"
            disabled={isLoadingOlder}
            onClick={() => void getMessages(selectedUser._id, true)}
          >
            {isLoadingOlder ? "Loading…" : "Load older messages"}
          </button>
        )}
        {isLoading && !messages.length ? (
          <MessageSkeleton />
        ) : (
          messages.map((message) => (
            <div
              key={message._id}
              className={
                "chat " +
                (message.senderId === authUser?._id ? "chat-end" : "chat-start")
              }
            >
              <div className="chat-image avatar">
                <div className="size-10 rounded-full border">
                  <img
                    src={
                      (message.senderId === authUser?._id
                        ? authUser?.profilePic
                        : selectedUser.profilePic) || "/avatar.png"
                    }
                    alt=""
                  />
                </div>
              </div>
              <div className="chat-header mb-1">
                <time
                  dateTime={message.createdAt}
                  className="text-xs opacity-50"
                >
                  {formatMessageTimestamp(message.createdAt)}
                </time>
              </div>
              <div className="chat-bubble flex flex-col max-w-[85%] break-words">
                {message.image && (
                  <img
                    src={message.image}
                    alt="Message attachment"
                    loading="lazy"
                    className="max-w-full sm:max-w-[240px] rounded-md mb-2"
                  />
                )}
                {message.audio?.url && (
                  <audio
                    controls
                    preload="metadata"
                    src={message.audio.url}
                    aria-label="Voice message"
                    className="max-w-full"
                  />
                )}
                {message.text && (
                  <p className="whitespace-pre-wrap break-words">
                    {message.text}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
      <MessageInput key={selectedUser._id} userId={selectedUser._id} />
      <VoiceRecorder
        key={"voice-" + selectedUser._id}
        userId={selectedUser._id}
      />
    </div>
  );
}

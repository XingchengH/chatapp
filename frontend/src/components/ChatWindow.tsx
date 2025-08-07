import { useEffect, useRef } from "react";
import { useChatStore } from "../store/useChatStore";
import ChatWindowHeader from "./ChatWindowHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTimestamp } from "../lib/utils";

export default function ChatWindow() {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    subscrubeMessages,
    unsubscrubeMessages,
  } = useChatStore();

  const { authUser } = useAuthStore();
  const messageEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedUser) return;
    getMessages(selectedUser?._id);
    subscrubeMessages();

    return () => unsubscrubeMessages();
  }, [getMessages, selectedUser, subscrubeMessages, unsubscrubeMessages]);

  useEffect(() => {
    if (!messageEndRef.current) return;
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (isMessagesLoading)
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatWindowHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <ChatWindowHeader />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message._id}
            className={`chat ${
              message.senderId === authUser?._id ? "chat-end" : "chat-start"
            }`}
            ref={messageEndRef}
          >
            <div className="chat-image avatar">
              <div className="size-10 rounded-full border">
                <img
                  src={
                    message.senderId === authUser?._id
                      ? authUser.profilePic || "/avatar.png"
                      : selectedUser?.profilePic || "/avatar.png"
                  }
                  alt="profile pic"
                />
              </div>
            </div>

            <div className="chat-header mb-1">
              <time className="text-xs opacity-50 ml-1">
                {formatMessageTimestamp(message.createdAt)}
              </time>
            </div>

            <div className="chat-bubble flex flex-col">
              {message.image && (
                <img
                  src={message.image}
                  alt="message image"
                  className={`sm:max-w-[200px] rounded-md mb-2 ${
                    authUser?._id === message.senderId ? "ml-auto" : "mr-auto"
                  }`}
                />
              )}
              {message.text && <p>{message.text}</p>}
            </div>
          </div>
        ))}
      </div>

      <MessageInput />
    </div>
  );
}

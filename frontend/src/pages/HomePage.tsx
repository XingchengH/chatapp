import ChatWindow from "../components/ChatWindow";
import NoChatSelected from "../components/NoChatSelected";
import Sidebar from "../components/Sidebar";
import { useChatStore } from "../store/useChatStore";

export default function HomePage() {
  const { selectedUser } = useChatStore();

  return (
    <div className="h-dvh bg-base-200">
      <div className="flex items-center justify-center pt-16 md:pt-20 md:px-4">
        <div className="bg-base-100 md:rounded-lg shadow-xl w-full max-w-6xl h-[calc(100dvh-4rem)] md:h-[calc(100dvh-8rem)]">
          <div className="flex h-full rounded-lg overflow-hidden">
            <Sidebar />

            {!selectedUser ? (
              <div className="hidden md:flex flex-1">
                <NoChatSelected />
              </div>
            ) : (
              <ChatWindow />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

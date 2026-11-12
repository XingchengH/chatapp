import toast from "react-hot-toast";
import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import { errorMessage } from "../lib/errors";

export type ChatUser = { _id: string; fullName: string; profilePic: string };
export type Message = {
  _id: string;
  senderId: string;
  receiverId: string;
  text?: string;
  image?: string | null;
  audio?: { url: string; duration: number; bytes: number };
  createdAt: string;
  updatedAt: string;
  clientMessageId?: string;
};
export type MessageData = {
  text: string;
  image: string | null;
  clientMessageId: string;
  audio?: Blob;
};
type Conversation = {
  messages: Message[];
  nextCursor: string | null;
  isLoading: boolean;
  isLoadingOlder: boolean;
};
export const EMPTY_CONVERSATION: Conversation = {
  messages: [],
  nextCursor: null,
  isLoading: false,
  isLoadingOlder: false,
};
type ChatStore = {
  conversations: Record<string, Conversation>;
  users: ChatUser[];
  selectedUser: ChatUser | null;
  isUsersLoading: boolean;
  usersCursor: string | null;
  search: string;
  getUsers: (search?: string, more?: boolean) => Promise<void>;
  getMessages: (userId: string, older?: boolean) => Promise<void>;
  sendMessage: (data: MessageData, userId: string) => Promise<void>;
  receiveMessage: (message: Message, myId: string) => void;
  setSelectedUser: (user: ChatUser | null) => void;
  reset: () => void;
};
export function mergeMessages(existing: Message[], incoming: Message[]) {
  return [
    ...new Map(
      [...existing, ...incoming].map((message) => [message._id, message]),
    ).values(),
  ].sort(
    (a, b) =>
      a.createdAt.localeCompare(b.createdAt) || a._id.localeCompare(b._id),
  );
}
let session = 0;
let usersRequest = 0;
export const useChatStore = create<ChatStore>((set, get) => ({
  conversations: {},
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  usersCursor: null,
  search: "",
  getUsers: async (search = "", more = false) => {
    if (more && (get().isUsersLoading || !get().usersCursor)) return;
    const request = ++usersRequest;
    const cursor = more ? get().usersCursor : undefined;
    set({
      isUsersLoading: true,
      search,
      ...(more ? {} : { users: [], usersCursor: null }),
    });
    try {
      const { data } = await axiosInstance.get<{
        users: ChatUser[];
        nextCursor: string | null;
      }>("/messages/users", { params: { search, after: cursor } });
      if (request !== usersRequest) return;
      set((state) => ({
        users: more
          ? [
              ...new Map(
                [...state.users, ...data.users].map((user) => [user._id, user]),
              ).values(),
            ]
          : data.users,
        usersCursor: data.nextCursor,
      }));
    } catch (error) {
      if (request === usersRequest)
        toast.error(errorMessage(error, "Failed to fetch users"));
    } finally {
      if (request === usersRequest) set({ isUsersLoading: false });
    }
  },
  getMessages: async (userId, older = false) => {
    const epoch = session;
    const current = get().conversations[userId] || EMPTY_CONVERSATION;
    if (
      current.isLoading ||
      current.isLoadingOlder ||
      (older && !current.nextCursor)
    )
      return;
    set((state) => ({
      conversations: {
        ...state.conversations,
        [userId]: { ...current, isLoading: !older, isLoadingOlder: older },
      },
    }));
    try {
      const { data } = await axiosInstance.get<{
        messages: Message[];
        nextCursor: string | null;
      }>("/messages/" + userId, {
        params: { before: older ? current.nextCursor : undefined },
      });
      if (epoch !== session) return;
      set((state) => ({
        conversations: {
          ...state.conversations,
          [userId]: {
            ...state.conversations[userId],
            messages: mergeMessages(
              state.conversations[userId].messages,
              data.messages,
            ),
            nextCursor: data.nextCursor,
          },
        },
      }));
    } catch (error) {
      if (epoch === session)
        toast.error(errorMessage(error, "Failed to fetch messages"));
    } finally {
      if (epoch === session)
        set((state) => ({
          conversations: {
            ...state.conversations,
            [userId]: {
              ...state.conversations[userId],
              isLoading: false,
              isLoadingOlder: false,
            },
          },
        }));
    }
  },
  sendMessage: async (messageData, userId) => {
    const epoch = session;
    try {
      let payload: MessageData | FormData = messageData;
      if (messageData.audio) {
        payload = new FormData();
        payload.append("audio", messageData.audio, "recording");
        payload.append("clientMessageId", messageData.clientMessageId);
      }
      const { data } = await axiosInstance.post<Message>(
        (messageData.audio ? "/messages/audio/" : "/messages/send/") + userId,
        payload,
        { timeout: 90000 },
      );
      if (epoch !== session) return;
      set((state) => {
        const current = state.conversations[userId] || EMPTY_CONVERSATION;
        return {
          conversations: {
            ...state.conversations,
            [userId]: {
              ...current,
              messages: mergeMessages(current.messages, [data]),
            },
          },
        };
      });
    } catch (error) {
      if (epoch === session)
        toast.error(
          errorMessage(
            error,
            "Message failed. Your draft is saved; try sending again.",
          ),
        );
      throw error;
    }
  },
  receiveMessage: (message, myId) => {
    if (message.senderId !== myId && message.receiverId !== myId) return;
    const peer =
      message.senderId === myId ? message.receiverId : message.senderId;
    set((state) => {
      const current = state.conversations[peer] || EMPTY_CONVERSATION;
      return {
        conversations: {
          ...state.conversations,
          [peer]: {
            ...current,
            messages: mergeMessages(current.messages, [message]),
          },
        },
      };
    });
  },
  setSelectedUser: (selectedUser) => set({ selectedUser }),
  reset: () => {
    session++;
    usersRequest++;
    set({
      conversations: {},
      users: [],
      selectedUser: null,
      isUsersLoading: false,
      usersCursor: null,
      search: "",
    });
  },
}));

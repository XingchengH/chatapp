import { create } from "zustand";
import axios from "axios";
import { axiosInstance, API_ORIGIN } from "../lib/axios";
import toast from "react-hot-toast";
import { io, type Socket } from "socket.io-client";
import { useChatStore, type Message } from "./useChatStore";
import { errorMessage } from "../lib/errors";

export type AuthUser = {
  _id: string;
  email: string;
  fullName: string;
  profilePic: string;
  createdAt: string;
  updatedAt: string;
};
type FormData = { fullName: string; email: string; password: string };
let authVersion = 0;
type AuthStore = {
  authUser: AuthUser | null;
  isSigningUp: boolean;
  isLoggingIn: boolean;
  isUpdatingProfile: boolean;
  isCheckingAuth: boolean;
  onlineUsers: string[];
  socket: Socket | null;
  isConnected: boolean;
  checkAuth: () => Promise<void>;
  signup: (data: FormData) => Promise<void>;
  login: (data: { email: string; password: string }) => Promise<void>;
  loginWithGoogle: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: { profilePic: string }) => Promise<void>;
  connectSocket: () => void;
  disconnectSocket: () => void;
  clearSession: () => void;
};
export const useAuthStore = create<AuthStore>((set, get) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
  onlineUsers: [],
  socket: null,
  isConnected: false,
  clearSession: () => {
    authVersion++;
    get().disconnectSocket();
    useChatStore.getState().reset();
    set({ authUser: null });
  },
  checkAuth: async () => {
    const version = authVersion;
    try {
      const { data } = await axiosInstance.get<AuthUser>("/auth/check");
      if (version !== authVersion) return;
      const previousId = get().authUser?._id;
      if (previousId && previousId !== data._id) get().clearSession();
      set({ authUser: data });
      get().connectSocket();
    } catch (error) {
      if (version !== authVersion) return;
      if (
        !get().authUser ||
        (axios.isAxiosError(error) && error.response?.status === 401)
      )
        get().clearSession();
    } finally {
      set({ isCheckingAuth: false });
    }
  },
  signup: async (data) => {
    if (get().isSigningUp) return;
    const version = ++authVersion;
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post<AuthUser>("/auth/signup", data);
      if (version !== authVersion) return;
      get().clearSession();
      set({ authUser: res.data });
      get().connectSocket();
      toast.success("Signup successful!");
    } catch (error) {
      toast.error(errorMessage(error, "Signup failed. Please try again."));
    } finally {
      set({ isSigningUp: false });
    }
  },
  login: async (data) => {
    if (get().isLoggingIn) return;
    const version = ++authVersion;
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post<AuthUser>("/auth/login", data);
      if (version !== authVersion) return;
      get().clearSession();
      set({ authUser: res.data });
      get().connectSocket();
      toast.success("Login successful!");
    } catch (error) {
      toast.error(
        errorMessage(error, "Login failed. Please check your credentials."),
      );
    } finally {
      set({ isLoggingIn: false });
    }
  },
  loginWithGoogle: async (token) => {
    if (get().isLoggingIn) return;
    const version = ++authVersion;
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post<AuthUser>("/auth/google", { token });
      if (version !== authVersion) return;
      get().clearSession();
      set({ authUser: res.data });
      get().connectSocket();
      toast.success("Google login successful!");
    } catch (error) {
      toast.error(errorMessage(error, "Google login failed"));
    } finally {
      set({ isLoggingIn: false });
    }
  },
  logout: async () => {
    const version = ++authVersion;
    try {
      await axiosInstance.post("/auth/logout");
      if (version !== authVersion) return;
      get().clearSession();
      toast.success("Logged out successfully!");
    } catch (error) {
      toast.error(errorMessage(error, "Logout failed. Please try again."));
    }
  },
  updateProfile: async (data) => {
    set({ isUpdatingProfile: true });
    const userId = get().authUser?._id;
    try {
      const res = await axiosInstance.put<AuthUser>(
        "/auth/update-profile",
        data,
      );
      if (get().authUser?._id === userId) set({ authUser: res.data });
      toast.success("Profile updated successfully!");
    } catch (error) {
      toast.error(errorMessage(error, "Failed to update profile"));
      throw error;
    } finally {
      set({ isUpdatingProfile: false });
    }
  },
  connectSocket: () => {
    const authUser = get().authUser;
    if (!authUser || get().socket) return;
    const socket = io(API_ORIGIN, {
      withCredentials: true,
      autoConnect: false,
    });
    set({ socket });
    socket.on("connect", () => {
      set({ isConnected: true });
      const selected = useChatStore.getState().selectedUser;
      if (selected) void useChatStore.getState().getMessages(selected._id);
    });
    socket.on("getOnlineUsers", (onlineUsers: string[]) =>
      set({ onlineUsers }),
    );
    socket.on("newMessage", (message: Message) =>
      useChatStore.getState().receiveMessage(message, authUser._id),
    );
    socket.on("disconnect", (reason) => {
      set({ isConnected: false, onlineUsers: [] });
      if (reason === "io server disconnect") get().clearSession();
    });
    socket.on("connect_error", (error: Error) => {
      set({ isConnected: false });
      if (error.message === "Authentication required") get().clearSession();
    });
    socket.connect();
  },
  disconnectSocket: () => {
    const socket = get().socket;
    socket?.removeAllListeners();
    socket?.disconnect();
    set({ socket: null, onlineUsers: [], isConnected: false });
  },
}));

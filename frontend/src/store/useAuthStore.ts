import { create } from "zustand";
import { axiosInstance } from "../lib/axios.ts";
import toast from "react-hot-toast";
import { io, type Socket } from "socket.io-client";

const BASE_URL =
  import.meta.env.MODE === "development" ? "http://localhost:8080" : "";

export type AuthUser = {
  _id: string;
  email: string;
  fullName: string;
  profilePic: string;
  createdAt: string;
  updatedAt: string;
};

type FormData = {
  fullName: string;
  email: string;
  password: string;
};

type AuthStoreProps = {
  authUser: AuthUser | null;
  isSigningUp: boolean;
  isLoggingIn: boolean;
  isUpdatingProfile: boolean;
  isCheckingAuth: boolean;
  onlineUsers: string[];
  socket: Socket | null;

  checkAuth: () => Promise<void>;
  signup: (data: FormData) => Promise<void>;
  login: (data: { email: string; password: string }) => Promise<void>;
  loginWithGoogle: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: { profilePic: string }) => Promise<void>;
  connectSocket: () => void;
  disconnectSocket: () => void;
};

export const useAuthStore = create<AuthStoreProps>((set, get) => ({
  authUser: null as AuthUser | null,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
  onlineUsers: [],
  socket: null,

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check");

      set({ authUser: res.data });

      get().connectSocket(); // Connect socket after checking auth
    } catch (error) {
      set({ authUser: null });
      console.error("Error checking authentication:", error);
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (data: FormData) => {
    try {
      const res = await axiosInstance.post("/auth/signup", data);
      set({ authUser: res.data });
      toast.success("Signup successful!");

      get().connectSocket(); // Connect socket after signup
    } catch (error) {
      console.log(error);
    } finally {
      set({ isSigningUp: false });
    }
  },

  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
      set({ authUser: null });
      toast.success("Logged out successfully!");

      get().disconnectSocket(); // Disconnect socket on logout
    } catch (error) {
      console.error("Error during logout:", error);
      toast.error("Error during logout. Please try again.");
    }
  },

  login: async (data: { email: string; password: string }) => {
    try {
      set({ isLoggingIn: true });
      const res = await axiosInstance.post("/auth/login", data);
      set({ authUser: res.data });
      toast.success("Login successful!");

      get().connectSocket(); // Connect socket after login
    } catch (error) {
      console.error("Error during login:", error);
      toast.error("Login failed. Please check your credentials.");
    } finally {
      set({ isLoggingIn: false });
    }
  },

  loginWithGoogle: async (token: string) => {
    try {
      set({ isLoggingIn: true });

      const res = await axiosInstance.post("/auth/google", { token });

      set({ authUser: res.data });
      toast.success("Google login successful!");

      get().connectSocket();
    } catch (error) {
      console.error(error);
      toast.error("Google login failed");
    } finally {
      set({ isLoggingIn: false });
    }
  },

  updateProfile: async (data: { profilePic: string }) => {
    set({ isUpdatingProfile: true });
    try {
      const res = await axiosInstance.put("/auth/update-profile", data);
      set({ authUser: res.data });
      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile. Please try again.");
    } finally {
      set({ isUpdatingProfile: false });
    }
  },

  connectSocket: () => {
    // not authenticated, no need to connect
    const { authUser } = get();
    if (!authUser || get().socket?.connected) return;

    const socket = io(BASE_URL, {
      query: { userId: authUser._id },
    });
    socket.connect();

    socket.on("getOnlineUsers", (userIds) => {
      set({ onlineUsers: userIds });
    });
    set({ socket });
  },
  disconnectSocket: () => {
    const socket = get().socket;
    if (socket?.connected) socket.disconnect();
    set({ socket: null });
  },
}));

import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
export type CallSession = {
  callId: string;
  token: string;
  url: string;
  hostId: string;
};
let generation = 0;
export const useCallStore = create<{
  session: CallSession | null;
  starting: boolean;
  start: (userId: string) => Promise<void>;
  join: (id: string) => Promise<void>;
  leave: () => void;
}>((set, get) => ({
  session: null,
  starting: false,
  start: async (userId) => {
    if (get().session || get().starting) return;
    const version = generation;
    set({ starting: true });
    try {
      const { data } = await axiosInstance.post<{ _id: string }>("/calls", {
        userIds: [userId],
      });
      if (version === generation) await get().join(data._id);
    } finally {
      set({ starting: false });
    }
  },
  join: async (id) => {
    const version = generation;
    const { data } = await axiosInstance.post<CallSession>(`/calls/${id}/join`);
    if (version === generation) set({ session: data });
  },
  leave: () => {
    generation++;
    set({ session: null });
  },
}));

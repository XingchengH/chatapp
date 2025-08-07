import { create } from "zustand";

type useThemeStoreType = {
  appTheme: string;
  setTheme: (theme: string) => void;
};

export const useThemeStore = create<useThemeStoreType>((set) => ({
  appTheme: localStorage.getItem("theme") || "light",
  setTheme: (appTheme: string) => {
    localStorage.setItem("theme", appTheme);
    set({ appTheme });
  },
}));

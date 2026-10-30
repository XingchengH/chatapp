import axios from "axios";

export const API_ORIGIN =
  import.meta.env.VITE_API_ORIGIN ||
  (import.meta.env.MODE === "development" ? "http://localhost:8080" : "");

export const axiosInstance = axios.create({
  baseURL: `${API_ORIGIN}/api`,
  withCredentials: true,
});

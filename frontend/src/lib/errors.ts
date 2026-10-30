import axios from "axios";
export function errorMessage(error: unknown, fallback: string): string {
  const message = axios.isAxiosError(error)
    ? error.response?.data?.message
    : undefined;
  return typeof message === "string" ? message : fallback;
}

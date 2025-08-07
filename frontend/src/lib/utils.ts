export function formatMessageTimestamp(timestamp: string): string {
  if (!timestamp) return "";
  return new Date(timestamp).toLocaleString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

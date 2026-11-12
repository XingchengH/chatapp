import { AccessToken, RoomServiceClient } from "livekit-server-sdk";
import { HttpError } from "./errors.js";
export function callService(env = process.env) {
  if (!env.LIVEKIT_URL || !env.LIVEKIT_API_KEY || !env.LIVEKIT_API_SECRET)
    throw new HttpError(503, "Video calls are not configured yet");
  const url = new URL(env.LIVEKIT_URL);
  if (url.protocol !== "wss:")
    throw new HttpError(503, "Video calls require a secure LiveKit URL");
  return {
    url: url.origin,
    rooms: new RoomServiceClient(
      url.origin.replace("wss:", "https:"),
      env.LIVEKIT_API_KEY,
      env.LIVEKIT_API_SECRET,
    ),
  };
}
export async function callToken(call, user, env = process.env) {
  if (
    call.ended ||
    new Date(call.expiresAt) <= new Date() ||
    !call.members.some(
      (member) =>
        String(member.userId) === String(user._id) &&
        member.status === "accepted",
    )
  )
    throw new HttpError(403, "You cannot join this call");
  const token = new AccessToken(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET, {
    identity: String(user._id),
    name: user.fullName,
    ttl: "5m",
  });
  token.addGrant({
    roomJoin: true,
    room: "call-" + call._id,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });
  return token.toJwt();
}

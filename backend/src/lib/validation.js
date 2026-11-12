import { HttpError } from "./errors.js";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_MESSAGE_LENGTH = 10000;
export const escapeRegex = (value) =>
  value.replace(/[.*+?^$()|[\]{}\\]/g, "\\$&");

export function validateObjectId(value) {
  if (typeof value !== "string" || !/^[a-f\d]{24}$/i.test(value))
    throw new HttpError(400, "Invalid user ID");
  return value.toLowerCase();
}
export function validateEmail(value) {
  if (typeof value !== "string")
    throw new HttpError(400, "A valid email is required");
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new HttpError(400, "A valid email is required");
  return email;
}
export function validatePassword(value, minimum = 6) {
  if (
    typeof value !== "string" ||
    value.length < minimum ||
    Buffer.byteLength(value) > 72
  ) {
    throw new HttpError(
      400,
      "Password must contain at least " +
        minimum +
        " characters and at most 72 bytes",
    );
  }
  return value;
}
export function validateFullName(value) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > 100)
    throw new HttpError(400, "Full name must contain 1–100 characters");
  return value.trim();
}
export function validateImage(value) {
  if (
    typeof value !== "string" ||
    value.length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4 + 40
  )
    throw new HttpError(400, "Choose an image no larger than 5 MB");
  const match =
    /^data:image\/(png|jpeg|gif|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(
      value,
    );
  if (!match)
    throw new HttpError(
      400,
      "Only PNG, JPEG, GIF and WebP images are supported",
    );
  const bytes = Buffer.from(match[2], "base64");
  const signatures = {
    png: bytes
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
    jpeg: bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255,
    gif: ["GIF87a", "GIF89a"].includes(bytes.toString("ascii", 0, 6)),
    webp:
      bytes.toString("ascii", 0, 4) === "RIFF" &&
      bytes.toString("ascii", 8, 12) === "WEBP",
  };
  if (
    !signatures[match[1]] ||
    bytes.length > MAX_IMAGE_BYTES ||
    bytes.toString("base64") !== match[2]
  )
    throw new HttpError(400, "Invalid image data or image exceeds 5 MB");
  return value;
}
export function validateMessage(body = {}, allowAudio = false) {
  const { text = "", image, clientMessageId } = body;
  if (typeof text !== "string" || text.length > MAX_MESSAGE_LENGTH)
    throw new HttpError(400, "Messages must contain at most 10,000 characters");
  const trimmed = text.trim();
  if (!trimmed && !image && !allowAudio)
    throw new HttpError(400, "A message must contain text or an image");
  if (
    clientMessageId !== undefined &&
    (typeof clientMessageId !== "string" ||
      !/^[a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(clientMessageId))
  )
    throw new HttpError(400, "Invalid message request ID");
  return {
    text: trimmed,
    image: image ? validateImage(image) : undefined,
    clientMessageId,
  };
}
export function pageLimit(value, fallback = 50) {
  if (value === undefined) return fallback;
  if (
    typeof value !== "string" ||
    !/^\d+$/.test(value) ||
    Number(value) < 1 ||
    Number(value) > 100
  )
    throw new HttpError(400, "Page size must be between 1 and 100");
  return Number(value);
}
export function encodeMessageCursor(message) {
  return Buffer.from(
    JSON.stringify([
      new Date(message.createdAt).toISOString(),
      String(message._id),
    ]),
  ).toString("base64url");
}
export function decodeMessageCursor(value) {
  if (value === undefined) return null;
  try {
    if (
      typeof value !== "string" ||
      value.length > 200 ||
      !/^[\w-]+$/.test(value)
    )
      throw new Error();
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString());
    if (!Array.isArray(parsed) || parsed.length !== 2) throw new Error();
    const [timestamp, id] = parsed;
    const createdAt = new Date(timestamp);
    if (typeof timestamp !== "string" || createdAt.toISOString() !== timestamp)
      throw new Error();
    return { createdAt, _id: validateObjectId(id) };
  } catch {
    throw new HttpError(400, "Invalid message cursor");
  }
}

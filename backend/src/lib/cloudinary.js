import { v2 as cloudinary } from "cloudinary";
import { config } from "dotenv";
import { HttpError } from "./errors.js";

config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;

export async function uploadAudio(buffer) {
  const credentials = cloudinary.config();
  if (
    !credentials.cloud_name ||
    !credentials.api_key ||
    !credentials.api_secret
  )
    throw new HttpError(503, "Audio uploads are not configured");
  const uploaded = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "video",
        allowed_formats: ["webm", "ogg", "mp4", "m4a", "mp3", "wav"],
        folder: "chat-audio",
      },
      (error, result) => (error ? reject(error) : resolve(result)),
    );
    stream.end(buffer);
  });
  if (
    uploaded.width ||
    uploaded.height ||
    !Number.isFinite(uploaded.duration) ||
    uploaded.duration <= 0 ||
    uploaded.duration > 300
  ) {
    await cloudinary.uploader.destroy(uploaded.public_id, {
      resource_type: "video",
    });
    throw new HttpError(
      400,
      "Send an audio-only recording up to five minutes long",
    );
  }
  return {
    url: uploaded.secure_url,
    publicId: uploaded.public_id,
    duration: uploaded.duration,
    bytes: uploaded.bytes,
  };
}

export async function uploadImage(image) {
  const credentials = cloudinary.config();
  if (
    !credentials.cloud_name ||
    !credentials.api_key ||
    !credentials.api_secret
  )
    throw new HttpError(503, "Image uploads are not configured");
  return cloudinary.uploader.upload(image, {
    resource_type: "image",
    allowed_formats: ["png", "jpg", "jpeg", "gif", "webp"],
  });
}

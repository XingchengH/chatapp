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

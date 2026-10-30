export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const IMAGE_ACCEPT = "image/png,image/jpeg,image/gif,image/webp";
export function imageError(file: File): string | null {
  if (!IMAGE_ACCEPT.split(",").includes(file.type))
    return "Choose a PNG, JPEG, GIF or WebP image";
  if (!file.size || file.size > MAX_IMAGE_BYTES)
    return "Choose an image no larger than 5 MB";
  return null;
}

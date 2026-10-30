export function clientOrigin(env = process.env) {
  return (
    env.CLIENT_ORIGIN ||
    (env.RENDER === "true" && env.RENDER_EXTERNAL_URL) ||
    "http://localhost:5173"
  );
}

export function validateEnvironment(env = process.env) {
  const required = ["MONGODB_URI", "JWT_SECRET"];
  const uploadCredentials = [
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
  ];
  if (
    env.NODE_ENV === "production" ||
    uploadCredentials.some((key) => env[key]?.trim())
  )
    required.push(...uploadCredentials);
  if (
    env.NODE_ENV === "production" &&
    !(env.RENDER === "true" && env.RENDER_EXTERNAL_URL)
  )
    required.push("CLIENT_ORIGIN");
  const missing = required.filter((key) => !env[key]?.trim());
  if (missing.length)
    throw new Error(
      "Missing required environment variables: " + missing.join(", "),
    );
  if (env.JWT_SECRET.length < 32)
    throw new Error("JWT_SECRET must contain at least 32 characters");
  const port = Number(env.PORT || 8080);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error("PORT must be between 1 and 65535");
  const origin = new URL(clientOrigin(env));
  if (
    origin.origin !== clientOrigin(env) ||
    !["http:", "https:"].includes(origin.protocol)
  )
    throw new Error("CLIENT_ORIGIN must be an HTTP(S) origin without a path");
  if (env.NODE_ENV === "production" && origin.protocol !== "https:")
    throw new Error("Production CLIENT_ORIGIN must use HTTPS");
  if (env.TRUST_PROXY_HOPS && !/^[0-9]+$/.test(env.TRUST_PROXY_HOPS))
    throw new Error("TRUST_PROXY_HOPS must be a nonnegative integer");
  return { port };
}

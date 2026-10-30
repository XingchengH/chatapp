import { test } from "node:test";
import assert from "node:assert/strict";
import { validateEnvironment } from "../src/lib/config.js";
const valid = {
  NODE_ENV: "production",
  MONGODB_URI: "mongodb://localhost/chat-test",
  JWT_SECRET: "a".repeat(32),
  CLOUDINARY_CLOUD_NAME: "test",
  CLOUDINARY_API_KEY: "test",
  CLOUDINARY_API_SECRET: "test",
  CLIENT_ORIGIN: "https://chat.example.com",
};
test("startup validation fails for missing secrets, invalid origins and ports", () => {
  assert.equal(validateEnvironment(valid).port, 8080);
  for (const env of [
    {},
    { ...valid, JWT_SECRET: "short" },
    { ...valid, CLIENT_ORIGIN: "http://example.com" },
    { ...valid, CLIENT_ORIGIN: "https://example.com/path" },
    { ...valid, PORT: "NaN" },
    { ...valid, TRUST_PROXY_HOPS: "true" },
  ])
    assert.throws(() => validateEnvironment(env));
});

test("local text chat starts without Cloudinary, but partial and production credentials fail", () => {
  const local = {
    NODE_ENV: "development",
    MONGODB_URI: valid.MONGODB_URI,
    JWT_SECRET: valid.JWT_SECRET,
  };
  assert.equal(validateEnvironment(local).port, 8080);
  assert.throws(() =>
    validateEnvironment({ ...local, CLOUDINARY_API_KEY: "partial" }),
  );
  assert.throws(() =>
    validateEnvironment({
      ...local,
      NODE_ENV: "production",
      CLIENT_ORIGIN: valid.CLIENT_ORIGIN,
    }),
  );
});

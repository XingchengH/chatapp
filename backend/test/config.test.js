import { test } from "node:test";
import assert from "node:assert/strict";
import { clientOrigin, validateEnvironment } from "../src/lib/config.js";
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

test("Render uses its platform-provided HTTPS origin unless explicitly overridden", () => {
  const render = {
    ...valid,
    CLIENT_ORIGIN: "",
    RENDER: "true",
    RENDER_EXTERNAL_URL: "https://chatapp-yqjq.onrender.com",
  };
  assert.equal(validateEnvironment(render).port, 8080);
  assert.equal(clientOrigin(render), render.RENDER_EXTERNAL_URL);
  assert.equal(
    clientOrigin({ ...render, CLIENT_ORIGIN: valid.CLIENT_ORIGIN }),
    valid.CLIENT_ORIGIN,
  );
  assert.throws(() => validateEnvironment({ ...render, RENDER: "false" }));
  assert.throws(() =>
    validateEnvironment({
      ...render,
      RENDER_EXTERNAL_URL: "https://example.com/path",
    }),
  );
  assert.throws(() =>
    validateEnvironment({
      ...render,
      RENDER_EXTERNAL_URL: "http://example.com",
    }),
  );
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

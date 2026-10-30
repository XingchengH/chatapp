import { afterEach, mock, test } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import User from "../src/models/user.model.js";
import cloudinary from "../src/lib/cloudinary.js";
import { protectedRoute } from "../src/middleware/auth.middleware.js";
import {
  login,
  googleAuth,
  updateProfile,
} from "../src/controllers/auth.controller.js";

process.env.JWT_SECRET = "test-secret-never-used-outside-tests";
const id = "507f1f77bcf86cd799439011";
const response = () => ({
  statusCode: 200,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = JSON.parse(JSON.stringify(body));
    return this;
  },
  cookie(name, value, options) {
    this.sessionCookie = { name, value, options };
    return this;
  },
});
afterEach(() => mock.restoreAll());

test("password login sets an HTTP-only session and returns no credentials", async () => {
  const user = new User({
    _id: id,
    email: "test@example.com",
    fullName: "Test",
    password: await bcrypt.hash("password", 4),
  });
  mock.method(User, "findOne", () => ({ select: async () => user }));
  const res = response();
  await login(
    { body: { email: " Test@Example.COM ", password: "password" } },
    res,
  );
  assert.equal(res.statusCode, 200);
  assert.equal(res.sessionCookie.options.httpOnly, true);
  assert.equal(
    jwt.verify(res.sessionCookie.value, process.env.JWT_SECRET).id,
    id,
  );
  assert.equal(res.body.password, undefined);
  assert.equal(res.body.token, undefined);
});

test("Google login accepts a verified linked identity without exposing provider data", async () => {
  process.env.GOOGLE_CLIENT_ID = "test-google-client";
  mock.method(OAuth2Client.prototype, "verifyIdToken", async ({ audience }) => {
    assert.equal(audience, "test-google-client");
    return {
      getPayload: () => ({
        email_verified: true,
        email: "test@example.com",
        sub: "provider-id",
      }),
    };
  });
  mock.method(User, "findOne", async (query) => {
    assert.deepEqual(query, { googleId: "provider-id" });
    return new User({
      _id: id,
      email: "test@example.com",
      fullName: "Test",
      googleId: "provider-id",
    });
  });
  const res = response();
  await googleAuth({ body: { token: "synthetic" } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body._id, id);
  assert.equal(res.body.googleId, undefined);
  assert.equal(res.body.token, undefined);
});

test("Google login rejects unverified emails before account lookup", async () => {
  process.env.GOOGLE_CLIENT_ID = "test-google-client";
  mock.method(OAuth2Client.prototype, "verifyIdToken", async () => ({
    getPayload: () => ({
      email_verified: false,
      email: "test@example.com",
      sub: "provider-id",
    }),
  }));
  const lookup = mock.method(User, "findOne", () =>
    assert.fail("unverified identity reached database"),
  );
  const res = response();
  await googleAuth({ body: { token: "synthetic" } }, res);
  assert.equal(res.statusCode, 401);
  assert.equal(lookup.mock.callCount(), 0);
});

test("expired JWTs return 401 without querying the database", async () => {
  mock.method(console, "error", () => {});
  const lookup = mock.method(User, "findById", () => {
    throw new Error("Unexpected database call");
  });
  const res = response();
  const token = jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: -1 });
  await protectedRoute({ cookies: { jwt: token } }, res, () =>
    assert.fail("authenticated expired JWT"),
  );
  assert.equal(res.statusCode, 401);
  assert.equal(lookup.mock.callCount(), 0);
});

test("Google-only accounts cannot use password login and return 401", async () => {
  mock.method(console, "error", () => {});
  mock.method(User, "findOne", () => ({
    select: async () => ({ password: null }),
  }));
  const res = response();
  await login(
    { body: { email: "test@example.com", password: "password" } },
    res,
  );
  assert.equal(res.statusCode, 401);
});

test("profile responses never include password or provider identifiers", async () => {
  mock.method(cloudinary, "config", () => ({
    cloud_name: "test",
    api_key: "test",
    api_secret: "test",
  }));
  mock.method(cloudinary.uploader, "upload", async () => ({
    secure_url: "https://example.com/avatar.png",
  }));
  mock.method(
    User,
    "findByIdAndUpdate",
    async () =>
      new User({
        _id: id,
        email: "test@example.com",
        fullName: "Test",
        password: "secret-hash",
        googleId: "private-provider-id",
      }),
  );
  const res = response();
  // Valid 1x1 PNG, only a mocked uploader is called.
  await updateProfile(
    {
      user: { _id: id },
      body: {
        profilePic:
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jBz0AAAAASUVORK5CYII=",
      },
    },
    res,
  );
  assert.equal(res.statusCode, 200);
  assert.equal(res.body._id, id);
  assert.equal(res.body.password, undefined);
  assert.equal(res.body.googleId, undefined);
});

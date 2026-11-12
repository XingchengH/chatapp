import { test, mock, afterEach } from "node:test";
import assert from "node:assert/strict";
import { Writable } from "node:stream";
import jwt from "jsonwebtoken";
import cloudinary, { uploadAudio } from "../src/lib/cloudinary.js";
import { callToken, callService } from "../src/lib/calls.js";
import { validateMessage } from "../src/lib/validation.js";
import Message from "../src/models/message.model.js";
afterEach(() => mock.restoreAll());
test("audio bypass is allowed only by the multipart controller, not JSON input", () => {
  assert.throws(() => validateMessage({ audio: true }), { status: 400 });
  assert.equal(validateMessage({}, true).text, "");
  const message = new Message({
    senderId: "507f1f77bcf86cd799439011",
    receiverId: "507f1f77bcf86cd799439012",
    audio: { url: "https://example.com/audio.webm", duration: 2 },
  });
  assert.equal(message.validateSync(), undefined);
});
test("call tokens reject strangers, unaccepted invitations, expired and ended calls", async () => {
  const user = { _id: "alice", fullName: "Alice" };
  const call = {
    _id: "call",
    expiresAt: new Date(Date.now() + 60000),
    members: [],
  };
  await assert.rejects(callToken(call, user), { status: 403 });
  call.members = [{ userId: "alice", status: "invited" }];
  await assert.rejects(callToken(call, user), { status: 403 });
  call.members[0].status = "accepted";
  call.ended = true;
  await assert.rejects(callToken(call, user), { status: 403 });
  call.ended = false;
  call.expiresAt = new Date(0);
  await assert.rejects(callToken(call, user), { status: 403 });
});
test("accepted call token is short-lived and grants only its room", async () => {
  const token = await callToken(
    {
      _id: "123",
      expiresAt: new Date(Date.now() + 60000),
      members: [{ userId: "alice", status: "accepted" }],
    },
    { _id: "alice", fullName: "Alice" },
    {
      LIVEKIT_API_KEY: "test-key",
      LIVEKIT_API_SECRET: "a-secret-that-is-long-enough-for-signing",
    },
  );
  const payload = jwt.decode(token);
  assert.equal(payload.sub, "alice");
  assert.equal(payload.video.room, "call-123");
  assert.equal(payload.video.roomJoin, true);
  assert.equal(payload.video.roomAdmin, undefined);
  assert.ok(payload.exp - payload.nbf <= 300);
});
test("calls fail clearly without server credentials or with an insecure endpoint", () => {
  assert.throws(() => callService({}), { status: 503 });
  assert.throws(
    () =>
      callService({
        LIVEKIT_URL: "ws://example.com",
        LIVEKIT_API_KEY: "key",
        LIVEKIT_API_SECRET: "secret",
      }),
    { status: 503 },
  );
});
test("audio upload validates provider-derived duration and rejects video, deleting rejected media", async () => {
  mock.method(cloudinary, "config", () => ({
    cloud_name: "test",
    api_key: "test",
    api_secret: "test",
  }));
  const destroyed = [];
  mock.method(cloudinary.uploader, "destroy", async (id) => {
    destroyed.push(id);
  });
  let result = {
    public_id: "recording",
    secure_url: "https://example.com/a.webm",
    duration: 5,
    bytes: 20,
  };
  mock.method(
    cloudinary.uploader,
    "upload_stream",
    (_options, callback) =>
      new Writable({
        write(_chunk, _encoding, done) {
          done();
        },
        final(done) {
          callback(null, result);
          done();
        },
      }),
  );
  assert.equal((await uploadAudio(Buffer.from("audio"))).duration, 5);
  result = { ...result, duration: 301 };
  await assert.rejects(uploadAudio(Buffer.from("audio")), { status: 400 });
  result = { ...result, duration: 5, width: 640, height: 480 };
  await assert.rejects(uploadAudio(Buffer.from("video")), { status: 400 });
  assert.deepEqual(destroyed, ["recording", "recording"]);
});

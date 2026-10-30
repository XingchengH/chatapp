import { test, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import User from "../src/models/user.model.js";
import Message from "../src/models/message.model.js";
import {
  sendMessage,
  getMessages,
  getUsersForSidebar,
} from "../src/controllers/message.controller.js";
import {
  decodeMessageCursor,
  encodeMessageCursor,
  validateMessage,
  validateImage,
  validateEmail,
  pageLimit,
} from "../src/lib/validation.js";
const alice = "507f1f77bcf86cd799439011";
const bob = "507f1f77bcf86cd799439012";
const response = () => ({
  statusCode: 200,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});
afterEach(() => mock.restoreAll());

test("rejects empty content, non-string text, oversized text, remote URLs and spoofed image bytes", () => {
  for (const body of [
    {},
    { text: " " },
    { text: {} },
    { text: "x".repeat(10001) },
  ])
    assert.throws(() => validateMessage(body), { status: 400 });
  for (const image of [
    "https://example.com/file.png",
    "data:image/png;base64,aGVsbG8=",
    "data:image/svg+xml;base64,PHN2Zy8+",
  ])
    assert.throws(() => validateImage(image), { status: 400 });
  assert.equal(validateEmail(" Alice@Example.COM "), "alice@example.com");
  assert.throws(() => validateEmail({ $ne: null }), { status: 400 });
  assert.throws(() => pageLimit("1000"), { status: 400 });
});
test("schema rejects messages without text or image", async () => {
  await assert.rejects(
    new Message({ senderId: alice, receiverId: bob }).validate(),
  );
});
test("cursor round trips date and ID and rejects malformed input", () => {
  const cursor = encodeMessageCursor({
    createdAt: new Date("2026-01-01T00:00:00Z"),
    _id: alice,
  });
  assert.deepEqual(decodeMessageCursor(cursor), {
    createdAt: new Date("2026-01-01T00:00:00Z"),
    _id: alice,
  });
  for (const input of ["bad", {}, "x".repeat(201)])
    assert.throws(() => decodeMessageCursor(input), { status: 400 });
});
test("send rejects invalid IDs and missing recipients before saving", async () => {
  const saved = mock.method(Message, "create", async () =>
    assert.fail("unexpected save"),
  );
  mock.method(User, "exists", async () => null);
  for (const [id, status] of [
    ["bad-id", 400],
    [bob, 404],
  ]) {
    const res = response();
    await sendMessage(
      { params: { id }, user: { _id: alice }, body: { text: "hello" } },
      res,
    );
    assert.equal(res.statusCode, status);
  }
  assert.equal(saved.mock.callCount(), 0);
});
test("retrying an accepted client message ID returns the existing message without saving again", async () => {
  const existing = { _id: "saved", receiverId: bob, senderId: alice };
  mock.method(Message, "findOne", async () => existing);
  const saved = mock.method(Message, "create", async () =>
    assert.fail("duplicate save"),
  );
  const res = response();
  await sendMessage(
    {
      params: { id: bob },
      user: { _id: alice },
      body: {
        text: "hello",
        clientMessageId: "12345678-1234-1234-1234-123456789012",
      },
    },
    res,
  );
  assert.equal(res.statusCode, 200);
  assert.equal(res.body, existing);
  assert.equal(saved.mock.callCount(), 0);
});
test("history query is bounded, deterministic, cursor-aware and scoped to both participants", async () => {
  const date = new Date("2026-01-01T00:00:00Z");
  const docs = [
    "507f1f77bcf86cd799439015",
    "507f1f77bcf86cd799439014",
    "507f1f77bcf86cd799439013",
  ].map((_id) => ({ _id, createdAt: date }));
  let query;
  mock.method(Message, "find", (filter) => {
    query = filter;
    return {
      sort(order) {
        assert.deepEqual(order, { createdAt: -1, _id: -1 });
        return {
          limit(count) {
            assert.equal(count, 3);
            return { lean: async () => [...docs] };
          },
        };
      },
    };
  });
  const res = response();
  await getMessages(
    {
      params: { id: bob },
      user: { _id: alice },
      query: {
        limit: "2",
        before: encodeMessageCursor({ _id: docs[0]._id, createdAt: date }),
      },
    },
    res,
  );
  assert.equal(res.statusCode, 200);
  assert.deepEqual(query.$and[0].$or, [
    { senderId: alice, receiverId: bob },
    { senderId: bob, receiverId: alice },
  ]);
  assert.equal(query.$and[1].$or[1]._id.$lt, docs[0]._id);
  assert.deepEqual(
    res.body.messages.map((message) => message._id),
    [docs[1]._id, docs[0]._id],
  );
  assert.equal(decodeMessageCursor(res.body.nextCursor)._id, docs[1]._id);
});
test("contact results expose only sidebar fields and use escaped search and bounded pagination", async () => {
  mock.method(User, "find", (query) => {
    assert.equal(query.fullName.$regex, "Alice\\.\\*");
    assert.equal(query._id.$ne, alice);
    return {
      select(fields) {
        assert.equal(fields, "_id fullName profilePic");
        return {
          sort: () => ({
            limit: (count) => {
              assert.equal(count, 31);
              return { lean: async () => [] };
            },
          }),
        };
      },
    };
  });
  const res = response();
  await getUsersForSidebar(
    { user: { _id: alice }, query: { search: "Alice.*" } },
    res,
  );
  assert.deepEqual(res.body, { users: [], nextCursor: null });
});

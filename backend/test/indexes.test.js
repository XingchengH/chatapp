import { afterEach, mock, test } from "node:test";
import assert from "node:assert/strict";
import User from "../src/models/user.model.js";
import Message from "../src/models/message.model.js";
import { ensureIndexes } from "../src/lib/indexes.js";

afterEach(() => mock.restoreAll());

test("production index setup waits for both collections without dropping indexes", async () => {
  const completed = [];
  mock.method(User, "createIndexes", async () => {
    completed.push("users");
  });
  mock.method(Message, "createIndexes", async () => {
    completed.push("messages");
  });
  mock.method(User, "syncIndexes", () =>
    assert.fail("would drop existing user indexes"),
  );
  mock.method(Message, "syncIndexes", () =>
    assert.fail("would drop existing message indexes"),
  );
  await ensureIndexes();
  assert.deepEqual(completed, ["users", "messages"]);
});

test("index failures propagate so startup cannot serve without retry uniqueness", async () => {
  mock.method(User, "createIndexes", async () => {});
  mock.method(Message, "createIndexes", async () => {
    throw new Error("index build failed");
  });
  await assert.rejects(ensureIndexes(), /index build failed/);
});

import { test, before, after, mock } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import jwt from "jsonwebtoken";
import { io as clientIO } from "socket.io-client";
import User from "../src/models/user.model.js";
import { io, server, userRoom, disconnectSession } from "../src/lib/socket.js";

process.env.JWT_SECRET = "test-secret-never-used-outside-tests";
const alice = "507f1f77bcf86cd799439011";
const bob = "507f1f77bcf86cd799439012";
const clients = [];
let url;
before(async () => {
  mock.method(User, "findById", (id) => ({
    select: async () => ({ _id: id }),
  }));
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  url = "http://127.0.0.1:" + server.address().port;
});
after(async () => {
  clients.forEach((client) => client.disconnect());
  await new Promise((resolve) => io.close(resolve));
  mock.restoreAll();
});
const token = (id, expiresIn = "1d") =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn });
function create(cookie, queryId) {
  const client = clientIO(url, {
    autoConnect: false,
    transports: ["websocket"],
    reconnection: false,
    forceNew: true,
    query: { userId: queryId },
    extraHeaders: cookie ? { Cookie: "jwt=" + cookie } : {},
  });
  clients.push(client);
  return client;
}
async function connect(client) {
  const ready = once(client, "connect");
  client.connect();
  await ready;
}
test(
  "anonymous, invalid and expired sessions cannot connect",
  { timeout: 5000 },
  async () => {
    for (const cookie of [undefined, "invalid", token(alice, -1)]) {
      const client = create(cookie, alice);
      const result = Promise.race([
        once(client, "connect_error").then(([error]) => error.message),
        once(client, "connect").then(() => "unexpected connection"),
      ]);
      client.connect();
      assert.equal(await result, "Authentication required");
      client.disconnect();
    }
  },
);
test(
  "identity comes from the JWT, not the query string",
  { timeout: 5000 },
  async () => {
    const client = create(token(alice), bob);
    await connect(client);
    const socket = io.sockets.sockets.get(client.id);
    assert.ok(socket.rooms.has(userRoom(alice)));
    assert.ok(!socket.rooms.has(userRoom(bob)));
  },
);
test(
  "all tabs receive messages and closing one preserves the remaining tab",
  { timeout: 5000 },
  async () => {
    const first = create(token(bob), bob);
    const second = create(token(bob), bob);
    await connect(first);
    await connect(second);
    const received = [once(first, "newMessage"), once(second, "newMessage")];
    io.to(userRoom(bob)).emit("newMessage", { _id: "one" });
    assert.deepEqual(
      (await Promise.all(received)).map(([message]) => message._id),
      ["one", "one"],
    );
    const disconnected = once(io.sockets.sockets.get(first.id), "disconnect");
    first.disconnect();
    await disconnected;
    const remaining = once(second, "newMessage");
    io.to(userRoom(bob)).emit("newMessage", { _id: "two" });
    assert.equal((await remaining)[0]._id, "two");
    assert.equal(io.sockets.adapter.rooms.get(userRoom(bob)).size, 1);
  },
);
test(
  "logout disconnects every socket using that session",
  { timeout: 5000 },
  async () => {
    const cookie = token(alice);
    const client = create(cookie, alice);
    await connect(client);
    const closed = once(client, "disconnect");
    disconnectSession(cookie);
    assert.equal((await closed)[0], "io server disconnect");
  },
);
test(
  "an established socket disconnects when its JWT expires",
  { timeout: 5000 },
  async () => {
    const client = create(token(bob, 2), bob);
    await connect(client);
    assert.equal((await once(client, "disconnect"))[0], "io server disconnect");
  },
);

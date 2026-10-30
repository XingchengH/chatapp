import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import "../src/app.js";
import { server, io } from "../src/lib/socket.js";
let base;
before(async () => {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  base = "http://127.0.0.1:" + server.address().port;
});
after(async () => {
  await new Promise((resolve) => io.close(resolve));
});
test("health distinguishes liveness from database readiness", async () => {
  assert.equal((await fetch(base + "/health/live")).status, 200);
  assert.equal((await fetch(base + "/health/ready")).status, 503);
});
test("anonymous API access is rejected and unknown API routes stay JSON", async () => {
  assert.equal((await fetch(base + "/api/messages/users")).status, 401);
  const unknown = await fetch(base + "/api/missing");
  assert.equal(unknown.status, 404);
  assert.match(unknown.headers.get("content-type"), /application\/json/);
});
test("malformed JSON returns a usable client error", async () => {
  const res = await fetch(base + "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{",
  });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).message, "Invalid JSON body");
});
test("authentication requests are rate-limited", async () => {
  let res;
  for (let index = 0; index < 31; index++) {
    res = await fetch(base + "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: { $ne: null }, password: "password" }),
    });
  }
  assert.equal(res.status, 429);
  assert.ok(res.headers.get("ratelimit"));
});

import { afterEach, mock, test } from "node:test";
import assert from "node:assert/strict";
import cloudinary, { uploadImage } from "../src/lib/cloudinary.js";

afterEach(() => mock.restoreAll());

test("unconfigured uploads fail clearly without contacting Cloudinary", async () => {
  mock.method(cloudinary, "config", () => ({}));
  const upload = mock.method(cloudinary.uploader, "upload", () =>
    assert.fail("unexpected external upload"),
  );
  await assert.rejects(
    uploadImage("data:image/png;base64,test"),
    (error) =>
      error.status === 503 &&
      error.message === "Image uploads are not configured",
  );
  assert.equal(upload.mock.callCount(), 0);
});

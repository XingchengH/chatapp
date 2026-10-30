import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "../lib/db.js";
import User from "../models/user.model.js";
try {
  await connectDB();
  const users = await User.find({}).select("_id email").lean();
  const seen = new Map();
  const updates = [];
  for (const user of users) {
    const normalized = user.email.trim().toLowerCase();
    if (seen.has(normalized))
      throw new Error(
        "Duplicate normalized emails exist. Resolve them before migration. User IDs: " +
          seen.get(normalized) +
          ", " +
          user._id,
      );
    seen.set(normalized, String(user._id));
    if (user.email !== normalized)
      updates.push({
        updateOne: {
          filter: { _id: user._id },
          update: { $set: { email: normalized } },
        },
      });
  }
  if (process.argv.includes("--apply") && updates.length)
    await User.bulkWrite(updates);
  console.log(
    updates.length +
      " addresses " +
      (process.argv.includes("--apply")
        ? "normalized"
        : "would be normalized; pass --apply to write"),
  );
} finally {
  await mongoose.disconnect();
}

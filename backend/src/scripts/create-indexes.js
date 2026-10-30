import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "../lib/db.js";
import { ensureIndexes } from "../lib/indexes.js";
try {
  await connectDB();
  await ensureIndexes();
  console.log("Database indexes are ready");
} finally {
  await mongoose.disconnect();
}

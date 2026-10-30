import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "../lib/db.js";
import User from "../models/user.model.js";
import Message from "../models/message.model.js";
try {
  await connectDB();
  // createIndexes adds required indexes without dropping existing database indexes.
  await User.createIndexes();
  await Message.createIndexes();
  console.log("Database indexes are ready");
} finally {
  await mongoose.disconnect();
}

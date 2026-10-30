import mongoose from "mongoose";
export default async function connectDB() {
  await mongoose.connect(process.env.MONGODB_URI, {
    autoIndex: process.env.NODE_ENV !== "production",
    serverSelectionTimeoutMS: 10000,
  });
  console.log("MongoDB connected");
}

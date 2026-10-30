import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import mongoose from "mongoose";
import { fileURLToPath } from "node:url";
import path from "node:path";
import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import { app } from "./lib/socket.js";

app.disable("x-powered-by");
app.set("trust proxy", Number(process.env.TRUST_PROXY_HOPS || 0));
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json({ limit: "8mb" }));
app.get("/health/live", (_req, res) => res.json({ status: "ok" }));
app.get("/health/ready", (_req, res) => {
  const ready = mongoose.connection.readyState === 1;
  res
    .status(ready ? 200 : 503)
    .json({ status: ready ? "ready" : "unavailable" });
});
app.use("/api", (_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api", (_req, res) =>
  res.status(404).json({ message: "API route not found" }),
);
if (process.env.NODE_ENV === "production") {
  const frontend = fileURLToPath(
    new URL("../../frontend/dist/", import.meta.url),
  );
  app.use(express.static(frontend));
  app.get("*", (_req, res) => res.sendFile(path.join(frontend, "index.html")));
}
app.use((error, _req, res, _next) => {
  if (error.type === "entity.too.large")
    return res
      .status(413)
      .json({
        message: "Request is too large. Images must be no larger than 5 MB.",
      });
  if (error.type === "entity.parse.failed")
    return res.status(400).json({ message: "Invalid JSON body" });
  console.error("Unhandled request error:", error.message);
  res.status(500).json({ message: "Internal server error" });
});
export default app;

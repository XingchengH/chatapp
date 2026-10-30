import "dotenv/config";
import { validateEnvironment } from "./lib/config.js";

// Load environment variables before importing modules that configure sockets and providers.
try {
  const { port } = validateEnvironment();
  const { default: connectDB } = await import("./lib/db.js");
  await connectDB();
  await import("./app.js");
  const { server, io } = await import("./lib/socket.js");
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, resolve);
  });
  console.log("Server listening on port " + port);
  let shuttingDown = false;
  const shutdown = async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    const deadline = setTimeout(() => process.exit(1), 10000);
    deadline.unref();
    await new Promise((resolve) => io.close(resolve));
    const { default: mongoose } = await import("mongoose");
    await mongoose.disconnect();
    clearTimeout(deadline);
  };
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
} catch (error) {
  console.error("Startup failed:", error.message);
  process.exit(1);
}

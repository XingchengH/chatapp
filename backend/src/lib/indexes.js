import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import Call from "../models/call.model.js";

export async function ensureIndexes() {
  // Add missing indexes without dropping existing indexes or modifying documents.
  await User.createIndexes();
  await Message.createIndexes();
  await Call.createIndexes();
}

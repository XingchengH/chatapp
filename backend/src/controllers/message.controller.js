import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import { uploadImage } from "../lib/cloudinary.js";
import { io, userRoom } from "../lib/socket.js";
import { HttpError, respondWithError } from "../lib/errors.js";
import {
  validateObjectId,
  validateMessage,
  pageLimit,
  decodeMessageCursor,
  encodeMessageCursor,
  escapeRegex,
} from "../lib/validation.js";

export const getUsersForSidebar = async (req, res) => {
  try {
    const limit = pageLimit(req.query.limit, 30);
    const query = { _id: { $ne: req.user._id } };
    if (req.query.after !== undefined)
      query._id.$gt = validateObjectId(req.query.after);
    if (req.query.search !== undefined) {
      if (typeof req.query.search !== "string" || req.query.search.length > 100)
        throw new HttpError(400, "Search must contain at most 100 characters");
      query.fullName = {
        $regex: escapeRegex(req.query.search.trim()),
        $options: "i",
      };
    }
    const users = await User.find(query)
      .select("_id fullName profilePic")
      .sort({ _id: 1 })
      .limit(limit + 1)
      .lean();
    const hasMore = users.length > limit;
    if (hasMore) users.pop();
    res
      .status(200)
      .json({ users, nextCursor: hasMore ? String(users.at(-1)._id) : null });
  } catch (error) {
    respondWithError(res, error);
  }
};
export const getMessages = async (req, res) => {
  try {
    const peer = validateObjectId(req.params.id);
    const limit = pageLimit(req.query.limit);
    const cursor = decodeMessageCursor(req.query.before);
    const query = {
      $and: [
        {
          $or: [
            { senderId: req.user._id, receiverId: peer },
            { senderId: peer, receiverId: req.user._id },
          ],
        },
      ],
    };
    if (cursor)
      query.$and.push({
        $or: [
          { createdAt: { $lt: cursor.createdAt } },
          { createdAt: cursor.createdAt, _id: { $lt: cursor._id } },
        ],
      });
    const messages = await Message.find(query)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit + 1)
      .lean();
    const hasMore = messages.length > limit;
    if (hasMore) messages.pop();
    const nextCursor = hasMore ? encodeMessageCursor(messages.at(-1)) : null;
    res.status(200).json({ messages: messages.reverse(), nextCursor });
  } catch (error) {
    respondWithError(res, error);
  }
};
export const sendMessage = async (req, res) => {
  try {
    const receiverId = validateObjectId(req.params.id);
    const { text, image, clientMessageId } = validateMessage(req.body);
    const senderId = req.user._id;
    if (receiverId === String(senderId))
      throw new HttpError(400, "Choose another user");
    const duplicateQuery = { senderId, clientMessageId };
    if (clientMessageId) {
      const existing = await Message.findOne(duplicateQuery);
      if (existing) {
        if (String(existing.receiverId) !== receiverId)
          throw new HttpError(409, "Message request ID already used");
        return res.status(200).json(existing);
      }
    }
    if (!(await User.exists({ _id: receiverId })))
      throw new HttpError(404, "Recipient not found");
    let imageUrl;
    if (image) {
      const upload = await uploadImage(image);
      imageUrl = upload.secure_url;
    }
    let message;
    try {
      message = await Message.create({
        senderId,
        receiverId,
        text,
        image: imageUrl,
        clientMessageId,
      });
    } catch (error) {
      if (error.code !== 11000 || !clientMessageId) throw error;
      message = await Message.findOne(duplicateQuery);
      if (!message || String(message.receiverId) !== receiverId)
        throw new HttpError(409, "Message request ID already used");
    }
    io.to(userRoom(receiverId))
      .to(userRoom(senderId))
      .emit("newMessage", message);
    res.status(200).json(message);
  } catch (error) {
    respondWithError(res, error);
  }
};

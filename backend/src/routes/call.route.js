import { Router } from "express";
import mongoose from "mongoose";
import Call from "../models/call.model.js";
import User from "../models/user.model.js";
import { protectedRoute } from "../middleware/auth.middleware.js";
import { messageLimiter } from "../middleware/rate-limit.js";
import { validateObjectId } from "../lib/validation.js";
import { HttpError, respondWithError } from "../lib/errors.js";
import { callService, callToken } from "../lib/calls.js";
const router = Router();
router.use(protectedRoute);
const wrap = (handler) => async (req, res) => {
  try {
    await handler(req, res);
  } catch (error) {
    respondWithError(res, error);
  }
};
const active = () => ({ ended: false, expiresAt: { $gt: new Date() } });
router.get(
  "/",
  wrap(async (req, res) => {
    const calls = await Call.find({
      ...active(),
      members: {
        $elemMatch: { userId: req.user._id, status: { $ne: "declined" } },
      },
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate("hostId", "fullName")
      .lean();
    res.json(calls);
  }),
);
router.post(
  "/",
  messageLimiter,
  wrap(async (req, res) => {
    const service = callService();
    if (
      !Array.isArray(req.body.userIds) ||
      !req.body.userIds.length ||
      req.body.userIds.length > 7
    )
      throw new HttpError(400, "Invite between one and seven people");
    const ids = [...new Set(req.body.userIds.map(validateObjectId))].filter(
      (id) => id !== String(req.user._id),
    );
    if (
      !ids.length ||
      (await User.countDocuments({ _id: { $in: ids } })) !== ids.length
    )
      throw new HttpError(400, "Choose valid participants");
    const call = new Call({
      _id: new mongoose.Types.ObjectId(),
      hostId: req.user._id,
      members: [
        { userId: req.user._id, status: "accepted" },
        ...ids.map((userId) => ({
          userId,
          status: "invited",
          invitedUntil: new Date(Date.now() + 60000),
        })),
      ],
      expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
    });
    await service.rooms.createRoom({
      name: "call-" + call._id,
      maxParticipants: 8,
      emptyTimeout: 300,
    });
    try {
      await call.save();
    } catch (error) {
      await service.rooms.deleteRoom("call-" + call._id).catch(() => {});
      throw error;
    }
    res.status(201).json(call);
  }),
);
router.post(
  "/:id/join",
  messageLimiter,
  wrap(async (req, res) => {
    const service = callService();
    const call = await Call.findOneAndUpdate(
      {
        _id: validateObjectId(req.params.id),
        ...active(),
        members: {
          $elemMatch: {
            userId: req.user._id,
            $or: [
              { status: "accepted" },
              { status: "invited", invitedUntil: { $gt: new Date() } },
            ],
          },
        },
      },
      { $set: { "members.$.status": "accepted" } },
      { new: true },
    );
    if (!call) throw new HttpError(403, "This invitation is unavailable");
    // Explicit creation preserves the room's participant limit if an empty room expired.
    await service.rooms.createRoom({
      name: "call-" + call._id,
      maxParticipants: 8,
      emptyTimeout: 300,
    });
    res.json({
      token: await callToken(call, req.user),
      url: service.url,
      callId: String(call._id),
      hostId: String(call.hostId),
    });
  }),
);
router.post(
  "/:id/decline",
  messageLimiter,
  wrap(async (req, res) => {
    await Call.updateOne(
      {
        _id: validateObjectId(req.params.id),
        members: { $elemMatch: { userId: req.user._id, status: "invited" } },
      },
      { $set: { "members.$.status": "declined" } },
    );
    res.json({ ok: true });
  }),
);
router.post(
  "/:id/invite",
  messageLimiter,
  wrap(async (req, res) => {
    const userId = validateObjectId(req.body.userId);
    if (!(await User.exists({ _id: userId })))
      throw new HttpError(404, "Participant not found");
    const call = await Call.findOneAndUpdate(
      {
        _id: validateObjectId(req.params.id),
        ...active(),
        hostId: req.user._id,
        "members.userId": { $ne: userId },
        $expr: { $lt: [{ $size: "$members" }, 8] },
      },
      {
        $push: {
          members: {
            userId,
            status: "invited",
            invitedUntil: new Date(Date.now() + 60000),
          },
        },
      },
      { new: true },
    );
    if (!call)
      throw new HttpError(
        409,
        "Only the host can invite new participants; the call supports eight people",
      );
    res.json({ ok: true });
  }),
);
router.post(
  "/:id/end",
  messageLimiter,
  wrap(async (req, res) => {
    const call = await Call.findOne({
      _id: validateObjectId(req.params.id),
      hostId: req.user._id,
    });
    if (!call) throw new HttpError(403, "Only the host can end this call");
    await callService().rooms.deleteRoom("call-" + call._id);
    call.ended = true;
    await call.save();
    res.json({ ok: true });
  }),
);
export default router;

import mongoose from "mongoose";
const schema = new mongoose.Schema(
  {
    hostId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    members: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        status: {
          type: String,
          enum: ["invited", "accepted", "declined"],
          required: true,
        },
        invitedUntil: Date,
      },
    ],
    ended: { type: Boolean, default: false },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);
schema.index({ "members.userId": 1, ended: 1, expiresAt: 1 });
export default mongoose.model("Call", schema);

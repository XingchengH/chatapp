import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      maxlength: 10000,
      trim: true,
    },
    image: {
      type: String,
    },
    clientMessageId: { type: String },
  },
  {
    timestamps: true,
  },
);

messageSchema.pre("validate", function () {
  if (!this.text?.trim() && !this.image)
    this.invalidate("text", "A message must contain text or an image");
});
messageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1, _id: -1 });
messageSchema.index(
  { senderId: 1, clientMessageId: 1 },
  {
    unique: true,
    partialFilterExpression: { clientMessageId: { $type: "string" } },
  },
);
const Message = mongoose.model("Message", messageSchema);
export default Message;

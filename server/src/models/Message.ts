import {
  Schema,
  model,
  type Document,
  type Types,
} from "mongoose";

export interface IMessage extends Document {
  senderId: Types.ObjectId;
  recipientId: Types.ObjectId;
  content: string;
  readAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    senderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    recipientId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },

    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

messageSchema.index({
  senderId: 1,
  recipientId: 1,
  createdAt: 1,
});

export const Message = model<IMessage>(
  "Message",
  messageSchema,
);

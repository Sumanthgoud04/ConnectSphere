import { Schema, model, type Document, type Types } from "mongoose";

export type ConnectionStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED";

export interface IConnection extends Document {
  requesterId: Types.ObjectId;
  recipientId: Types.ObjectId;
  status: ConnectionStatus;
  createdAt: Date;
  updatedAt: Date;
}

const connectionSchema = new Schema<IConnection>(
  {
    requesterId: {
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

    status: {
      type: String,
      enum: ["PENDING", "ACCEPTED", "REJECTED"],
      default: "PENDING",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

export const Connection = model<IConnection>(
  "Connection",
  connectionSchema,
);
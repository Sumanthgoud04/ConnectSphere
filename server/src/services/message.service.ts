import { Connection } from "../models/Connection.js";
import { Message } from "../models/Message.js";

const areUsersConnected = async (
  userId: string,
  otherUserId: string,
): Promise<boolean> => {
  const connection = await Connection.findOne({
    status: "ACCEPTED",
    $or: [
      {
        requesterId: userId,
        recipientId: otherUserId,
      },
      {
        requesterId: otherUserId,
        recipientId: userId,
      },
    ],
  });

  return Boolean(connection);
};

export const sendMessage = async (
  senderId: string,
  recipientId: string,
  content: string,
) => {
  if (senderId === recipientId) {
    throw new Error("You cannot message yourself");
  }

  const connected = await areUsersConnected(
    senderId,
    recipientId,
  );

  if (!connected) {
    throw new Error(
      "You can only message accepted connections",
    );
  }

  const trimmedContent = content.trim();

  if (!trimmedContent) {
    throw new Error("Message content is required");
  }

  const message = await Message.create({
    senderId,
    recipientId,
    content: trimmedContent,
  });

  return message.populate([
    {
      path: "senderId",
      select: "name photo headline",
    },
    {
      path: "recipientId",
      select: "name photo headline",
    },
  ]);
};

export const getConversation = async (
  userId: string,
  otherUserId: string,
) => {
  if (userId === otherUserId) {
    throw new Error("Invalid conversation");
  }

  const connected = await areUsersConnected(
    userId,
    otherUserId,
  );

  if (!connected) {
    throw new Error(
      "You can only view messages with accepted connections",
    );
  }

  const messages = await Message.find({
    $or: [
      {
        senderId: userId,
        recipientId: otherUserId,
      },
      {
        senderId: otherUserId,
        recipientId: userId,
      },
    ],
  })
    .sort({ createdAt: 1 })
    .populate("senderId", "name photo headline")
    .populate("recipientId", "name photo headline");

  return messages;
};

export const markConversationAsRead = async (
  userId: string,
  otherUserId: string,
) => {
  const connected = await areUsersConnected(
    userId,
    otherUserId,
  );

  if (!connected) {
    throw new Error(
      "You can only mark messages as read with accepted connections",
    );
  }

  await Message.updateMany(
    {
      senderId: otherUserId,
      recipientId: userId,
      readAt: null,
    },
    {
      $set: {
        readAt: new Date(),
      },
    },
  );
};

export const getConversationSummaries = async (
  userId: string,
) => {
  const connections = await Connection.find({
    status: "ACCEPTED",
    $or: [
      {
        requesterId: userId,
      },
      {
        recipientId: userId,
      },
    ],
  }).populate(
    "requesterId recipientId",
    "name photo headline",
  );

  const summaries = await Promise.all(
    connections.map(async (connection) => {
      const requester = connection.requesterId as unknown as {
        _id: string;
        name: string;
        photo?: string;
        headline?: string;
      };

      const recipient = connection.recipientId as unknown as {
        _id: string;
        name: string;
        photo?: string;
        headline?: string;
      };

      const otherUser =
        requester._id.toString() === userId
          ? recipient
          : requester;

      const lastMessage = await Message.findOne({
        $or: [
          {
            senderId: userId,
            recipientId: otherUser._id,
          },
          {
            senderId: otherUser._id,
            recipientId: userId,
          },
        ],
      })
        .sort({ createdAt: -1 })
        .select(
          "senderId recipientId content createdAt readAt",
        );

      const unreadCount = await Message.countDocuments({
        senderId: otherUser._id,
        recipientId: userId,
        readAt: null,
      });

      return {
        user: otherUser,
        lastMessage,
        unreadCount,
      };
    }),
  );

  return summaries.sort((a, b) => {
    const dateA = a.lastMessage
      ? new Date(a.lastMessage.createdAt).getTime()
      : 0;

    const dateB = b.lastMessage
      ? new Date(b.lastMessage.createdAt).getTime()
      : 0;

    return dateB - dateA;
  });
};
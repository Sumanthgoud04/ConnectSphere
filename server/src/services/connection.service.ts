import { Connection } from "../models/Connection.js";
export const sendConnectionRequest = async (
  requesterId: string,
  recipientId: string,
) => {
  if (requesterId === recipientId) {
    throw new Error("You cannot connect with yourself");
  }

  const existingConnection = await Connection.findOne({
    $or: [
      {
        requesterId,
        recipientId,
      },
      {
        requesterId: recipientId,
        recipientId: requesterId,
      },
    ],
  });

  if (existingConnection) {
    throw new Error(
      `Connection already exists with status ${existingConnection.status}`,
    );
  }

  const connection = await Connection.create({
    requesterId,
    recipientId,
    status: "PENDING",
  });

  return connection;
};

// accept 


export const acceptConnectionRequest = async (
  connectionId: string,
  recipientId: string,
) => {
  const connection = await Connection.findOne({
    _id: connectionId,
    recipientId,
    status: "PENDING",
  });

  if (!connection) {
    return null;
  }

  connection.status = "ACCEPTED";
  connection.connectedAt = new Date();

  await connection.save();

  return connection;
};

// reject flow

export const rejectConnectionRequest = async (
  connectionId: string,
  recipientId: string,
) => {
  const connection = await Connection.findOne({
    _id: connectionId,
    recipientId,
    status: "PENDING",
  });

  if (!connection) {
    return null;
  }

  connection.status = "REJECTED";

  await connection.save();

  return connection;
};

//Get received requests

export const getReceivedRequests = async (userId: string) => {
  return Connection.find({
    recipientId: userId,
    status: "PENDING",
  })
    .sort({ createdAt: -1 })
    .populate("requesterId", "name photo headline");
};

// Get sent requests

export const getSentRequests = async (userId: string) => {
  return Connection.find({
    requesterId: userId,
    status: "PENDING",
  })
    .sort({ createdAt: -1 })
    .populate("recipientId", "name photo headline");
};

//Get accepted connections
// Get accepted connections

export const getConnections = async (userId: string) => {
  return Connection.find({
    status: "ACCEPTED",
    $or: [
      { requesterId: userId },
      { recipientId: userId },
    ],
  })
    .sort({ updatedAt: -1 })
    .populate("requesterId", "name photo headline")
    .populate("recipientId", "name photo headline");
};

// Get accepted connection count

export const getConnectionCount = async (userId: string) => {
  return Connection.countDocuments({
    status: "ACCEPTED",
    $or: [
      { requesterId: userId },
      { recipientId: userId },
    ],
  });
};
export const getRelationship = async (
  currentUserId: string,
  otherUserId: string,
) => {
  if (currentUserId === otherUserId) {
    return {
      status: "SELF",
      connectionId: null,
    };
  }

  const connection = await Connection.findOne({
    $or: [
      {
        requesterId: currentUserId,
        recipientId: otherUserId,
      },
      {
        requesterId: otherUserId,
        recipientId: currentUserId,
      },
    ],
  });

  if (!connection) {
    return {
      status: "NONE",
      connectionId: null,
    };
  }

  if (
    connection.status === "ACCEPTED"
  ) {
    return {
      status: "ACCEPTED",
      connectionId: connection._id.toString(),
    };
  }

  if (
    connection.status === "PENDING" &&
    connection.requesterId.toString() === currentUserId
  ) {
    return {
      status: "SENT",
      connectionId: connection._id.toString(),
    };
  }

  if (
    connection.status === "PENDING" &&
    connection.recipientId.toString() === currentUserId
  ) {
    return {
      status: "RECEIVED",
      connectionId: connection._id.toString(),
    };
  }

  return {
    status: connection.status,
    connectionId: connection._id.toString(),
  };
};

export const removeConnection = async (
  connectionId: string,
  userId: string,
) => {
  const connection = await Connection.findOne({
    _id: connectionId,
    status: "ACCEPTED",
    $or: [
      { requesterId: userId },
      { recipientId: userId },
    ],
  });

  if (!connection) {
    return null;
  }

  await connection.deleteOne();

  return connection;
};
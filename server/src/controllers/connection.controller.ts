import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import {
  acceptConnectionRequest,
  getConnections,
  getReceivedRequests,
  getSentRequests,
  rejectConnectionRequest,
  sendConnectionRequest,
  getRelationship,
  getConnectionCount,
  removeConnection,
} from "../services/connection.service.js";

export const sendConnectionRequestController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const { recipientId } = req.body;

    if (!recipientId) {
      return res.status(400).json({
        success: false,
        message: "Recipient ID is required",
      });
    }

    const connection = await sendConnectionRequest(
      req.user!.userId,
      recipientId,
    );

    return res.status(201).json({
      success: true,
      message: "Connection request sent",
      data: {
        connection,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to send connection request";

    return res.status(400).json({
      success: false,
      message,
    });
  }
};

export const acceptConnectionRequestController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const connectionId = req.params.connectionId;

    if (typeof connectionId !== "string") {
        return res.status(400).json({
            success: false,
            message: "Invalid connection ID",
        });
    }

    const connection = await acceptConnectionRequest(
        connectionId,
        req.user!.userId,
    );

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Connection request not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Connection request accepted",
      data: {
        connection,
      },
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to accept connection request",
    });
  }
};

export const rejectConnectionRequestController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
   const connectionId = req.params.connectionId;

   if (typeof connectionId !== "string") {
        return res.status(400).json({
            success: false,
            message: "Invalid connection ID",
        });
   }

   const connection = await rejectConnectionRequest(
    connectionId,
    req.user!.userId,
   );


    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Connection request not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Connection request rejected",
      data: {
        connection,
      },
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to reject connection request",
    });
  }
};

export const getReceivedRequestsController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const requests = await getReceivedRequests(req.user!.userId);

    return res.status(200).json({
      success: true,
      data: {
        requests,
      },
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to load received requests",
    });
  }
};

export const getSentRequestsController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const requests = await getSentRequests(req.user!.userId);

    return res.status(200).json({
      success: true,
      data: {
        requests,
      },
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to load sent requests",
    });
  }
};

export const getConnectionsController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const connections = await getConnections(req.user!.userId);

    return res.status(200).json({
      success: true,
      data: {
        connections,
      },
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to load connections",
    });
  }
};

export const getConnectionCountController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const count = await getConnectionCount(req.user!.userId);

    return res.status(200).json({
      success: true,
      data: {
        count,
      },
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to load connection count",
    });
  }
};

//getRelation

export const getRelationshipController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const otherUserId = req.params.userId;

    if (typeof otherUserId !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    const relationship = await getRelationship(
      req.user!.userId,
      otherUserId,
    );

    return res.status(200).json({
      success: true,
      data: {
        relationship,
      },
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to load relationship",
    });
  }
};

export const removeConnectionController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const connection = await removeConnection(
      String(req.params.connectionId),
      req.user!.userId,
    );

    if (!connection) {
      return res.status(404).json({
        success: false,
        message:
          "Connection not found or you are not allowed to remove it",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Connection removed successfully",
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to remove connection",
    });
  }
};
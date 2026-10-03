import type { NextFunction, Request, Response } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { authConfig } from "../config/auth.js";

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
  };
}

interface AccessTokenPayload extends JwtPayload {
  userId: string;
  type: "access";
}

export const authenticate = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void => {
  const accessToken = req.cookies.accessToken;

  if (!accessToken) {
    res.status(401).json({
      success: false,
      message: "Authentication required",
    });
    return;
  }

  try {
    const payload = jwt.verify(
      accessToken,
      authConfig.accessToken.secret,
    ) as AccessTokenPayload;

    if (!payload.userId || payload.type !== "access") {
      res.status(401).json({
        success: false,
        message: "Invalid access token",
      });
      return;
    }

    req.user = {
      userId: payload.userId,
    };

    next();
  } catch {
    res.status(401).json({
      success: false,
      message: "Invalid or expired access token",
    });
  }
};
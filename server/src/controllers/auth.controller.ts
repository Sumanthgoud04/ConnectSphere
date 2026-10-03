import type { Request, Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { loginSchema, signupSchema } from "../utils/validators/auth.validator.js";
import {getCurrentUser,
        login, 
        refreshAccessToken,
        logout,
        signup,
    } from "../services/auth.service.js"
import { authConfig } from "../config/auth.js";

// Signup 
export const signupController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const result = signupSchema.safeParse(req.body);

    if (!result.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: result.error.flatten().fieldErrors,
      });
      return;
    }

    const user = await signup(result.data);

    res.status(201).json({
      success: true,
      message: "Account created successfully",
      data: {
        user,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create account";

    if (message === "An account with this email already exists") {
      res.status(409).json({
        success: false,
        message,
      });
      return;
    }

    console.error("Signup error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create account",
    });
  }
};

// login 

export const loginController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const result = loginSchema.safeParse(req.body);

    if (!result.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: result.error.flatten().fieldErrors,
      });
      return;
    }

    const { user, accessToken, refreshToken } = await login(result.data);

    res.cookie(
      "accessToken",
      accessToken,
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 15 * 60 * 1000,
      },
    );

    res.cookie(
      "refreshToken",
      refreshToken,
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
    );

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to login";

    if (message === "Invalid email or password") {
      res.status(401).json({
        success: false,
        message,
      });
      return;
    }

    console.error("Login error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to login",
    });
  }
};

//refreshtoken 

export const refreshTokenController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      res.status(401).json({
        success: false,
        message: "Refresh token is required",
      });
      return;
    }

    const accessToken = await refreshAccessToken(refreshToken);

    res.cookie(
      authConfig.cookie.accessToken.name,
      accessToken,
      authConfig.cookie.accessToken,
    );

    res.status(200).json({
      success: true,
      message: "Access token refreshed successfully",
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to refresh access token";

    res.status(401).json({
      success: false,
      message,
    });
  }
};

//logout

export const logoutController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      await logout(refreshToken);
    }

    res.clearCookie(
      authConfig.cookie.accessToken.name,
      authConfig.cookie.accessToken,
    );

    res.clearCookie(
      authConfig.cookie.refreshToken.name,
      authConfig.cookie.refreshToken,
    );

    res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    console.error("Logout error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to logout",
    });
  }
};

//get current user

export const getMeController = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const user = await getCurrentUser(req.user.userId);

    res.status(200).json({
      success: true,
      data: {
        user,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to get user";

    if (message === "User not found") {
      res.status(404).json({
        success: false,
        message,
      });
      return;
    }

    console.error("Get current user error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to get current user",
    });
  }
};
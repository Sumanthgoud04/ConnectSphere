import type { Response } from "express";

import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";

import {
  getUserProfile,
  searchUsers,
  updateMyProfile,
  type UpdateProfileData,
} from "../services/user.service.js";

export const searchUsersController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const search =
      typeof req.query.search === "string"
        ? req.query.search
        : "";

    const users = await searchUsers(
      req.user!.userId,
      search,
    );

    return res.status(200).json({
      success: true,
      data: {
        users,
      },
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to search users",
    });
  }
};

export const getUserProfileController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.params.userId;

    if (typeof userId !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    const user = await getUserProfile(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        user,
      },
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to load user profile",
    });
  }
};

/*
 * Update the authenticated user's own profile.
 */
export const updateMyProfileController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const updatedUser = await updateMyProfile(
      req.user!.userId,
      req.body as UpdateProfileData,
    );

    return res.status(200).json({
      success: true,
      data: {
        user: updatedUser,
      },
    });
  } catch (error) {
    /*
     * Zod validation errors are converted into a clean
     * client-facing 400 response.
     */
    if (
      error &&
      typeof error === "object" &&
      "issues" in error
    ) {
      const zodError = error as {
        issues: { message: string }[];
      };

      return res.status(400).json({
        success: false,
        message:
          zodError.issues[0]?.message ||
          "Invalid profile data",
      });
    }

    if (
      error instanceof Error &&
      error.message === "User not found"
    ) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update profile",
    });
  }
};
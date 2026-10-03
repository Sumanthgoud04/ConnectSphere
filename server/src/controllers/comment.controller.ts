import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import {
  createComment,
  deleteComment,
  getPostComments,
  likeComment,
} from "../services/comment.service.js";
import { createCommentSchema } from "../utils/validators/comment.validator.js";

export const createCommentController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const validation = createCommentSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message:
          validation.error.issues[0]?.message ??
          "Invalid comment data",
      });
    }

    const comment = await createComment({
      postId: String(req.params.postId),
      authorId: req.user!.userId,
      content: validation.data.content,
      parentCommentId:
        validation.data.parentCommentId || undefined,
    });

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Post or parent comment not found",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Comment created successfully",
      data: { comment },
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to create comment",
    });
  }
};

export const getCommentsController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const comments = await getPostComments(
      String(req.params.postId),
    );

    return res.status(200).json({
      success: true,
      data: { comments },
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to load comments",
    });
  }
};

export const deleteCommentController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const comment = await deleteComment(
      String(req.params.commentId),
      req.user!.userId,
    );

    if (!comment) {
      return res.status(404).json({
        success: false,
        message:
          "Comment not found or you are not allowed to delete it",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Comment deleted successfully",
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to delete comment",
    });
  }
};

export const likeCommentController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const result = await likeComment(
      String(req.params.commentId),
      req.user!.userId,
    );

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to like comment",
    });
  }
};
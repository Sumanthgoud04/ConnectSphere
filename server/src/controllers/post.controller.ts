import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";

import {
  createPost,
  deletePost,
  getFeed,
  likePost,
  getMyPosts,
  searchPosts,
  getPostLikes,
} from "../services/post.service.js";

import { createPostSchema } from "../utils/validators/post.validator.js";

export const createPostController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    /*
     * Validate the text fields first.
     *
     * When using multipart/form-data, multer places
     * text fields inside req.body and the uploaded file
     * inside req.file.
     */
    const validation = createPostSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message:
          validation.error.issues[0]?.message ??
          "Invalid post data",
      });
    }

    /*
     * If the user uploaded an image file, multer gives us
     * the uploaded file through req.file.
     */
    const uploadedFile = req.file;

    /*
     * Build the public URL for the uploaded image.
     *
     * Example:
     * http://localhost:5000/uploads/172839201-image.jpg
     */
    const uploadedImageUrl = uploadedFile
      ? `${req.protocol}://${req.get("host")}/uploads/${uploadedFile.filename}`
      : undefined;

    /*
     * File upload takes priority over an image URL.
     *
     * If no file was uploaded, we keep supporting the
     * existing imageUrl functionality.
     */
    const imageUrl =
      uploadedImageUrl ??
      validation.data.imageUrl ??
      undefined;

    const post = await createPost({
      authorId: req.user!.userId,
      content: validation.data.content,
      imageUrl,
    });

    return res.status(201).json({
      success: true,
      message: "Post created successfully",
      data: { post },
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to create post",
    });
  }
};

export const getFeedController = async (
  _req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const posts = await getFeed();

    return res.status(200).json({
      success: true,
      data: { posts },
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to load feed",
    });
  }
};

export const deletePostController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const post = await deletePost(
      String(req.params.postId),
      req.user!.userId,
    );

    if (!post) {
      return res.status(404).json({
        success: false,
        message:
          "Post not found or you are not allowed to delete it",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Post deleted successfully",
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to delete post",
    });
  }
};

export const likePostController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const result = await likePost(
      String(req.params.postId),
      req.user!.userId,
    );

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to like post",
    });
  }
};

export const getMyPostsController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const posts = await getMyPosts(req.user!.userId);

    return res.status(200).json({
      success: true,
      data: {
        posts,
      },
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to load your posts",
    });
  }
};

export const searchPostsController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const search = String(
      req.query.search ?? "",
    ).trim();

    if (!search) {
      return res.status(200).json({
        success: true,
        data: {
          posts: [],
        },
      });
    }

    const posts = await searchPosts(search);

    return res.status(200).json({
      success: true,
      data: {
        posts,
      },
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to search posts",
    });
  }
};

export const getPostLikesController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const likes = await getPostLikes(
      String(req.params.postId),
    );

    if (!likes) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        likes,
      },
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to load post likes",
    });
  }
};
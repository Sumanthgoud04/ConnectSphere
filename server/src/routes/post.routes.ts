import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import upload from "../middleware/upload.middleware.js";
import {
  createPostController,
  deletePostController,
  getFeedController,
  likePostController,
  getMyPostsController,
} from "../controllers/post.controller.js";
import {
  createCommentController,
  deleteCommentController,
  getCommentsController,
  likeCommentController,
} from "../controllers/comment.controller.js";

const router = Router();

router.use(authenticate);
router.post("/", 
  upload.single("image"),
  createPostController);
router.get("/feed", getFeedController);
router.get("/my-posts", getMyPostsController);
router.delete("/:postId", deletePostController);

router.post("/:postId/like", likePostController);

router.post("/:postId/comments", createCommentController);
router.get("/:postId/comments", getCommentsController);

router.delete(
  "/comments/:commentId",
  deleteCommentController,
);

router.post(
  "/comments/:commentId/like",
  likeCommentController,
);

export default router;
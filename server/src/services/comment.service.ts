import { Comment } from "../models/Comment.js";
import { Post } from "../models/Post.js";

interface CreateCommentInput {
  postId: string;
  authorId: string;
  content: string;
  parentCommentId?: string;
}

export const createComment = async (
  input: CreateCommentInput,
) => {
  const post = await Post.findById(input.postId);

  if (!post) {
    return null;
  }

  if (input.parentCommentId) {
    const parentComment = await Comment.findOne({
      _id: input.parentCommentId,
      postId: input.postId,
    });

    if (!parentComment) {
      return null;
    }
  }

  const comment = await Comment.create({
    postId: input.postId,
    authorId: input.authorId,
    content: input.content,
    ...(input.parentCommentId
    ? { parentCommentId: input.parentCommentId }
    : {}),
  });

  await Post.findByIdAndUpdate(input.postId, {
    $push: {
      comments: comment._id,
    },
  });

  return comment;
};

export const getPostComments = async (postId: string) => {
  return Comment.find({ postId })
    .sort({ createdAt: 1 })
    .populate("authorId", "name photo headline");
};

export const deleteComment = async (
  commentId: string,
  userId: string,
) => {
  const comment = await Comment.findOne({
    _id: commentId,
    authorId: userId,
  });

  if (!comment) {
    return null;
  }

  await Comment.deleteOne({ _id: commentId });

  await Post.findByIdAndUpdate(comment.postId, {
    $pull: {
      comments: comment._id,
    },
  });

  return comment;
};

export const likeComment = async (
  commentId: string,
  userId: string,
) => {
  const comment = await Comment.findById(commentId);

  if (!comment) {
    return null;
  }

  const alreadyLiked = comment.likes.some(
    (id) => id.toString() === userId,
  );

  if (alreadyLiked) {
    await Comment.updateOne(
      { _id: commentId },
      { $pull: { likes: userId } },
    );

    return {
      liked: false,
      likesCount: Math.max(comment.likes.length - 1, 0),
    };
  }

  await Comment.updateOne(
    { _id: commentId },
    { $addToSet: { likes: userId } },
  );

  return {
    liked: true,
    likesCount: comment.likes.length + 1,
  };
};
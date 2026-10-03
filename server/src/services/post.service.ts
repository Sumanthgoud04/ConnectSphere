import { Post } from "../models/Post.js";

interface CreatePostInput {
  authorId: string;
  content: string;
  imageUrl?: string;
}

export const createPost = async (input: CreatePostInput) => {
  const post = await Post.create({
    authorId: input.authorId,
    content: input.content,
    imageUrl: input.imageUrl,
  });

  const populatedPost = await Post.findById(post._id).populate(
    "authorId",
    "name photo headline",
  );

  return populatedPost;
};

export const getFeed = async () => {
  const posts = await Post.find()
    .sort({ createdAt: -1 })
    .populate("authorId", "name photo headline");

  return posts;
};

export const getMyPosts = async (userId: string) => {
  const posts = await Post.find({
    authorId: userId,
  })
    .sort({ createdAt: -1 })
    .populate("authorId", "name photo headline");

  return posts;
};

export const deletePost = async (
  postId: string,
  userId: string,
) => {
  const post = await Post.findOne({
    _id: postId,
    authorId: userId,
  });

  if (!post) {
    return null;
  }

  await post.deleteOne();

  return post;
};

export const likePost = async (
  postId: string,
  userId: string,
) => {
  const post = await Post.findById(postId);

  if (!post) {
    return null;
  }

  const alreadyLiked = post.likes.some(
    (id) => id.toString() === userId,
  );

  if (alreadyLiked) {
    await Post.updateOne(
      { _id: postId },
      { $pull: { likes: userId } },
    );

    return {
      liked: false,
      likesCount: Math.max(post.likes.length - 1, 0),
    };
  }

  await Post.updateOne(
    { _id: postId },
    { $addToSet: { likes: userId } },
  );

  return {
    liked: true,
    likesCount: post.likes.length + 1,
  };
};
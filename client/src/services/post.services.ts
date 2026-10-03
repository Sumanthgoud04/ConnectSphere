import api from "../api/axios";

export interface PostAuthor {
  _id: string;
  name: string;
  photo?: string;
  headline?: string;
}

export interface Post {
  _id: string;
  authorId: PostAuthor;
  content: string;
  imageUrl?: string;
  likes: string[];
  comments: string[];
  createdAt: string;
  updatedAt: string;
}

export const getFeed = async () => {
  const response = await api.get("/posts/feed");
  return response.data;
};

export const createPost = async (data: {
  content: string;
  imageUrl?: string;
}) => {
  const response = await api.post("/posts", data);
  return response.data;
};

export const getMyPosts = async () => {
  const response = await api.get("/posts/my-posts");
  return response.data;
};

export const deletePost = async (postId: string) => {
  const response = await api.delete(`/posts/${postId}`);
  return response.data;
};

export const likePost = async (postId: string) => {
  const response = await api.post(`/posts/${postId}/like`);
  return response.data;
};

export const createComment = async (
  postId: string,
  data: {
    content: string;
    parentCommentId?: string;
  },
) => {
  const response = await api.post(
    `/posts/${postId}/comments`,
    data,
  );
  return response.data;
};

export const getComments = async (postId: string) => {
  const response = await api.get(`/posts/${postId}/comments`);
  return response.data;
};

export const deleteComment = async (commentId: string) => {
  const response = await api.delete(
    `/posts/comments/${commentId}`,
  );
  return response.data;
};

export const likeComment = async (commentId: string) => {
  const response = await api.post(
    `/posts/comments/${commentId}/like`,
  );
  return response.data;
};
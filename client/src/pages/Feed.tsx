import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

import type { RootState } from "../store";

import {
  deletePost,
  getFeed,
  getPostLikes,
  likePost,
  type Post,
  type PostLikeUser,
} from "../services/post.services";

import PostComments from "../components/PostComments";

function Feed() {
  const user = useSelector((state: RootState) => state.auth.user);
  const navigate = useNavigate();

  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Likes modal state
  const [likesModalPost, setLikesModalPost] =
    useState<Post | null>(null);

  const [likedUsers, setLikedUsers] =
    useState<PostLikeUser[]>([]);

  const [isLikesLoading, setIsLikesLoading] =
    useState(false);

  const loadFeed = async () => {
    try {
      setError("");

      const response = await getFeed();

      if (response.success) {
        setPosts(response.data.posts);
      }
    } catch {
      setError("Failed to load your feed.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFeed();
  }, []);

  const handleLike = async (postId: string) => {
    try {
      setError("");

      const response = await likePost(postId);

      if (!response.success || !user?.id) {
        return;
      }

      setPosts((currentPosts) =>
        currentPosts.map((post) => {
          if (post._id !== postId) {
            return post;
          }

          return {
            ...post,
            likes: response.data.liked
              ? [...post.likes, user.id]
              : post.likes.filter(
                  (id) => id !== user.id,
                ),
          };
        }),
      );
    } catch {
      setError("Failed to update like.");
    }
  };

  const handleShowLikes = async (post: Post) => {
    try {
      setError("");
      setLikedUsers([]);
      setLikesModalPost(post);
      setIsLikesLoading(true);

      const response = await getPostLikes(post._id);

      if (response.success) {
        setLikedUsers(response.data.likes);
      }
    } catch {
      setError("Failed to load likes.");
      setLikesModalPost(null);
    } finally {
      setIsLikesLoading(false);
    }
  };

  const closeLikesModal = () => {
    setLikesModalPost(null);
    setLikedUsers([]);
  };

  const handleLikedUserClick = (userId: string) => {
    if (!userId) {
      return;
    }

    closeLikesModal();

    navigate(`/app/profile/${userId}`);
  };

  const handleAuthorClick = (userId: string) => {
    if (!userId) {
      return;
    }

    navigate(`/app/profile/${userId}`);
  };

  const handleDelete = async (postId: string) => {
    try {
      setError("");

      await deletePost(postId);

      setPosts((currentPosts) =>
        currentPosts.filter(
          (post) => post._id !== postId,
        ),
      );
    } catch {
      setError("Failed to delete post.");
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold text-text">
            Your Feed
          </h1>

          <p className="mt-1 text-sm text-muted">
            See what's happening in your professional network.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        {/* Loading */}
        {isLoading ? (
          <div className="rounded-2xl border border-border bg-surface p-10 text-center shadow-sm">
            <p className="text-sm text-muted">
              Loading your feed...
            </p>
          </div>
        ) : posts.length === 0 ? (
          /* Empty state */
          <div className="rounded-2xl border border-border bg-surface p-10 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-background text-xl">
              📝
            </div>

            <h2 className="mt-4 font-semibold text-text">
              Your feed is empty
            </h2>

            <p className="mx-auto mt-1 max-w-md text-sm text-muted">
              Posts from you and other members will appear here.
            </p>
          </div>
        ) : (
          /* Posts */
          posts.map((post) => {
            const isLiked =
              !!user?.id && post.likes.includes(user.id);

            return (
              <article
                key={post._id}
                className="rounded-2xl border border-border bg-surface p-5 shadow-sm transition hover:shadow-md"
              >
                {/* Author */}
                <div className="flex items-start justify-between">
                  <div className="flex gap-3">
                    {/* Author avatar */}
                    <button
                      type="button"
                      onClick={() =>
                        handleAuthorClick(post.authorId._id)
                      }
                      aria-label={`View ${post.authorId.name}'s profile`}
                      className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary font-semibold text-white transition hover:opacity-90"
                    >
                      {post.authorId.photo ? (
                        <img
                          src={post.authorId.photo}
                          alt={post.authorId.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        post.authorId.name
                          .charAt(0)
                          .toUpperCase()
                      )}
                    </button>

                    {/* Author information */}
                    <button
                      type="button"
                      onClick={() =>
                        handleAuthorClick(post.authorId._id)
                      }
                      className="text-left"
                    >
                      <h2 className="font-semibold text-text transition hover:text-primary">
                        {post.authorId.name}
                      </h2>

                      {post.authorId.headline && (
                        <p className="mt-0.5 text-xs text-muted">
                          {post.authorId.headline}
                        </p>
                      )}

                      <p className="mt-1 text-xs text-muted">
                        {new Date(
                          post.createdAt,
                        ).toLocaleString()}
                      </p>
                    </button>
                  </div>

                  {/* Delete own post */}
                  {post.authorId._id === user?.id && (
                    <button
                      type="button"
                      onClick={() =>
                        handleDelete(post._id)
                      }
                      className="rounded-lg px-2 py-1 text-sm font-medium text-danger transition hover:bg-red-50"
                    >
                      Delete
                    </button>
                  )}
                </div>

                {/* Post content */}
                <p className="mt-5 whitespace-pre-wrap text-sm leading-6 text-text">
                  {post.content}
                </p>

                {/* Post image */}
                {post.imageUrl && (
                  <img
                    src={post.imageUrl}
                    alt="Post"
                    className="mt-4 max-h-[500px] w-full rounded-xl object-cover"
                  />
                )}

                {/* Actions */}
                <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                  <button
                    type="button"
                    onClick={() =>
                      handleLike(post._id)
                    }
                    className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                      isLiked
                        ? "bg-blue-50 text-primary"
                        : "text-muted hover:bg-background hover:text-primary"
                    }`}
                  >
                    👍 Like
                  </button>

                  {/* Likes count */}
                  {post.likes.length > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        handleShowLikes(post)
                      }
                      className="rounded-lg px-3 py-2 text-sm text-muted transition hover:bg-background hover:text-primary"
                    >
                      {post.likes.length}{" "}
                      {post.likes.length === 1
                        ? "like"
                        : "likes"}
                    </button>
                  )}
                </div>

                {/* Comments */}
                <PostComments
                  postId={post._id}
                  commentCount={post.comments.length}
                />
              </article>
            );
          })
        )}
      </div>

      {/* Likes modal */}
      {likesModalPost && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={closeLikesModal}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-surface shadow-xl"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-text">
                  Likes
                </h2>

                <p className="mt-0.5 text-xs text-muted">
                  {likesModalPost.likes.length}{" "}
                  {likesModalPost.likes.length === 1
                    ? "person likes"
                    : "people like"}{" "}
                  this post
                </p>
              </div>

              <button
                type="button"
                onClick={closeLikesModal}
                className="flex h-8 w-8 items-center justify-center rounded-full text-lg text-muted transition hover:bg-background hover:text-text"
                aria-label="Close likes"
              >
                ×
              </button>
            </div>

            {/* Modal body */}
            <div className="max-h-[60vh] overflow-y-auto p-3">
              {isLikesLoading ? (
                <div className="px-4 py-10 text-center">
                  <p className="text-sm text-muted">
                    Loading likes...
                  </p>
                </div>
              ) : likedUsers.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-background">
                    👍
                  </div>

                  <p className="mt-3 text-sm font-medium text-text">
                    No likes yet
                  </p>

                  <p className="mt-1 text-xs text-muted">
                    Be the first person to like this post.
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {likedUsers.map((likedUser) => (
                    <button
                      type="button"
                      key={likedUser._id}
                      onClick={() =>
                        handleLikedUserClick(
                          likedUser._id,
                        )
                      }
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-background"
                    >
                      {/* User avatar */}
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary font-semibold text-white">
                        {likedUser.photo ? (
                          <img
                            src={likedUser.photo}
                            alt={likedUser.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          likedUser.name
                            .charAt(0)
                            .toUpperCase()
                        )}
                      </div>

                      {/* User information */}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-text">
                          {likedUser.name}
                        </p>

                        {likedUser.headline && (
                          <p className="truncate text-xs text-muted">
                            {likedUser.headline}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="border-t border-border px-5 py-3">
              <button
                type="button"
                onClick={closeLikesModal}
                className="w-full rounded-lg border border-border px-4 py-2 text-sm font-medium text-text transition hover:bg-background"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Feed;
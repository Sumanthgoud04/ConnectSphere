import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../store";

import {
  deletePost,
  getFeed,
  likePost,
  type Post,
} from "../services/post.services";

import PostComments from "../components/PostComments";

function Feed() {
  const user = useSelector((state: RootState) => state.auth.user);

  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

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
      const response = await likePost(postId);

      if (!response.success || !user?.id) return;

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

  const handleDelete = async (postId: string) => {
    try {
      setError("");

      await deletePost(postId);

      setPosts((currentPosts) =>
        currentPosts.filter((post) => post._id !== postId),
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
          posts.map((post) => (
            <article
              key={post._id}
              className="rounded-2xl border border-border bg-surface p-5 shadow-sm transition hover:shadow-md"
            >
              {/* Author */}
              <div className="flex items-start justify-between">
                <div className="flex gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary font-semibold text-white">
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
                  </div>

                  <div>
                    <h2 className="font-semibold text-text">
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
                  </div>
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
              <div className="mt-5 flex items-center gap-2 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => handleLike(post._id)}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                    user?.id &&
                    post.likes.includes(user.id)
                      ? "bg-blue-50 text-primary"
                      : "text-muted hover:bg-background hover:text-primary"
                  }`}
                >
                  👍 Like
                  <span className="ml-1">
                    {post.likes.length}
                  </span>
                </button>
              </div>

              {/* Comments */}
              <PostComments
                postId={post._id}
                commentCount={post.comments.length}
              />
            </article>
          ))
        )}
      </div>
    </div>
  );
}

export default Feed;
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../store";
import {
  createComment,
  deleteComment,
  getComments,
  likeComment,
} from "../services/post.services";

interface CommentAuthor {
  _id?: string;
  name?: string;
  photo?: string;
  headline?: string;
}

interface Comment {
  _id: string;
  postId: string;

  // The backend normally returns a populated author object.
  // This also safely handles an author ID or missing author.
  authorId?: CommentAuthor | string | null;

  parentCommentId?: string | null;
  content: string;
  likes: string[];
  createdAt: string;
  updatedAt: string;
}

interface PostCommentsProps {
  postId: string;
  commentCount: number;
}

function PostComments({
  postId,
  commentCount,
}: PostCommentsProps) {
  const user = useSelector(
    (state: RootState) => state.auth.user,
  );

  const [comments, setComments] = useState<Comment[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [content, setContent] = useState("");
  const [error, setError] = useState("");

  const [replyingTo, setReplyingTo] = useState<string | null>(
    null,
  );

  // Safely normalize author data.
  const getCommentAuthor = (comment: Comment) => {
    if (
      !comment.authorId ||
      typeof comment.authorId === "string"
    ) {
      return {
        id: "",
        name: "Unknown User",
        photo: "",
        headline: "",
      };
    }

    return {
      id: comment.authorId._id ?? "",
      name: comment.authorId.name ?? "Unknown User",
      photo: comment.authorId.photo ?? "",
      headline: comment.authorId.headline ?? "",
    };
  };

  // Load comments from the backend.
  const loadComments = async () => {
    try {
      setError("");
      setIsLoading(true);

      const response = await getComments(postId);

      if (response.success) {
        setComments(response.data.comments ?? []);
      }
    } catch {
      setError("Failed to load comments.");
    } finally {
      setIsLoading(false);
    }
  };

  // Load comments whenever the comments section is opened.
  useEffect(() => {
    if (isOpen) {
      loadComments();
    }
  }, [isOpen, postId]);

  // Add a comment or reply.
  const handleSubmit = async () => {
    const trimmedContent = content.trim();

    if (!trimmedContent) {
      setError("Comment cannot be empty.");
      return;
    }

    try {
      setError("");
      setIsSubmitting(true);

      const response = await createComment(postId, {
        content: trimmedContent,
        ...(replyingTo
          ? { parentCommentId: replyingTo }
          : {}),
      });

      if (response.success) {
        // Clear the input immediately.
        setContent("");
        setReplyingTo(null);

        // Reload comments from the backend.
        // This ensures the new comment/reply has
        // the correct populated author information.
        await loadComments();
      }
    } catch {
      setError("Failed to add comment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete own comment.
  const handleDelete = async (commentId: string) => {
    try {
      setError("");

      await deleteComment(commentId);

      // Reload from backend so the UI updates immediately.
      await loadComments();
    } catch {
      setError("Failed to delete comment.");
    }
  };

  // Like/unlike a comment.
  const handleLike = async (commentId: string) => {
    if (!user?.id) {
      return;
    }

    try {
      setError("");

      const response = await likeComment(commentId);

      if (!response.success) {
        return;
      }

      // Reload from backend so the updated like
      // count is immediately reflected.
      await loadComments();
    } catch {
      setError("Failed to update comment like.");
    }
  };

  // Start replying to a comment.
  const handleReply = (commentId: string) => {
    setReplyingTo(commentId);

    setTimeout(() => {
      document
        .getElementById(`comment-input-${postId}`)
        ?.focus();
    }, 0);
  };

  // Cancel reply mode.
  const cancelReply = () => {
    setReplyingTo(null);
  };

  // Get top-level comments.
  const topLevelComments = comments.filter(
    (comment) => !comment.parentCommentId,
  );

  // Get replies for a specific comment.
  const replies = (commentId: string) =>
    comments.filter(
      (comment) => comment.parentCommentId === commentId,
    );

  // Render comments recursively.
  const renderComment = (
    comment: Comment,
    isReply = false,
  ) => {
    const author = getCommentAuthor(comment);

    const isLiked = user?.id
      ? comment.likes.includes(user.id)
      : false;

    const isOwnComment =
      Boolean(user?.id) &&
      Boolean(author.id) &&
      user?.id === author.id;

    const firstLetter =
      author.name.charAt(0).toUpperCase();

    return (
      <div
        key={comment._id}
        className={isReply ? "ml-10 mt-3" : "mt-4"}
      >
        <div className="flex gap-3">
          {/* Avatar */}
          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-sm font-bold text-white">
            {author.photo ? (
              <img
                src={author.photo}
                alt={`${author.name}'s profile`}
                className="h-full w-full object-cover"
              />
            ) : (
              firstLetter
            )}
          </div>

          {/* Comment content */}
          <div className="min-w-0 flex-1">
            <div className="rounded-xl bg-background px-4 py-3">
              {/* Author row */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-text">
                    {author.name}
                  </p>

                  {author.headline && (
                    <p className="mt-0.5 text-xs text-muted">
                      {author.headline}
                    </p>
                  )}
                </div>

                {/* Delete own comment */}
                {isOwnComment && (
                  <button
                    type="button"
                    onClick={() =>
                      handleDelete(comment._id)
                    }
                    className="text-xs font-semibold text-danger hover:underline"
                  >
                    Delete
                  </button>
                )}
              </div>

              {/* Comment text */}
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-text">
                {comment.content}
              </p>
            </div>

            {/* Comment actions */}
            <div className="mt-2 flex items-center gap-4 px-2">
              {/* Like */}
              <button
                type="button"
                onClick={() =>
                  handleLike(comment._id)
                }
                className={`text-xs font-semibold ${
                  isLiked
                    ? "text-primary"
                    : "text-muted hover:text-primary"
                }`}
              >
                {isLiked ? "Liked" : "Like"} (
                {comment.likes.length})
              </button>

              {/* Reply */}
              <button
                type="button"
                onClick={() =>
                  handleReply(comment._id)
                }
                className="text-xs font-semibold text-muted hover:text-primary"
              >
                Reply
              </button>

              {/* Date */}
              <span className="text-xs text-muted">
                {new Date(
                  comment.createdAt,
                ).toLocaleString()}
              </span>
            </div>

            {/* Replies */}
            {replies(comment._id).map((reply) =>
              renderComment(reply, true),
            )}
          </div>
        </div>
      </div>
    );
  };

  // Show the latest count when comments are open.
  const displayedCommentCount = isOpen
    ? comments.length
    : commentCount;

  return (
    <div className="mt-4 border-t border-border pt-4">
      {/* Comments toggle */}
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="text-sm font-semibold text-muted hover:text-primary"
      >
        {isOpen ? "Hide Comments" : "Comments"} (
        {displayedCommentCount})
      </button>

      {isOpen && (
        <div className="mt-4">
          {/* Error */}
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-danger">
              {error}
            </div>
          )}

          {/* Comment input */}
          <div className="rounded-xl border border-border bg-surface p-4">
            {/* Reply indicator */}
            {replyingTo && (
              <div className="mb-3 flex items-center justify-between rounded-lg bg-background px-3 py-2">
                <p className="text-xs text-muted">
                  Replying to{" "}
                  <span className="font-semibold text-text">
                    {(() => {
                      const parentComment = comments.find(
                        (comment) =>
                          comment._id === replyingTo,
                      );

                      if (!parentComment) {
                        return "comment";
                      }

                      return getCommentAuthor(parentComment)
                        .name;
                    })()}
                  </span>
                </p>

                <button
                  type="button"
                  onClick={cancelReply}
                  className="text-xs font-semibold text-danger hover:underline"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Text input */}
            <textarea
              id={`comment-input-${postId}`}
              value={content}
              onChange={(event) =>
                setContent(event.target.value)
              }
              onKeyDown={(event) => {
                // Enter submits.
                // Shift + Enter creates a new line.
                if (
                  event.key === "Enter" &&
                  !event.shiftKey
                ) {
                  event.preventDefault();

                  if (!isSubmitting) {
                    handleSubmit();
                  }
                }
              }}
              rows={3}
              maxLength={1000}
              placeholder={
                replyingTo
                  ? "Write a reply..."
                  : "Write a comment..."
              }
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-text outline-none placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20"
            />

            {/* Input footer */}
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-muted">
                {content.length}/1000
              </span>

              <button
                type="button"
                disabled={
                  isSubmitting || !content.trim()
                }
                onClick={handleSubmit}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting
                  ? "Posting..."
                  : replyingTo
                    ? "Reply"
                    : "Comment"}
              </button>
            </div>
          </div>

          {/* Comments list */}
          {isLoading ? (
            <div className="py-6 text-center text-sm text-muted">
              Loading comments...
            </div>
          ) : comments.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted">
              No comments yet. Be the first to comment.
            </div>
          ) : (
            <div className="mt-4">
              {topLevelComments.map((comment) =>
                renderComment(comment),
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default PostComments;
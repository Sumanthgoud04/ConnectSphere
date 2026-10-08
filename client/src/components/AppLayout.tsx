import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { useDispatch, useSelector } from "react-redux";

import type {
  AppDispatch,
  RootState,
} from "../store";

import { clearUser } from "../store/slices/authSlices";

import { logout } from "../services/auth.services";

import {
  createPost,
  searchPosts,
} from "../services/post.services";

import { searchUsers } from "../services/user.services";

import socket from "../socket";

import { getConversationSummaries } from "../services/message.services";

interface SearchUserResult {
  _id: string;
  name: string;
  photo?: string;
  headline?: string;
}

interface SearchPostAuthor {
  _id: string;
  name: string;
  photo?: string;
  headline?: string;
}

interface SearchPostResult {
  _id: string;
  content: string;
  imageUrl?: string;
  authorId: SearchPostAuthor;
  createdAt: string;
}

interface SearchResults {
  users: SearchUserResult[];
  posts: SearchPostResult[];
}

function AppLayout() {
  const dispatch = useDispatch<AppDispatch>();

  const navigate = useNavigate();

  const location = useLocation();

  const user = useSelector(
    (state: RootState) => state.auth.user,
  );

  const [unreadMessageCount, setUnreadMessageCount] =
    useState(0);

  // ---------------------------------------------------------
  // Profile menu
  // ---------------------------------------------------------

  const [isProfileMenuOpen, setIsProfileMenuOpen] =
    useState(false);

  // ---------------------------------------------------------
  // Mobile navigation
  // ---------------------------------------------------------

  const [isMobileMenuOpen, setIsMobileMenuOpen] =
    useState(false);

  // ---------------------------------------------------------
  // Navbar search
  // ---------------------------------------------------------

  const [searchQuery, setSearchQuery] = useState("");

  const [searchResults, setSearchResults] =
    useState<SearchResults>({
      users: [],
      posts: [],
    });

  const [isSearchOpen, setIsSearchOpen] =
    useState(false);

  const [isSearchLoading, setIsSearchLoading] =
    useState(false);

  const [searchError, setSearchError] =
    useState("");

  // ---------------------------------------------------------
  // Create post modal
  // ---------------------------------------------------------

  const [isCreatePostOpen, setIsCreatePostOpen] =
    useState(false);

  const [postContent, setPostContent] =
    useState("");

  const [postImageUrl, setPostImageUrl] =
    useState("");

  const [postImage, setPostImage] =
    useState<File | undefined>(undefined);

  const [postImagePreview, setPostImagePreview] =
    useState("");

  const [isPostSubmitting, setIsPostSubmitting] =
    useState(false);

  const [postError, setPostError] =
    useState("");

  // ---------------------------------------------------------
  // Refs
  // ---------------------------------------------------------

  const menuRef =
    useRef<HTMLDivElement>(null);

  const mobileMenuRef =
    useRef<HTMLDivElement>(null);

  const desktopSearchRef =
    useRef<HTMLDivElement>(null);

  const mobileSearchRef =
    useRef<HTMLDivElement>(null);

  const fileInputRef =
    useRef<HTMLInputElement>(null);

  // ---------------------------------------------------------
  // Close menus when clicking outside
  // ---------------------------------------------------------

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setIsProfileMenuOpen(false);
      }

      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(target)
      ) {
        setIsMobileMenuOpen(false);
      }

      const clickedInsideDesktopSearch =
        desktopSearchRef.current?.contains(target);

      const clickedInsideMobileSearch =
        mobileSearchRef.current?.contains(target);

      if (
        !clickedInsideDesktopSearch &&
        !clickedInsideMobileSearch
      ) {
        setIsSearchOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleClickOutside,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside,
      );
    };
  }, []);

  // ---------------------------------------------------------
  // Navbar search
  // ---------------------------------------------------------

  useEffect(() => {
    const trimmedQuery = searchQuery.trim();

    if (trimmedQuery.length < 2) {
      setSearchResults({
        users: [],
        posts: [],
      });

      setSearchError("");

      setIsSearchLoading(false);

      return;
    }

    let isCancelled = false;

    const searchTimer = window.setTimeout(
      async () => {
        try {
          setIsSearchLoading(true);

          setSearchError("");

          setIsSearchOpen(true);

          const [
            userResponse,
            postResponse,
          ] = await Promise.all([
            searchUsers(trimmedQuery),
            searchPosts(trimmedQuery),
          ]);

          if (isCancelled) {
            return;
          }

          setSearchResults({
            users:
              userResponse?.data?.users ?? [],
            posts:
              postResponse?.data?.posts ?? [],
          });
        } catch {
          if (!isCancelled) {
            setSearchError(
              "Unable to search right now.",
            );
          }
        } finally {
          if (!isCancelled) {
            setIsSearchLoading(false);
          }
        }
      },
      350,
    );

    return () => {
      isCancelled = true;

      window.clearTimeout(searchTimer);
    };
  }, [searchQuery]);

  // ---------------------------------------------------------
  // Global messaging notification/socket handling
  // ---------------------------------------------------------

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    let isCancelled = false;

    const loadUnreadMessageCount = async () => {
      try {
        const response =
          await getConversationSummaries();

        if (
          isCancelled ||
          !response.success
        ) {
          return;
        }

        const totalUnread =
          response.data.conversations.reduce(
            (
              total: number,
              conversation: {
                unreadCount: number;
              },
            ) =>
              total + conversation.unreadCount,
            0,
          );

        if (!isCancelled) {
          setUnreadMessageCount(totalUnread);
        }
      } catch {
        // Messaging should not break the navbar.
      }
    };

    loadUnreadMessageCount();

    if (!socket.connected) {
      socket.connect();
    }

    const handleNewMessage = () => {
      loadUnreadMessageCount();
    };

    const handleConversationRead = () => {
      loadUnreadMessageCount();
    };

    socket.on(
      "message:new",
      handleNewMessage,
    );

    socket.on(
      "conversation:read",
      handleConversationRead,
    );

    return () => {
      isCancelled = true;

      socket.off(
        "message:new",
        handleNewMessage,
      );

      socket.off(
        "conversation:read",
        handleConversationRead,
      );

      socket.disconnect();
    };
  }, [user?.id]);

  // ---------------------------------------------------------
  // Search helpers
  // ---------------------------------------------------------

  const handleSearchFocus = () => {
    if (searchQuery.trim().length >= 2) {
      setIsSearchOpen(true);
    }
  };

  const handleSearchSubmit = (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const trimmedQuery =
      searchQuery.trim();

    if (!trimmedQuery) {
      return;
    }

    setIsSearchOpen(true);
  };

  const handleUserResultClick = (
    userId: string,
  ) => {
    setSearchQuery("");

    setIsSearchOpen(false);

    setIsMobileMenuOpen(false);

    navigate(`/app/profile/${userId}`);
  };

  const handlePostResultClick = () => {
    setSearchQuery("");

    setIsSearchOpen(false);

    setIsMobileMenuOpen(false);

    navigate("/app/feed");
  };

  // ---------------------------------------------------------
  // Create post helpers
  // ---------------------------------------------------------

  const handleOpenCreatePost = () => {
    setPostError("");

    setIsCreatePostOpen(true);
  };

  const handlePostImageChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ];

    if (!allowedTypes.includes(file.type)) {
      setPostError(
        "Only JPEG, PNG, WebP, and GIF images are allowed.",
      );

      event.target.value = "";

      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setPostError(
        "Image size must be 5 MB or less.",
      );

      event.target.value = "";

      return;
    }

    setPostError("");

    setPostImage(file);

    const previewUrl =
      URL.createObjectURL(file);

    setPostImagePreview(previewUrl);
  };

  const handleRemovePostImage = () => {
    setPostImage(undefined);

    setPostImagePreview("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCloseCreatePost = () => {
    if (isPostSubmitting) {
      return;
    }

    setIsCreatePostOpen(false);

    setPostContent("");

    setPostImageUrl("");

    setPostImage(undefined);

    setPostImagePreview("");

    setPostError("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCreatePost = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const trimmedContent =
      postContent.trim();

    if (!trimmedContent) {
      setPostError(
        "Please write something before posting.",
      );

      return;
    }

    if (trimmedContent.length > 5000) {
      setPostError(
        "Post content must be 5000 characters or less.",
      );

      return;
    }

    try {
      setIsPostSubmitting(true);

      setPostError("");

      await createPost({
        content: trimmedContent,
        imageUrl: postImageUrl,
        image: postImage,
      });

      handleCloseCreatePost();

      /*
       * If the user is already on Feed, reload it so the
       * newly-created chronological post appears immediately.
       *
       * Otherwise navigate to Feed.
       */
      if (location.pathname === "/app/feed") {
        window.location.reload();
      } else {
        navigate("/app/feed");
      }
    } catch {
      setPostError(
        "Failed to create post. Please try again.",
      );
    } finally {
      setIsPostSubmitting(false);
    }
  };

  // ---------------------------------------------------------
  // Logout
  // ---------------------------------------------------------

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      /*
       * Clear local authentication even if the API request
       * fails.
       */
    } finally {
      dispatch(clearUser());

      setIsProfileMenuOpen(false);

      navigate("/login", {
        replace: true,
      });
    }
  };

  // ---------------------------------------------------------
  // Navigation styling
  // ---------------------------------------------------------

  const navLinkClass = ({
    isActive,
  }: {
    isActive: boolean;
  }) =>
    `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
      isActive
        ? "bg-white/10 text-white"
        : "text-slate-300 hover:bg-white/5 hover:text-white"
    }`;

  // ---------------------------------------------------------
  // Search result UI
  // ---------------------------------------------------------

  const renderSearchResults = () => {
    if (!isSearchOpen) {
      return null;
    }

    const hasUsers =
      searchResults.users.length > 0;

    const hasPosts =
      searchResults.posts.length > 0;

    const hasResults =
      hasUsers || hasPosts;

    return (
      <div className="absolute left-0 right-0 top-12 z-[60] overflow-hidden rounded-xl border border-border bg-surface shadow-2xl">
        {isSearchLoading && (
          <div className="px-4 py-5 text-center text-sm text-muted">
            Searching...
          </div>
        )}

        {!isSearchLoading && searchError && (
          <div className="px-4 py-5 text-center text-sm text-danger">
            {searchError}
          </div>
        )}

        {!isSearchLoading &&
          !searchError &&
          searchQuery.trim().length >= 2 &&
          !hasResults && (
            <div className="px-4 py-6 text-center">
              <p className="text-sm font-medium text-text">
                No results found
              </p>

              <p className="mt-1 text-xs text-muted">
                Try a different name or keyword.
              </p>
            </div>
          )}

        {!isSearchLoading &&
          !searchError &&
          hasResults && (
            <div className="max-h-[70vh] overflow-y-auto">
              {/* People */}

              {hasUsers && (
                <div>
                  <div className="border-b border-border bg-background px-4 py-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                      People
                    </p>
                  </div>

                  <div className="p-1.5">
                    {searchResults.users.map(
                      (person) => (
                        <button
                          key={person._id}
                          type="button"
                          onClick={() =>
                            handleUserResultClick(
                              person._id,
                            )
                          }
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-background"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary font-semibold text-white">
                            {person.photo ? (
                              <img
                                src={person.photo}
                                alt={`${person.name}'s profile`}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              person.name
                                .charAt(0)
                                .toUpperCase()
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-text">
                              {person.name}
                            </p>

                            {person.headline && (
                              <p className="mt-0.5 truncate text-xs text-muted">
                                {person.headline}
                              </p>
                            )}
                          </div>
                        </button>
                      ),
                    )}
                  </div>
                </div>
              )}

              {/* Posts */}

              {hasPosts && (
                <div
                  className={
                    hasUsers
                      ? "border-t border-border"
                      : ""
                  }
                >
                  <div className="border-b border-border bg-background px-4 py-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                      Posts
                    </p>
                  </div>

                  <div className="p-1.5">
                    {searchResults.posts.map(
                      (post) => (
                        <button
                          key={post._id}
                          type="button"
                          onClick={
                            handlePostResultClick
                          }
                          className="flex w-full gap-3 rounded-lg px-3 py-3 text-left transition hover:bg-background"
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary font-semibold text-sm text-white">
                            {post.authorId?.photo ? (
                              <img
                                src={
                                  post.authorId.photo
                                }
                                alt={`${post.authorId.name}'s profile`}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              post.authorId?.name
                                ?.charAt(0)
                                .toUpperCase() ??
                              "U"
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-text">
                              {post.authorId?.name ??
                                "Unknown user"}
                            </p>

                            <p className="mt-1 line-clamp-2 text-sm text-muted">
                              {post.content}
                            </p>
                          </div>
                        </button>
                      ),
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

        {!isSearchLoading &&
          searchQuery.trim().length < 2 && (
            <div className="px-4 py-4 text-center text-xs text-muted">
              Type at least 2 characters to search
            </div>
          )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* =====================================================
          NAVBAR
      ====================================================== */}

      <header className="sticky top-0 z-50 border-b border-white/10 bg-navy">
        <nav className="mx-auto flex min-h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          {/* =================================================
              LOGO
          ================================================== */}

          <Link
            to="/app/feed"
            className="shrink-0 text-xl font-bold tracking-tight text-white"
          >
            Connect
            <span className="text-primary">
              Sphere
            </span>
          </Link>

          {/* =================================================
              DESKTOP SEARCH
          ================================================== */}

          <div
            ref={desktopSearchRef}
            className="relative hidden min-w-0 flex-1 md:block md:max-w-md lg:max-w-lg"
          >
            <form
              onSubmit={handleSearchSubmit}
            >
              <div className="relative">
                <svg
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M9 3a6 6 0 100 12A6 6 0 009 3zM2 9a7 7 0 1112.04 4.95l3.505 3.505a.75.75 0 11-1.06 1.06l-3.505-3.505A7 7 0 012 9z"
                    clipRule="evenodd"
                  />
                </svg>

                <input
                  type="search"
                  value={searchQuery}
                  onFocus={handleSearchFocus}
                  onChange={(event) =>
                    setSearchQuery(
                      event.target.value,
                    )
                  }
                  placeholder="Search people or posts..."
                  className="h-10 w-full rounded-lg border border-white/10 bg-white/10 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-primary focus:bg-white/15"
                />
              </div>
            </form>

            {renderSearchResults()}
          </div>

          {/* =================================================
              DESKTOP NAVIGATION
          ================================================== */}

          <div className="ml-auto hidden items-center gap-1 md:flex">
            <NavLink
              to="/app/feed"
              className={navLinkClass}
              title="Home"
            >
              <span className="text-base">
                ⌂
              </span>

              <span className="hidden lg:inline">
                Home
              </span>
            </NavLink>

            <NavLink
              to="/app/network"
              className={navLinkClass}
              title="My Network"
            >
              <span className="text-base">
                ♧
              </span>

              <span className="hidden lg:inline">
                Network
              </span>
            </NavLink>

            {/* Create Post */}

            <button
              type="button"
              onClick={handleOpenCreatePost}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
              title="Create Post"
            >
              <span className="text-base">
                +
              </span>

              <span className="hidden lg:inline">
                Create
              </span>
            </button>

            <NavLink
              to="/app/messages"
              className={navLinkClass}
              title="Messages"
            >
              <span className="relative text-base">
                ✉

                {unreadMessageCount > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-bold leading-none text-white">
                    {unreadMessageCount > 99
                      ? "99+"
                      : unreadMessageCount}
                  </span>
                )}
              </span>

              <span className="hidden lg:inline">
                Messages
              </span>
            </NavLink>

            {/* Notifications */}

            <button
              type="button"
              title="Notifications"
              className="relative flex items-center justify-center rounded-lg px-3 py-2 text-slate-300 transition hover:bg-white/5 hover:text-white"
            >
              <span className="text-lg">
                ♧
              </span>

              {/*
                Notification badge will be connected
                to the notification system later.
              */}

              <span className="absolute right-1.5 top-1.5 hidden h-2 w-2 rounded-full bg-danger" />
            </button>
          </div>

          {/* =================================================
              PROFILE MENU
          ================================================== */}

          {user && (
            <div
              ref={menuRef}
              className="relative shrink-0"
            >
              <button
                type="button"
                onClick={() =>
                  setIsProfileMenuOpen(
                    (current) => !current,
                  )
                }
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition hover:bg-white/5"
                aria-expanded={
                  isProfileMenuOpen
                }
                aria-haspopup="menu"
              >
                {/* User avatar */}

                <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-primary font-semibold text-white">
                  {user.photo ? (
                    <img
                      src={user.photo}
                      alt={`${user.name}'s profile`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    user.name
                      .charAt(0)
                      .toUpperCase()
                  )}
                </div>

                {/* User name */}

                <span className="hidden max-w-28 truncate text-sm font-medium text-white lg:block">
                  {user.name}
                </span>

                {/* Arrow */}

                <svg
                  className={`hidden h-4 w-4 text-slate-400 transition lg:block ${
                    isProfileMenuOpen
                      ? "rotate-180"
                      : ""
                  }`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.51a.75.75 0 01-1.08 1.04l-4.25-4.51a.75.75 0 01.02-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              {/* Profile dropdown */}

              {isProfileMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-64 overflow-hidden rounded-xl border border-border bg-surface shadow-xl"
                  role="menu"
                >
                  {/* Profile information */}

                  <div className="border-b border-border px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary font-semibold text-white">
                        {user.photo ? (
                          <img
                            src={user.photo}
                            alt={`${user.name}'s profile`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          user.name
                            .charAt(0)
                            .toUpperCase()
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate font-semibold text-text">
                          {user.name}
                        </p>

                        {user.headline && (
                          <p className="truncate text-xs text-muted">
                            {user.headline}
                          </p>
                        )}
                      </div>
                    </div>

                    <p className="mt-2 truncate text-xs text-muted">
                      {user.email}
                    </p>
                  </div>

                  {/* Menu items */}

                  <div className="p-1.5">
                    <Link
                      to="/app/profile"
                      onClick={() =>
                        setIsProfileMenuOpen(
                          false,
                        )
                      }
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-text transition hover:bg-background"
                      role="menuitem"
                    >
                      <span className="text-base">
                        👤
                      </span>

                      View Profile
                    </Link>

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-danger transition hover:bg-red-50"
                      role="menuitem"
                    >
                      <span className="text-base">
                        ↪
                      </span>

                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =================================================
              MOBILE MENU BUTTON
          ================================================== */}

          <button
            type="button"
            onClick={() =>
              setIsMobileMenuOpen(
                (current) => !current,
              )
            }
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 transition hover:bg-white/5 hover:text-white md:hidden"
            aria-label="Toggle navigation menu"
            aria-expanded={isMobileMenuOpen}
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              {isMobileMenuOpen ? (
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              ) : (
                <path
                  fillRule="evenodd"
                  d="M3 5.5A.5.5 0 013.5 5h13a.5.5 0 010 1h-13a.5.5 0 01-.5-.5zM3 9.5a.5.5 0 01.5-.5h13a.5.5 0 010 1h-13a.5.5 0 01-.5-.5zM3 13.5A.5.5 0 013.5 13h13a.5.5 0 010 1h-13a.5.5 0 01-.5-.5z"
                  clipRule="evenodd"
                />
              )}
            </svg>
          </button>
        </nav>

        {/* ===================================================
            MOBILE NAVIGATION
        ==================================================== */}

        {isMobileMenuOpen && (
          <div
            ref={mobileMenuRef}
            className="border-t border-white/10 px-4 pb-4 pt-3 md:hidden"
          >
            {/* Mobile search */}

            <div
              ref={mobileSearchRef}
              className="relative mb-3"
            >
              <form
                onSubmit={handleSearchSubmit}
              >
                <div className="relative">
                  <svg
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M9 3a6 6 0 100 12A6 6 0 009 3zM2 9a7 7 0 1112.04 4.95l3.505 3.505a.75.75 0 11-1.06 1.06l-3.505-3.505A7 7 0 012 9z"
                      clipRule="evenodd"
                    />
                  </svg>

                  <input
                    type="search"
                    value={searchQuery}
                    onFocus={handleSearchFocus}
                    onChange={(event) =>
                      setSearchQuery(
                        event.target.value,
                      )
                    }
                    placeholder="Search people or posts..."
                    className="h-10 w-full rounded-lg border border-white/10 bg-white/10 pl-10 pr-4 text-sm text-white outline-none placeholder:text-slate-400 focus:border-primary"
                  />
                </div>
              </form>

              {renderSearchResults()}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <NavLink
                to="/app/feed"
                onClick={() =>
                  setIsMobileMenuOpen(
                    false,
                  )
                }
                className={navLinkClass}
              >
                <span>⌂</span>
                Home
              </NavLink>

              <NavLink
                to="/app/network"
                onClick={() =>
                  setIsMobileMenuOpen(
                    false,
                  )
                }
                className={navLinkClass}
              >
                <span>♧</span>
                Network
              </NavLink>

              {/* Mobile Create Post */}

              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleOpenCreatePost();
                }}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
              >
                <span>+</span>
                Create Post
              </button>

              <NavLink
                to="/app/messages"
                onClick={() =>
                  setIsMobileMenuOpen(
                    false,
                  )
                }
                className={navLinkClass}
              >
                <span className="relative">
                  ✉

                  {unreadMessageCount > 0 && (
                    <span className="absolute -right-3 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-bold leading-none text-white">
                      {unreadMessageCount > 99
                        ? "99+"
                        : unreadMessageCount}
                    </span>
                  )}
                </span>

                Messages
              </NavLink>

              <button
                type="button"
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
              >
                <span>♧</span>
                Notifications
              </button>
            </div>
          </div>
        )}
      </header>

      {/* =====================================================
          PAGE CONTENT
      ====================================================== */}

      <main>
        <Outlet />
      </main>

      {/* =====================================================
          CREATE POST MODAL
      ====================================================== */}

      {isCreatePostOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4 py-6"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              handleCloseCreatePost();
            }
          }}
        >
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-surface shadow-2xl">
            {/* Modal header */}

            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-text">
                  Create a post
                </h2>

                <p className="mt-0.5 text-xs text-muted">
                  Share something with your network.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCloseCreatePost}
                disabled={isPostSubmitting}
                className="flex h-9 w-9 items-center justify-center rounded-full text-xl text-muted transition hover:bg-background hover:text-text disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Close create post"
              >
                ×
              </button>
            </div>

            {/* Modal body */}

            <form
              onSubmit={handleCreatePost}
              className="p-5"
            >
              {/* Author */}

              {user && (
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-primary font-semibold text-white">
                    {user.photo ? (
                      <img
                        src={user.photo}
                        alt={`${user.name}'s profile`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      user.name
                        .charAt(0)
                        .toUpperCase()
                    )}
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-text">
                      {user.name}
                    </p>

                    {user.headline && (
                      <p className="text-xs text-muted">
                        {user.headline}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Content */}

              <textarea
                value={postContent}
                onChange={(event) =>
                  setPostContent(
                    event.target.value,
                  )
                }
                placeholder="What do you want to talk about?"
                maxLength={5000}
                rows={6}
                disabled={isPostSubmitting}
                className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm text-text outline-none transition placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
              />

              <div className="mt-1 text-right text-xs text-muted">
                {postContent.length}/5000
              </div>

              {/* Image URL */}

              <div className="mt-4">
                <label
                  htmlFor="post-image-url"
                  className="mb-1.5 block text-sm font-medium text-text"
                >
                  Image URL
                  <span className="ml-1 font-normal text-muted">
                    (optional)
                  </span>
                </label>

                <input
                  id="post-image-url"
                  type="url"
                  value={postImageUrl}
                  onChange={(event) =>
                    setPostImageUrl(
                      event.target.value,
                    )
                  }
                  placeholder="https://example.com/image.jpg"
                  disabled={isPostSubmitting}
                  className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text outline-none transition placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>

              {/* File upload */}

              <div className="mt-4">
                <label
                  htmlFor="post-image-file"
                  className="mb-1.5 block text-sm font-medium text-text"
                >
                  Upload image
                  <span className="ml-1 font-normal text-muted">
                    (optional, max 5 MB)
                  </span>
                </label>

                <input
                  ref={fileInputRef}
                  id="post-image-file"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handlePostImageChange}
                  disabled={isPostSubmitting}
                  className="block w-full cursor-pointer rounded-lg border border-border bg-surface text-sm text-muted file:mr-4 file:border-0 file:bg-background file:px-4 file:py-2.5 file:text-sm file:font-medium file:text-text hover:file:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>

              {/* Image preview */}

              {postImagePreview && (
                <div className="relative mt-4 overflow-hidden rounded-xl border border-border">
                  <img
                    src={postImagePreview}
                    alt="Selected post image preview"
                    className="max-h-72 w-full object-contain bg-background"
                  />

                  <button
                    type="button"
                    onClick={handleRemovePostImage}
                    disabled={isPostSubmitting}
                    className="absolute right-3 top-3 rounded-lg bg-black/70 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Remove image
                  </button>
                </div>
              )}

              {/* Error */}

              {postError && (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-danger">
                  {postError}
                </div>
              )}

              {/* Footer */}

              <div className="mt-5 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseCreatePost}
                  disabled={isPostSubmitting}
                  className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-text transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    isPostSubmitting ||
                    !postContent.trim()
                  }
                  className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isPostSubmitting
                    ? "Posting..."
                    : "Post"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AppLayout;
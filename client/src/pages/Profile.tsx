import {
  useEffect,
  useRef,
  useState,
} from "react";
import {
  useDispatch,
  useSelector,
} from "react-redux";
import { useNavigate } from "react-router-dom";

import type { RootState } from "../store";
import { setUser } from "../store/slices/authSlices";

import {
  updateMyProfile,
  type Experience,
} from "../services/user.services";

import {
  deletePost,
  getMyPosts,
  getPostLikes,
  likePost,
  type Post,
  type PostLikeUser,
} from "../services/post.services";

import { getConnectionCount } from "../services/connection.services";

import PostComments from "../components/PostComments";

const emptyExperience = (): Experience => ({
  company: "",
  title: "",
  startDate: "",
  endDate: "",
  description: "",
});

function Profile() {
  const user = useSelector(
    (state: RootState) => state.auth.user,
  );

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const postsSectionRef = useRef<HTMLElement | null>(null);

  // Posts
  const [posts, setPosts] = useState<Post[]>([]);
  const [isPostsLoading, setIsPostsLoading] =
    useState(true);
  const [postsError, setPostsError] = useState("");

  // Connections
  const [connectionCount, setConnectionCount] =
    useState(0);
  const [
    isConnectionCountLoading,
    setIsConnectionCountLoading,
  ] = useState(true);

  // Likes modal
  const [likesModalPost, setLikesModalPost] =
    useState<Post | null>(null);
  const [likedUsers, setLikedUsers] =
    useState<PostLikeUser[]>([]);
  const [isLikesLoading, setIsLikesLoading] =
    useState(false);

  // Edit profile
  const [isEditProfileOpen, setIsEditProfileOpen] =
    useState(false);
  const [isSavingProfile, setIsSavingProfile] =
    useState(false);
  const [profileError, setProfileError] =
    useState("");
  const [profileSuccess, setProfileSuccess] =
    useState("");

  const [profileForm, setProfileForm] = useState({
    name: "",
    photo: "",
    headline: "",
    about: "",
    experience: [] as Experience[],
    education: [] as string[],
    skills: [] as string[],
  });

  // Experience editor
  const [experienceForm, setExperienceForm] =
    useState<Experience>(emptyExperience());

  const [
    editingExperienceIndex,
    setEditingExperienceIndex,
  ] = useState<number | null>(null);

  // Education / skills inputs
  const [educationInput, setEducationInput] =
    useState("");
  const [skillInput, setSkillInput] =
    useState("");

  // ---------------------------------------------------------
  // Load profile posts
  // ---------------------------------------------------------

  useEffect(() => {
    const loadMyPosts = async () => {
      try {
        setPostsError("");

        const response = await getMyPosts();

        if (response.success) {
          setPosts(response.data.posts);
        }
      } catch {
        setPostsError(
          "Failed to load your posts.",
        );
      } finally {
        setIsPostsLoading(false);
      }
    };

    loadMyPosts();
  }, []);

  // ---------------------------------------------------------
  // Load connection count
  // ---------------------------------------------------------

  useEffect(() => {
    const loadConnectionCount = async () => {
      try {
        const response =
          await getConnectionCount();

        if (response.success) {
          setConnectionCount(
            response.data.count,
          );
        }
      } catch {
        setConnectionCount(0);
      } finally {
        setIsConnectionCountLoading(false);
      }
    };

    loadConnectionCount();
  }, []);

  if (!user) {
    return null;
  }

  // ---------------------------------------------------------
  // Profile navigation
  // ---------------------------------------------------------

  const handleConnectionsClick = () => {
    navigate("/app/network");
  };

  const handlePostsClick = () => {
    postsSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  // ---------------------------------------------------------
  // Likes
  // ---------------------------------------------------------

  const handleShowLikes = async (
    post: Post,
  ) => {
    try {
      setLikedUsers([]);
      setLikesModalPost(post);
      setIsLikesLoading(true);

      const response = await getPostLikes(
        post._id,
      );

      if (response.success) {
        setLikedUsers(
          response.data.likes ?? [],
        );
      }
    } catch {
      setLikesModalPost(null);
      setPostsError(
        "Failed to load post likes.",
      );
    } finally {
      setIsLikesLoading(false);
    }
  };

  const closeLikesModal = () => {
    setLikesModalPost(null);
    setLikedUsers([]);
  };

  const handleLikedUserClick = (
    userId: string,
  ) => {
    if (!userId) {
      return;
    }

    closeLikesModal();
    navigate(`/app/profile/${userId}`);
  };

  // ---------------------------------------------------------
  // Post actions
  // ---------------------------------------------------------

  const handleLike = async (
    postId: string,
  ) => {
    try {
      setPostsError("");

      const response =
        await likePost(postId);

      if (!response.success || !user.id) {
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
      setPostsError(
        "Failed to update like.",
      );
    }
  };

  const handleDelete = async (
    postId: string,
  ) => {
    try {
      setPostsError("");

      await deletePost(postId);

      setPosts((currentPosts) =>
        currentPosts.filter(
          (post) => post._id !== postId,
        ),
      );
    } catch {
      setPostsError(
        "Failed to delete post.",
      );
    }
  };

  // ---------------------------------------------------------
  // Edit profile
  // ---------------------------------------------------------

  const openEditProfile = () => {
    setProfileError("");
    setProfileSuccess("");

    setProfileForm({
      name: user.name,
      photo: user.photo || "",
      headline: user.headline || "",
      about: user.about || "",

      experience: user.experience.map(
        (item) => ({
          company: item.company,
          title: item.title,
          startDate: item.startDate,
          endDate: item.endDate || "",
          description:
            item.description || "",
        }),
      ),

      education: [...user.education],
      skills: [...user.skills],
    });

    setExperienceForm(
      emptyExperience(),
    );
    setEditingExperienceIndex(null);
    setEducationInput("");
    setSkillInput("");

    setIsEditProfileOpen(true);
  };

  // ---------------------------------------------------------
  // Experience
  // ---------------------------------------------------------

  const handleAddExperience = () => {
    if (
      !experienceForm.company.trim() ||
      !experienceForm.title.trim() ||
      !experienceForm.startDate.trim()
    ) {
      setProfileError(
        "Company, job title and start date are required.",
      );
      return;
    }

    const newExperience: Experience = {
      company:
        experienceForm.company.trim(),
      title:
        experienceForm.title.trim(),
      startDate:
        experienceForm.startDate.trim(),
      endDate:
        experienceForm.endDate?.trim() ||
        undefined,
      description:
        experienceForm.description?.trim() ||
        undefined,
    };

    setProfileForm((current) => ({
      ...current,
      experience: [
        ...current.experience,
        newExperience,
      ],
    }));

    setExperienceForm(
      emptyExperience(),
    );
    setProfileError("");
  };

  const handleEditExperience = (
    index: number,
  ) => {
    const experience =
      profileForm.experience[index];

    if (!experience) {
      return;
    }

    setExperienceForm({
      company: experience.company,
      title: experience.title,
      startDate: experience.startDate,
      endDate:
        experience.endDate || "",
      description:
        experience.description || "",
    });

    setEditingExperienceIndex(index);
    setProfileError("");
  };

  const handleSaveExperienceEdit = () => {
    if (
      editingExperienceIndex === null ||
      !experienceForm.company.trim() ||
      !experienceForm.title.trim() ||
      !experienceForm.startDate.trim()
    ) {
      setProfileError(
        "Company, job title and start date are required.",
      );
      return;
    }

    const updatedExperience: Experience =
      {
        company:
          experienceForm.company.trim(),
        title:
          experienceForm.title.trim(),
        startDate:
          experienceForm.startDate.trim(),
        endDate:
          experienceForm.endDate?.trim() ||
          undefined,
        description:
          experienceForm.description?.trim() ||
          undefined,
      };

    setProfileForm((current) => ({
      ...current,
      experience:
        current.experience.map(
          (experience, index) =>
            index ===
            editingExperienceIndex
              ? updatedExperience
              : experience,
        ),
    }));

    setExperienceForm(
      emptyExperience(),
    );
    setEditingExperienceIndex(null);
    setProfileError("");
  };

  const handleRemoveExperience = (
    index: number,
  ) => {
    setProfileForm((current) => ({
      ...current,
      experience:
        current.experience.filter(
          (_, experienceIndex) =>
            experienceIndex !== index,
        ),
    }));

    if (
      editingExperienceIndex === index
    ) {
      setEditingExperienceIndex(null);
      setExperienceForm(
        emptyExperience(),
      );
    }
  };

  const cancelExperienceEdit = () => {
    setEditingExperienceIndex(null);
    setExperienceForm(
      emptyExperience(),
    );
    setProfileError("");
  };

  // ---------------------------------------------------------
  // Education
  // ---------------------------------------------------------

  const handleAddEducation = () => {
    const value =
      educationInput.trim();

    if (!value) {
      return;
    }

    if (
      profileForm.education.includes(
        value,
      )
    ) {
      setProfileError(
        "This education entry already exists.",
      );
      return;
    }

    setProfileForm((current) => ({
      ...current,
      education: [
        ...current.education,
        value,
      ],
    }));

    setEducationInput("");
    setProfileError("");
  };

  const handleRemoveEducation = (
    index: number,
  ) => {
    setProfileForm((current) => ({
      ...current,
      education:
        current.education.filter(
          (_, educationIndex) =>
            educationIndex !== index,
        ),
    }));
  };

  // ---------------------------------------------------------
  // Skills
  // ---------------------------------------------------------

  const handleAddSkill = () => {
    const value = skillInput.trim();

    if (!value) {
      return;
    }

    const alreadyExists =
      profileForm.skills.some(
        (skill) =>
          skill.toLowerCase() ===
          value.toLowerCase(),
      );

    if (alreadyExists) {
      setProfileError(
        "This skill already exists.",
      );
      return;
    }

    setProfileForm((current) => ({
      ...current,
      skills: [
        ...current.skills,
        value,
      ],
    }));

    setSkillInput("");
    setProfileError("");
  };

  const handleRemoveSkill = (
    index: number,
  ) => {
    setProfileForm((current) => ({
      ...current,
      skills: current.skills.filter(
        (_, skillIndex) =>
          skillIndex !== index,
      ),
    }));
  };

  // ---------------------------------------------------------
  // Save profile
  // ---------------------------------------------------------

  const handleSaveProfile = async () => {
    const trimmedName =
      profileForm.name.trim();

    if (!trimmedName) {
      setProfileError(
        "Name is required.",
      );
      return;
    }

    if (trimmedName.length < 2) {
      setProfileError(
        "Name must be at least 2 characters.",
      );
      return;
    }

    try {
      setIsSavingProfile(true);
      setProfileError("");
      setProfileSuccess("");

      const response =
        await updateMyProfile({
          name: trimmedName,
          photo:
            profileForm.photo.trim(),
          headline:
            profileForm.headline.trim(),
          about:
            profileForm.about.trim(),
          experience:
            profileForm.experience,
          education:
            profileForm.education,
          skills: profileForm.skills,
        });

      if (!response.success) {
        setProfileError(
          response.message ||
            "Failed to update profile.",
        );
        return;
      }

      const updatedUser = {
        id: response.data.user._id,
        name: response.data.user.name,
        email:
          response.data.user.email,
        photo:
          response.data.user.photo ||
          "",
        headline:
          response.data.user.headline ||
          "",
        about:
          response.data.user.about ||
          "",
        experience:
          response.data.user.experience ||
          [],
        education:
          response.data.user.education ||
          [],
        skills:
          response.data.user.skills ||
          [],
      };

      dispatch(setUser(updatedUser));

      setProfileSuccess(
        "Profile updated successfully.",
      );

      setIsEditProfileOpen(false);
    } catch {
      setProfileError(
        "Failed to update profile.",
      );
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-6">

        {/* Profile header */}
        <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
          <div className="h-32 bg-navy" />

          <div className="px-6 pb-6">
            <div className="-mt-12 flex items-end justify-between gap-4">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-primary text-3xl font-bold text-white">
                {user.photo ? (
                  <img
                    src={user.photo}
                    alt={`${user.name}'s profile`}
                    className="h-full w-full object-cover object-center"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  user.name
                    .charAt(0)
                    .toUpperCase()
                )}
              </div>

              <button
                type="button"
                onClick={openEditProfile}
                className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text transition hover:bg-background"
              >
                Edit Profile
              </button>
            </div>

            <div className="mt-4">
              <h1 className="text-2xl font-bold text-text">
                {user.name}
              </h1>

              {user.headline ? (
                <p className="mt-1 text-muted">
                  {user.headline}
                </p>
              ) : (
                <p className="mt-1 text-sm text-muted">
                  Add a professional headline
                </p>
              )}

              <p className="mt-3 text-sm text-muted">
                {user.email}
              </p>

              {/* Profile stats */}
              <div className="mt-5 flex items-center gap-8">
                <button
                  type="button"
                  onClick={
                    handleConnectionsClick
                  }
                  className="group text-left"
                >
                  <p className="text-lg font-bold text-text group-hover:text-primary">
                    {isConnectionCountLoading
                      ? "..."
                      : connectionCount}
                  </p>

                  <p className="text-xs text-muted group-hover:text-primary">
                    Connections
                  </p>
                </button>

                <button
                  type="button"
                  onClick={
                    handlePostsClick
                  }
                  className="group text-left"
                >
                  <p className="text-lg font-bold text-text group-hover:text-primary">
                    {posts.length}
                  </p>

                  <p className="text-xs text-muted group-hover:text-primary">
                    Posts
                  </p>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Profile success */}
        {profileSuccess && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {profileSuccess}
          </div>
        )}

        {/* About */}
        <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="text-lg font-bold text-text">
            About
          </h2>

          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted">
            {user.about ||
              "Add information about yourself and your professional background."}
          </p>
        </section>

        {/* Experience */}
        <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="text-lg font-bold text-text">
            Experience
          </h2>

          {user.experience.length === 0 ? (
            <p className="mt-4 text-sm text-muted">
              No experience added yet.
            </p>
          ) : (
            <div className="mt-4 space-y-5">
              {user.experience.map(
                (item, index) => (
                  <div
                    key={`${item.company}-${index}`}
                    className="border-b border-border pb-5 last:border-0 last:pb-0"
                  >
                    <h3 className="font-semibold text-text">
                      {item.title}
                    </h3>

                    <p className="mt-1 text-sm text-muted">
                      {item.company}
                    </p>

                    <p className="mt-1 text-xs text-muted">
                      {item.startDate} -{" "}
                      {item.endDate ||
                        "Present"}
                    </p>

                    {item.description && (
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted">
                        {item.description}
                      </p>
                    )}
                  </div>
                ),
              )}
            </div>
          )}
        </section>

        {/* Education */}
        <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="text-lg font-bold text-text">
            Education
          </h2>

          {user.education.length === 0 ? (
            <p className="mt-4 text-sm text-muted">
              No education added yet.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {user.education.map(
                (education, index) => (
                  <li
                    key={`${education}-${index}`}
                    className="rounded-lg bg-background px-4 py-3 text-sm text-text"
                  >
                    {education}
                  </li>
                ),
              )}
            </ul>
          )}
        </section>

        {/* Skills */}
        <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="text-lg font-bold text-text">
            Skills
          </h2>

          {user.skills.length === 0 ? (
            <p className="mt-4 text-sm text-muted">
              No skills added yet.
            </p>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2">
              {user.skills.map(
                (skill, index) => (
                  <span
                    key={`${skill}-${index}`}
                    className="rounded-full border border-border bg-background px-3 py-1.5 text-sm font-medium text-text"
                  >
                    {skill}
                  </span>
                ),
              )}
            </div>
          )}
        </section>

        {/* My Posts */}
        <section
          ref={postsSectionRef}
          className="scroll-mt-24 rounded-2xl border border-border bg-surface shadow-sm"
        >
          <div className="border-b border-border px-6 py-5">
            <h2 className="text-lg font-bold text-text">
              My Posts
            </h2>

            <p className="mt-1 text-sm text-muted">
              Your posts, newest first.
            </p>
          </div>

          {postsError && (
            <div className="mx-6 mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-danger">
              {postsError}
            </div>
          )}

          {isPostsLoading ? (
            <div className="px-6 py-10 text-center text-sm text-muted">
              Loading your posts...
            </div>
          ) : posts.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-background text-xl">
                ✍️
              </div>

              <h3 className="mt-4 font-semibold text-text">
                No posts yet
              </h3>

              <p className="mt-1 text-sm text-muted">
                Use Create Post in the navbar to
                share your first update.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {posts.map((post) => {
                const isLiked =
                  !!user.id &&
                  post.likes.includes(
                    user.id,
                  );

                return (
                  <article
                    key={post._id}
                    className="px-6 py-6"
                  >
                    {/* Post author */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary font-bold text-white">
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
                          <p className="font-semibold text-text">
                            {user.name}
                          </p>

                          <p className="text-xs text-muted">
                            {user.headline ||
                              "ConnectSphere member"}
                          </p>

                          <p className="mt-0.5 text-xs text-muted">
                            {new Date(
                              post.createdAt,
                            ).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          handleDelete(
                            post._id,
                          )
                        }
                        className="rounded-lg px-2 py-1 text-sm font-medium text-danger transition hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>

                    {/* Content */}
                    <p className="mt-5 whitespace-pre-wrap text-sm leading-6 text-text">
                      {post.content}
                    </p>

                    {/* Image */}
                    {post.imageUrl && (
                      <img
                        src={post.imageUrl}
                        alt="Post"
                        className="mt-4 max-h-[500px] w-full rounded-xl border border-border object-cover"
                      />
                    )}

                    {/* Actions */}
                    <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                      <button
                        type="button"
                        onClick={() =>
                          handleLike(
                            post._id,
                          )
                        }
                        className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                          isLiked
                            ? "bg-blue-50 text-primary"
                            : "text-muted hover:bg-background hover:text-primary"
                        }`}
                      >
                        {isLiked
                          ? "Liked"
                          : "Like"}
                      </button>

                      {post.likes.length >
                        0 && (
                        <button
                          type="button"
                          onClick={() =>
                            handleShowLikes(
                              post,
                            )
                          }
                          className="rounded-lg px-3 py-2 text-sm text-muted transition hover:bg-background hover:text-primary"
                        >
                          {post.likes.length}{" "}
                          {post.likes.length ===
                          1
                            ? "like"
                            : "likes"}
                        </button>
                      )}
                    </div>

                    {/* Comments */}
                    <PostComments
                      postId={post._id}
                      commentCount={
                        post.comments
                          .length
                      }
                    />
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Likes modal */}
      {likesModalPost && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={
            closeLikesModal
          }
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-surface shadow-xl"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-text">
                  Likes
                </h2>

                <p className="mt-0.5 text-xs text-muted">
                  {likesModalPost.likes.length}{" "}
                  {likesModalPost.likes.length ===
                  1
                    ? "person likes"
                    : "people like"}{" "}
                  this post
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closeLikesModal
                }
                className="flex h-8 w-8 items-center justify-center rounded-full text-lg text-muted transition hover:bg-background hover:text-text"
                aria-label="Close likes"
              >
                ×
              </button>
            </div>

            {/* Body */}
            <div className="max-h-[60vh] overflow-y-auto p-3">
              {isLikesLoading ? (
                <div className="px-4 py-10 text-center">
                  <p className="text-sm text-muted">
                    Loading likes...
                  </p>
                </div>
              ) : likedUsers.length ===
                0 ? (
                <div className="px-4 py-10 text-center">
                  <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-background">
                    👍
                  </div>

                  <p className="mt-3 text-sm font-medium text-text">
                    No likes yet
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {likedUsers.map(
                    (likedUser) => (
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
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary font-semibold text-white">
                          {likedUser.photo ? (
                            <img
                              src={
                                likedUser.photo
                              }
                              alt={
                                likedUser.name
                              }
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            likedUser.name
                              .charAt(0)
                              .toUpperCase()
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-text">
                            {likedUser.name}
                          </p>

                          {likedUser.headline && (
                            <p className="truncate text-xs text-muted">
                              {
                                likedUser.headline
                              }
                            </p>
                          )}
                        </div>
                      </button>
                    ),
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-border px-5 py-3">
              <button
                type="button"
                onClick={
                  closeLikesModal
                }
                className="w-full rounded-lg border border-border px-4 py-2 text-sm font-medium text-text transition hover:bg-background"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit profile modal */}
      {isEditProfileOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6"
          onClick={() => {
            if (!isSavingProfile) {
              setIsEditProfileOpen(
                false,
              );
            }
          }}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-xl"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            {/* Modal header */}
            <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-text">
                  Edit Profile
                </h2>

                <p className="mt-1 text-xs text-muted">
                  Update your professional
                  information.
                </p>
              </div>

              <button
                type="button"
                disabled={
                  isSavingProfile
                }
                onClick={() =>
                  setIsEditProfileOpen(
                    false,
                  )
                }
                className="text-xl text-muted hover:text-text disabled:opacity-50"
              >
                ×
              </button>
            </div>

            {/* Scrollable body */}
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              <div className="space-y-8">

                {/* Basic information */}
                <section>
                  <h3 className="font-semibold text-text">
                    Basic Information
                  </h3>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-text">
                        Name
                      </label>

                      <input
                        value={
                          profileForm.name
                        }
                        onChange={(event) =>
                          setProfileForm(
                            (current) => ({
                              ...current,
                              name: event
                                .target
                                .value,
                            }),
                          )
                        }
                        maxLength={50}
                        className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-text">
                        Photo URL
                      </label>

                      <input
                        type="url"
                        value={
                          profileForm.photo
                        }
                        onChange={(event) =>
                          setProfileForm(
                            (current) => ({
                              ...current,
                              photo: event
                                .target
                                .value,
                            }),
                          )
                        }
                        placeholder="https://example.com/photo.jpg"
                        className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="text-sm font-medium text-text">
                      Professional Headline
                    </label>

                    <input
                      value={
                        profileForm.headline
                      }
                      onChange={(event) =>
                        setProfileForm(
                          (current) => ({
                            ...current,
                            headline:
                              event.target
                                .value,
                          }),
                        )
                      }
                      maxLength={120}
                      placeholder="Full-stack developer | React | Node.js"
                      className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />

                    <p className="mt-1 text-xs text-muted">
                      {
                        profileForm
                          .headline.length
                      }
                      /120
                    </p>
                  </div>

                  <div className="mt-4">
                    <label className="text-sm font-medium text-text">
                      About
                    </label>

                    <textarea
                      value={
                        profileForm.about
                      }
                      onChange={(event) =>
                        setProfileForm(
                          (current) => ({
                            ...current,
                            about:
                              event.target
                                .value,
                          }),
                        )
                      }
                      maxLength={2000}
                      rows={5}
                      placeholder="Tell people about your professional background..."
                      className="mt-2 w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />

                    <p className="mt-1 text-xs text-muted">
                      {
                        profileForm.about
                          .length
                      }
                      /2000
                    </p>
                  </div>
                </section>

                {/* Experience */}
                <section>
                  <h3 className="font-semibold text-text">
                    Experience
                  </h3>

                  <p className="mt-1 text-xs text-muted">
                    Add your previous
                    professional
                    experience.
                  </p>

                  {profileForm.experience
                    .length > 0 && (
                    <div className="mt-4 space-y-3">
                      {profileForm.experience.map(
                        (
                          experience,
                          index,
                        ) => (
                          <div
                            key={`${experience.company}-${index}`}
                            className="rounded-xl border border-border bg-background p-4"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="font-semibold text-text">
                                  {
                                    experience.title
                                  }
                                </p>

                                <p className="mt-1 text-sm text-muted">
                                  {
                                    experience.company
                                  }
                                </p>

                                <p className="mt-1 text-xs text-muted">
                                  {
                                    experience.startDate
                                  }{" "}
                                  -{" "}
                                  {experience.endDate ||
                                    "Present"}
                                </p>

                                {experience.description && (
                                  <p className="mt-2 whitespace-pre-wrap text-sm leading-5 text-muted">
                                    {
                                      experience.description
                                    }
                                  </p>
                                )}
                              </div>

                              <div className="flex shrink-0 gap-3">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleEditExperience(
                                      index,
                                    )
                                  }
                                  className="text-sm font-semibold text-primary hover:underline"
                                >
                                  Edit
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    handleRemoveExperience(
                                      index,
                                    )
                                  }
                                  className="text-sm font-semibold text-danger hover:underline"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  )}

                  {/* Experience form */}
                  <div className="mt-4 rounded-xl border border-border p-4">
                    <p className="text-sm font-semibold text-text">
                      {editingExperienceIndex ===
                      null
                        ? "Add Experience"
                        : "Edit Experience"}
                    </p>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <input
                        value={
                          experienceForm.title
                        }
                        onChange={(event) =>
                          setExperienceForm(
                            (current) => ({
                              ...current,
                              title:
                                event.target
                                  .value,
                            }),
                          )
                        }
                        placeholder="Job title"
                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-text outline-none focus:border-primary"
                      />

                      <input
                        value={
                          experienceForm.company
                        }
                        onChange={(event) =>
                          setExperienceForm(
                            (current) => ({
                              ...current,
                              company:
                                event.target
                                  .value,
                            }),
                          )
                        }
                        placeholder="Company"
                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-text outline-none focus:border-primary"
                      />

                      <input
                        value={
                          experienceForm.startDate
                        }
                        onChange={(event) =>
                          setExperienceForm(
                            (current) => ({
                              ...current,
                              startDate:
                                event.target
                                  .value,
                            }),
                          )
                        }
                        placeholder="Start date e.g. Jan 2024"
                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-text outline-none focus:border-primary"
                      />

                      <input
                        value={
                          experienceForm.endDate
                        }
                        onChange={(event) =>
                          setExperienceForm(
                            (current) => ({
                              ...current,
                              endDate:
                                event.target
                                  .value,
                            }),
                          )
                        }
                        placeholder="End date or leave blank"
                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-text outline-none focus:border-primary"
                      />
                    </div>

                    <textarea
                      value={
                        experienceForm.description
                      }
                      onChange={(event) =>
                        setExperienceForm(
                          (current) => ({
                            ...current,
                            description:
                              event.target
                                .value,
                          }),
                        )
                      }
                      maxLength={1000}
                      rows={3}
                      placeholder="Describe your responsibilities..."
                      className="mt-4 w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-text outline-none focus:border-primary"
                    />

                    <div className="mt-3 flex gap-3">
                      <button
                        type="button"
                        onClick={
                          editingExperienceIndex ===
                          null
                            ? handleAddExperience
                            : handleSaveExperienceEdit
                        }
                        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                      >
                        {editingExperienceIndex ===
                        null
                          ? "Add Experience"
                          : "Save Experience"}
                      </button>

                      {editingExperienceIndex !==
                        null && (
                        <button
                          type="button"
                          onClick={
                            cancelExperienceEdit
                          }
                          className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text hover:bg-background"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </section>

                {/* Education */}
                <section>
                  <h3 className="font-semibold text-text">
                    Education
                  </h3>

                  <p className="mt-1 text-xs text-muted">
                    Example: B.Tech Computer
                    Science — ABC University
                    — 2022–2026
                  </p>

                  <div className="mt-4 flex gap-2">
                    <input
                      value={
                        educationInput
                      }
                      onChange={(event) =>
                        setEducationInput(
                          event.target
                            .value,
                        )
                      }
                      onKeyDown={(event) => {
                        if (
                          event.key ===
                          "Enter"
                        ) {
                          event.preventDefault();
                          handleAddEducation();
                        }
                      }}
                      placeholder="Add education"
                      className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-text outline-none focus:border-primary"
                    />

                    <button
                      type="button"
                      onClick={
                        handleAddEducation
                      }
                      className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                    >
                      Add
                    </button>
                  </div>

                  <div className="mt-3 space-y-2">
                    {profileForm.education.map(
                      (education, index) => (
                        <div
                          key={`${education}-${index}`}
                          className="flex items-center justify-between gap-3 rounded-lg bg-background px-4 py-3"
                        >
                          <span className="text-sm text-text">
                            {education}
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              handleRemoveEducation(
                                index,
                              )
                            }
                            className="shrink-0 text-sm font-semibold text-danger hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      ),
                    )}
                  </div>
                </section>

                {/* Skills */}
                <section>
                  <h3 className="font-semibold text-text">
                    Skills
                  </h3>

                  <div className="mt-4 flex gap-2">
                    <input
                      value={skillInput}
                      onChange={(event) =>
                        setSkillInput(
                          event.target
                            .value,
                        )
                      }
                      onKeyDown={(event) => {
                        if (
                          event.key ===
                          "Enter"
                        ) {
                          event.preventDefault();
                          handleAddSkill();
                        }
                      }}
                      placeholder="e.g. React"
                      className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-text outline-none focus:border-primary"
                    />

                    <button
                      type="button"
                      onClick={handleAddSkill}
                      className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                    >
                      Add
                    </button>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {profileForm.skills.map(
                      (skill, index) => (
                        <div
                          key={`${skill}-${index}`}
                          className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5"
                        >
                          <span className="text-sm font-medium text-text">
                            {skill}
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              handleRemoveSkill(
                                index,
                              )
                            }
                            className="text-sm font-bold text-muted hover:text-danger"
                            aria-label={`Remove ${skill}`}
                          >
                            ×
                          </button>
                        </div>
                      ),
                    )}
                  </div>
                </section>

                {/* Error */}
                {profileError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-danger">
                    {profileError}
                  </div>
                )}
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex shrink-0 justify-end gap-3 border-t border-border px-6 py-4">
              <button
                type="button"
                disabled={
                  isSavingProfile
                }
                onClick={() =>
                  setIsEditProfileOpen(
                    false,
                  )
                }
                className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text hover:bg-background disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={
                  isSavingProfile
                }
                onClick={
                  handleSaveProfile
                }
                className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSavingProfile
                  ? "Saving..."
                  : "Save Profile"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Profile;
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import type { RootState } from "../store";
import { setUser } from "../store/slices/authSlices";

import {
  updateMyProfile,
  type Experience,
} from "../services/user.services";

import {
  createPost,
  deletePost,
  getMyPosts,
  likePost,
  type Post,
} from "../services/post.services";

import { getConnectionCount } from "../services/connection.services";
import PostComments from "../components/PostComments";

function Profile() {
  const user = useSelector(
    (state: RootState) => state.auth.user,
  );

  const dispatch = useDispatch();

  // ---------------------------------------------------------
  // Posts state
  // ---------------------------------------------------------

  const [posts, setPosts] = useState<Post[]>([]);
  const [isPostsLoading, setIsPostsLoading] =
    useState(true);
  const [postsError, setPostsError] = useState("");

  const [connectionCount, setConnectionCount] = useState(0);
  const [isConnectionCountLoading, setIsConnectionCountLoading] =
   useState(true);

  // ---------------------------------------------------------
  // Create post state
  // ---------------------------------------------------------

  const [isCreateModalOpen, setIsCreateModalOpen] =
    useState(false);

  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [postError, setPostError] = useState("");

  // ---------------------------------------------------------
  // Edit profile state
  // ---------------------------------------------------------

  const [isEditProfileOpen, setIsEditProfileOpen] =
    useState(false);

  const [isSavingProfile, setIsSavingProfile] =
    useState(false);

  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] =
    useState("");

  /*
   * Local copy of the profile.
   *
   * We edit this object inside the modal first.
   * Redux is only updated after the backend confirms
   * that the profile was successfully saved.
   */
  const [profileForm, setProfileForm] = useState({
    name: "",
    photo: "",
    headline: "",
    about: "",
    experience: [] as Experience[],
    education: [] as string[],
    skills: [] as string[],
  });

  // ---------------------------------------------------------
  // Experience form state
  // ---------------------------------------------------------

  const [experienceForm, setExperienceForm] =
    useState<Experience>({
      company: "",
      title: "",
      startDate: "",
      endDate: "",
      description: "",
    });

  /*
   * null means we are adding a new experience.
   *
   * A number means we are editing the experience
   * at that array index.
   */
  const [editingExperienceIndex, setEditingExperienceIndex] =
    useState<number | null>(null);

  // ---------------------------------------------------------
  // Education and skills input state
  // ---------------------------------------------------------

  const [educationInput, setEducationInput] =
    useState("");

  const [skillInput, setSkillInput] = useState("");

  // ---------------------------------------------------------
  // Load current user's posts
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
        setPostsError("Failed to load your posts.");
      } finally {
        setIsPostsLoading(false);
      }
    };

    loadMyPosts();
  }, []);

        useEffect(() => {
        const loadConnectionCount = async () => {
          try {
            const response = await getConnectionCount();

            if (response.success) {
              setConnectionCount(response.data.count);
            }
          } catch {
            setConnectionCount(0);
          } finally {
            setIsConnectionCountLoading(false);
          }
        };

        loadConnectionCount();
      }, []);

  /*
   * Profile is protected, but keep this guard in case
   * the Redux user is temporarily unavailable.
   */
  if (!user) {
    return null;
  }

  // ---------------------------------------------------------
  // Create post
  // ---------------------------------------------------------

  const handleCreatePost = async () => {
    if (!content.trim()) {
      setPostError("Post content is required.");
      return;
    }

    try {
      setPostError("");
      setIsPosting(true);

      const response = await createPost({
        content: content.trim(),
        imageUrl: imageUrl.trim() || undefined,
      });

      if (response.success) {
        /*
         * New posts appear at the top because the feed
         * is chronological.
         */
        setPosts((currentPosts) => [
          response.data.post,
          ...currentPosts,
        ]);

        setContent("");
        setImageUrl("");
        setIsCreateModalOpen(false);
      }
    } catch {
      setPostError("Failed to create post.");
    } finally {
      setIsPosting(false);
    }
  };

  // ---------------------------------------------------------
  // Like / unlike post
  // ---------------------------------------------------------

  const handleLike = async (postId: string) => {
    try {
      const response = await likePost(postId);

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
      setPostsError("Failed to update like.");
    }
  };

  // ---------------------------------------------------------
  // Delete post
  // ---------------------------------------------------------

  const handleDelete = async (postId: string) => {
    try {
      await deletePost(postId);

      setPosts((currentPosts) =>
        currentPosts.filter(
          (post) => post._id !== postId,
        ),
      );
    } catch {
      setPostsError("Failed to delete post.");
    }
  };

  // =========================================================
  // PROFILE EDITING
  // =========================================================

  /*
   * Open the Edit Profile modal and copy the current Redux
   * user into local form state.
   */
  const openEditProfile = () => {
    setProfileError("");
    setProfileSuccess("");

    setProfileForm({
      name: user.name,
      photo: user.photo || "",
      headline: user.headline || "",
      about: user.about || "",

      /*
       * Create new objects so editing the modal does not
       * mutate the Redux user accidentally.
       */
      experience: user.experience.map((item) => ({
        company: item.company,
        title: item.title,
        startDate: item.startDate,
        endDate: item.endDate || "",
        description: item.description || "",
      })),

      education: [...user.education],

      skills: [...user.skills],
    });

    /*
     * Reset the smaller forms whenever the modal opens.
     */
    setExperienceForm({
      company: "",
      title: "",
      startDate: "",
      endDate: "",
      description: "",
    });

    setEditingExperienceIndex(null);
    setEducationInput("");
    setSkillInput("");

    setIsEditProfileOpen(true);
  };

  // ---------------------------------------------------------
  // Add experience
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
      company: experienceForm.company.trim(),
      title: experienceForm.title.trim(),
      startDate: experienceForm.startDate.trim(),
      endDate:
        experienceForm.endDate?.trim() || undefined,
      description:
        experienceForm.description?.trim() || undefined,
    };

    setProfileForm((current) => ({
      ...current,
      experience: [
        ...current.experience,
        newExperience,
      ],
    }));

    /*
     * Clear the experience form after adding.
     */
    setExperienceForm({
      company: "",
      title: "",
      startDate: "",
      endDate: "",
      description: "",
    });

    setProfileError("");
  };

  // ---------------------------------------------------------
  // Start editing experience
  // ---------------------------------------------------------

  const handleEditExperience = (index: number) => {
    const experience = profileForm.experience[index];

    if (!experience) {
      return;
    }

    setExperienceForm({
      company: experience.company,
      title: experience.title,
      startDate: experience.startDate,
      endDate: experience.endDate || "",
      description: experience.description || "",
    });

    setEditingExperienceIndex(index);
    setProfileError("");
  };

  // ---------------------------------------------------------
  // Save edited experience
  // ---------------------------------------------------------

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

    const updatedExperience: Experience = {
      company: experienceForm.company.trim(),
      title: experienceForm.title.trim(),
      startDate: experienceForm.startDate.trim(),
      endDate:
        experienceForm.endDate?.trim() || undefined,
      description:
        experienceForm.description?.trim() || undefined,
    };

    setProfileForm((current) => ({
      ...current,
      experience: current.experience.map(
        (experience, index) =>
          index === editingExperienceIndex
            ? updatedExperience
            : experience,
      ),
    }));

    /*
     * Return the form to "Add Experience" mode.
     */
    setExperienceForm({
      company: "",
      title: "",
      startDate: "",
      endDate: "",
      description: "",
    });

    setEditingExperienceIndex(null);
    setProfileError("");
  };

  // ---------------------------------------------------------
  // Remove experience
  // ---------------------------------------------------------

  const handleRemoveExperience = (index: number) => {
    setProfileForm((current) => ({
      ...current,
      experience: current.experience.filter(
        (_, experienceIndex) =>
          experienceIndex !== index,
      ),
    }));

    /*
     * If the user removes the experience currently being
     * edited, reset the edit form as well.
     */
    if (editingExperienceIndex === index) {
      setEditingExperienceIndex(null);

      setExperienceForm({
        company: "",
        title: "",
        startDate: "",
        endDate: "",
        description: "",
      });
    }
  };

  // ---------------------------------------------------------
  // Add education
  // ---------------------------------------------------------

  const handleAddEducation = () => {
    const value = educationInput.trim();

    if (!value) {
      return;
    }

    /*
     * Prevent duplicate education entries.
     */
    if (profileForm.education.includes(value)) {
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

  // ---------------------------------------------------------
  // Remove education
  // ---------------------------------------------------------

  const handleRemoveEducation = (index: number) => {
    setProfileForm((current) => ({
      ...current,
      education: current.education.filter(
        (_, educationIndex) =>
          educationIndex !== index,
      ),
    }));
  };

  // ---------------------------------------------------------
  // Add skill
  // ---------------------------------------------------------

  const handleAddSkill = () => {
    const value = skillInput.trim();

    if (!value) {
      return;
    }

    /*
     * Prevent duplicate skills, ignoring capitalization.
     *
     * React and react should not become two separate skills.
     */
    const alreadyExists = profileForm.skills.some(
      (skill) =>
        skill.toLowerCase() === value.toLowerCase(),
    );

    if (alreadyExists) {
      setProfileError("This skill already exists.");
      return;
    }

    setProfileForm((current) => ({
      ...current,
      skills: [...current.skills, value],
    }));

    setSkillInput("");
    setProfileError("");
  };

  // ---------------------------------------------------------
  // Remove skill
  // ---------------------------------------------------------

  const handleRemoveSkill = (index: number) => {
    setProfileForm((current) => ({
      ...current,
      skills: current.skills.filter(
        (_, skillIndex) =>
          skillIndex !== index,
      ),
    }));
  };

  // ---------------------------------------------------------
  // Save complete profile
  // ---------------------------------------------------------

  const handleSaveProfile = async () => {
    const trimmedName = profileForm.name.trim();

    if (!trimmedName) {
      setProfileError("Name is required.");
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

      const response = await updateMyProfile({
        name: trimmedName,
        photo: profileForm.photo.trim(),
        headline: profileForm.headline.trim(),
        about: profileForm.about.trim(),
        experience: profileForm.experience,
        education: profileForm.education,
        skills: profileForm.skills,
      });

      if (!response.success) {
        setProfileError(
          response.message ||
            "Failed to update profile.",
        );

        return;
      }

      /*
       * MongoDB returns _id.
       *
       * Our Redux User interface uses id.
       *
       * Convert the backend response into the existing
       * Redux User shape.
       */
      const updatedUser = {
        id: response.data.user._id,
        name: response.data.user.name,
        email: response.data.user.email,
        photo: response.data.user.photo || "",
        headline:
          response.data.user.headline || "",
        about: response.data.user.about || "",
        experience:
          response.data.user.experience || [],
        education:
          response.data.user.education || [],
        skills:
          response.data.user.skills || [],
      };

      /*
       * Update the global authenticated user.
       *
       * This means Profile, navbar and any other component
       * using state.auth.user immediately see the changes.
       */
      dispatch(setUser(updatedUser));

      setProfileSuccess(
        "Profile updated successfully.",
      );

      /*
       * Close the modal after successful save.
       */
      setIsEditProfileOpen(false);
    } catch (error) {
      /*
       * Try to show the backend's validation message when
       * Axios provides one.
       */
      let message: string | undefined;

      if (
        error &&
        typeof error === "object" &&
        "response" in error
      ) {
        const axiosError = error as {
          response?: {
            data?: {
              message?: string;
            };
          };
        };

        message =
          axiosError.response?.data?.message;
      }

      setProfileError(
        message || "Failed to update profile.",
      );
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-6">

        {/* =====================================================
            PROFILE HEADER
        ====================================================== */}

        <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
          {/* Cover */}
          <div className="h-32 bg-navy" />

          <div className="px-6 pb-6">
            <div className="-mt-12 flex items-end justify-between">

              {/* Profile avatar */}
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-primary text-3xl font-bold text-white">
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

              {/* Edit button */}
              <button
                type="button"
                onClick={openEditProfile}
                className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text hover:bg-background"
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
              <div className="mt-4 flex items-center gap-6">
                <div>
                  <p className="text-lg font-bold text-text">
                    {isConnectionCountLoading ? "..." : connectionCount}
                  </p>

                  <p className="text-xs text-muted">
                    Connections
                  </p>
                </div>

                <div>
                  <p className="text-lg font-bold text-text">
                    {posts.length}
                  </p>

                  <p className="text-xs text-muted">
                    Posts
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Profile success message */}
        {profileSuccess && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {profileSuccess}
          </div>
        )}

        {/* =====================================================
            ABOUT
        ====================================================== */}

        <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="text-lg font-bold text-text">
            About
          </h2>

          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted">
            {user.about ||
              "Add information about yourself and your professional background."}
          </p>
        </section>

        {/* =====================================================
            EXPERIENCE
        ====================================================== */}

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
                      {item.endDate || "Present"}
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

        {/* =====================================================
            EDUCATION
        ====================================================== */}

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

        {/* =====================================================
            SKILLS
        ====================================================== */}

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
              {user.skills.map((skill, index) => (
                <span
                  key={`${skill}-${index}`}
                  className="rounded-full border border-border bg-background px-3 py-1.5 text-sm font-medium text-text"
                >
                  {skill}
                </span>
              ))}
            </div>
          )}
        </section>

        {/* =====================================================
            MY POSTS
        ====================================================== */}

        <section className="rounded-2xl border border-border bg-surface shadow-sm">

          {/* Section header */}
          <div className="flex items-center justify-between border-b border-border px-6 py-5">
            <div>
              <h2 className="text-lg font-bold text-text">
                My Posts
              </h2>

              <p className="mt-1 text-sm text-muted">
                Posts you've shared on ConnectSphere.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setPostError("");
                setIsCreateModalOpen(true);
              }}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
            >
              + Create Post
            </button>
          </div>

          {/* Posts error */}
          {postsError && (
            <div className="mx-6 mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-danger">
              {postsError}
            </div>
          )}

          {/* Loading */}
          {isPostsLoading && (
            <div className="px-6 py-8 text-center text-sm text-muted">
              Loading your posts...
            </div>
          )}

          {/* Empty */}
          {!isPostsLoading &&
            posts.length === 0 && (
              <div className="px-6 py-10 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-background text-xl">
                  ✍️
                </div>

                <h3 className="mt-4 font-semibold text-text">
                  No posts yet
                </h3>

                <p className="mt-1 text-sm text-muted">
                  Share your first professional
                  update.
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setPostError("");
                    setIsCreateModalOpen(true);
                  }}
                  className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                >
                  Create your first post
                </button>
              </div>
            )}

          {/* Posts */}
          {!isPostsLoading &&
            posts.length > 0 && (
              <div className="divide-y divide-border">
                {posts.map((post) => {
                  const isLiked = user.id
                    ? post.likes.includes(user.id)
                    : false;

                  return (
                    <article
                      key={post._id}
                      className="px-6 py-6"
                    >
                      {/* Post author */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">

                          {/* Post author avatar */}
                          <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-primary font-bold text-white">
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
                            handleDelete(post._id)
                          }
                          className="text-sm font-medium text-danger hover:underline"
                        >
                          Delete
                        </button>
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
                          className="mt-4 max-h-[500px] w-full rounded-xl border border-border object-cover"
                        />
                      )}

                      {/* Post actions */}
                      <div className="mt-5 flex items-center gap-6 border-t border-border pt-4">
                        <button
                          type="button"
                          onClick={() =>
                            handleLike(post._id)
                          }
                          className={`text-sm font-semibold ${
                            isLiked
                              ? "text-primary"
                              : "text-muted hover:text-primary"
                          }`}
                        >
                          {isLiked
                            ? "Liked"
                            : "Like"}{" "}
                          ({post.likes.length})
                        </button>
                      </div>

                      <PostComments
                        postId={post._id}
                        commentCount={post.comments.length}
                      />
                    </article>
                  );
                })}
              </div>
            )}
        </section>
      </div>

      {/* =======================================================
          CREATE POST MODAL
      ======================================================== */}

      {isCreateModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => {
            if (!isPosting) {
              setIsCreateModalOpen(false);
            }
          }}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-border bg-surface shadow-xl"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-text">
                  Create Post
                </h2>

                <p className="mt-1 text-xs text-muted">
                  Share something with your
                  professional network.
                </p>
              </div>

              <button
                type="button"
                disabled={isPosting}
                onClick={() =>
                  setIsCreateModalOpen(false)
                }
                className="text-xl text-muted hover:text-text disabled:opacity-50"
              >
                ×
              </button>
            </div>

            {/* Modal body */}
            <div className="space-y-4 px-6 py-5">
              {postError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-danger">
                  {postError}
                </div>
              )}

              <textarea
                value={content}
                onChange={(event) =>
                  setContent(event.target.value)
                }
                placeholder="What's on your mind?"
                rows={6}
                maxLength={2000}
                className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm text-text outline-none placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20"
              />

              <div className="flex justify-between text-xs text-muted">
                <span>
                  {content.length}/2000 characters
                </span>
              </div>

              <input
                type="url"
                value={imageUrl}
                onChange={(event) =>
                  setImageUrl(event.target.value)
                }
                placeholder="Image URL (optional)"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-text outline-none placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* Modal footer */}
            <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
              <button
                type="button"
                disabled={isPosting}
                onClick={() =>
                  setIsCreateModalOpen(false)
                }
                className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text hover:bg-background disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={
                  isPosting || !content.trim()
                }
                onClick={handleCreatePost}
                className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPosting ? "Posting..." : "Post"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =======================================================
          EDIT PROFILE MODAL
      ======================================================== */}

      {isEditProfileOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6"
          onClick={() => {
            if (!isSavingProfile) {
              setIsEditProfileOpen(false);
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
                disabled={isSavingProfile}
                onClick={() =>
                  setIsEditProfileOpen(false)
                }
                className="text-xl text-muted hover:text-text disabled:opacity-50"
              >
                ×
              </button>
            </div>

            {/* Scrollable modal body */}
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              <div className="space-y-8">

                {/* =================================================
                    BASIC INFORMATION
                ================================================== */}

                <section>
                  <h3 className="font-semibold text-text">
                    Basic Information
                  </h3>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">

                    {/* Name */}
                    <div>
                      <label className="text-sm font-medium text-text">
                        Name
                      </label>

                      <input
                        value={profileForm.name}
                        onChange={(event) =>
                          setProfileForm(
                            (current) => ({
                              ...current,
                              name: event.target
                                .value,
                            }),
                          )
                        }
                        maxLength={50}
                        className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                    </div>

                    {/* Photo */}
                    <div>
                      <label className="text-sm font-medium text-text">
                        Photo URL
                      </label>

                      <input
                        type="url"
                        value={profileForm.photo}
                        onChange={(event) =>
                          setProfileForm(
                            (current) => ({
                              ...current,
                              photo: event.target
                                .value,
                            }),
                          )
                        }
                        placeholder="https://example.com/photo.jpg"
                        className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>

                  {/* Headline */}
                  <div className="mt-4">
                    <label className="text-sm font-medium text-text">
                      Professional Headline
                    </label>

                    <input
                      value={profileForm.headline}
                      onChange={(event) =>
                        setProfileForm(
                          (current) => ({
                            ...current,
                            headline:
                              event.target.value,
                          }),
                        )
                      }
                      maxLength={120}
                      placeholder="Full-stack developer | React | Node.js"
                      className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />

                    <p className="mt-1 text-xs text-muted">
                      {profileForm.headline.length}/120
                    </p>
                  </div>

                  {/* About */}
                  <div className="mt-4">
                    <label className="text-sm font-medium text-text">
                      About
                    </label>

                    <textarea
                      value={profileForm.about}
                      onChange={(event) =>
                        setProfileForm(
                          (current) => ({
                            ...current,
                            about:
                              event.target.value,
                          }),
                        )
                      }
                      maxLength={2000}
                      rows={5}
                      placeholder="Tell people about your professional background..."
                      className="mt-2 w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />

                    <p className="mt-1 text-xs text-muted">
                      {profileForm.about.length}/2000
                    </p>
                  </div>
                </section>

                {/* =================================================
                    EXPERIENCE
                ================================================== */}

                <section>
                  <h3 className="font-semibold text-text">
                    Experience
                  </h3>

                  <p className="mt-1 text-xs text-muted">
                    Add your previous professional
                    experience.
                  </p>

                  {/* Existing experience */}
                  <div className="mt-4 space-y-3">
                    {profileForm.experience.map(
                      (experience, index) => (
                        <div
                          key={`${experience.company}-${index}`}
                          className="rounded-xl border border-border bg-background p-4"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="font-semibold text-text">
                                {experience.title}
                              </p>

                              <p className="mt-1 text-sm text-muted">
                                {experience.company}
                              </p>

                              <p className="mt-1 text-xs text-muted">
                                {experience.startDate}{" "}
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

                  {/* Experience form */}
                  <div className="mt-4 rounded-xl border border-border p-4">
                    <p className="text-sm font-semibold text-text">
                      {editingExperienceIndex ===
                      null
                        ? "Add Experience"
                        : "Edit Experience"}
                    </p>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      {/* Job title */}
                      <input
                        value={experienceForm.title}
                        onChange={(event) =>
                          setExperienceForm(
                            (current) => ({
                              ...current,
                              title:
                                event.target.value,
                            }),
                          )
                        }
                        placeholder="Job title"
                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-text outline-none focus:border-primary"
                      />

                      {/* Company */}
                      <input
                        value={experienceForm.company}
                        onChange={(event) =>
                          setExperienceForm(
                            (current) => ({
                              ...current,
                              company:
                                event.target.value,
                            }),
                          )
                        }
                        placeholder="Company"
                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-text outline-none focus:border-primary"
                      />

                      {/* Start date */}
                      <input
                        value={
                          experienceForm.startDate
                        }
                        onChange={(event) =>
                          setExperienceForm(
                            (current) => ({
                              ...current,
                              startDate:
                                event.target.value,
                            }),
                          )
                        }
                        placeholder="Start date e.g. Jan 2024"
                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-text outline-none focus:border-primary"
                      />

                      {/* End date */}
                      <input
                        value={
                          experienceForm.endDate
                        }
                        onChange={(event) =>
                          setExperienceForm(
                            (current) => ({
                              ...current,
                              endDate:
                                event.target.value,
                            }),
                          )
                        }
                        placeholder="End date or leave blank"
                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-text outline-none focus:border-primary"
                      />
                    </div>

                    {/* Description */}
                    <textarea
                      value={
                        experienceForm.description
                      }
                      onChange={(event) =>
                        setExperienceForm(
                          (current) => ({
                            ...current,
                            description:
                              event.target.value,
                          }),
                        )
                      }
                      maxLength={1000}
                      rows={3}
                      placeholder="Describe your responsibilities..."
                      className="mt-4 w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-text outline-none focus:border-primary"
                    />

                    {/* Experience actions */}
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
                          onClick={() => {
                            setEditingExperienceIndex(
                              null,
                            );

                            setExperienceForm({
                              company: "",
                              title: "",
                              startDate: "",
                              endDate: "",
                              description: "",
                            });

                            setProfileError("");
                          }}
                          className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text hover:bg-background"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </section>

                {/* =================================================
                    EDUCATION
                ================================================== */}

                <section>
                  <h3 className="font-semibold text-text">
                    Education
                  </h3>

                  <p className="mt-1 text-xs text-muted">
                    Example: B.Tech Computer Science —
                    ABC University — 2022–2026
                  </p>

                  {/* Add education */}
                  <div className="mt-4 flex gap-2">
                    <input
                      value={educationInput}
                      onChange={(event) =>
                        setEducationInput(
                          event.target.value,
                        )
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          handleAddEducation();
                        }
                      }}
                      placeholder="Add education"
                      className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-text outline-none focus:border-primary"
                    />

                    <button
                      type="button"
                      onClick={handleAddEducation}
                      className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                    >
                      Add
                    </button>
                  </div>

                  {/* Education list */}
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

                {/* =================================================
                    SKILLS
                ================================================== */}

                <section>
                  <h3 className="font-semibold text-text">
                    Skills
                  </h3>

                  {/* Add skill */}
                  <div className="mt-4 flex gap-2">
                    <input
                      value={skillInput}
                      onChange={(event) =>
                        setSkillInput(
                          event.target.value,
                        )
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
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

                  {/* Skills */}
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
                          >
                            ×
                          </button>
                        </div>
                      ),
                    )}
                  </div>
                </section>

                {/* Profile error */}
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
                disabled={isSavingProfile}
                onClick={() =>
                  setIsEditProfileOpen(false)
                }
                className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text hover:bg-background disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isSavingProfile}
                onClick={handleSaveProfile}
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
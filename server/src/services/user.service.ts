import { z } from "zod";
import { User } from "../models/User.js";

/*
 * Experience validation.
 *
 * We keep the same structure already used by the frontend
 * and by the existing User model.
 */
const experienceSchema = z.object({
  company: z
    .string()
    .trim()
    .min(1, "Company is required")
    .max(100, "Company is too long"),

  title: z
    .string()
    .trim()
    .min(1, "Job title is required")
    .max(100, "Job title is too long"),

  startDate: z
    .string()
    .trim()
    .min(1, "Start date is required")
    .max(30, "Start date is too long"),

  endDate: z
    .string()
    .trim()
    .max(30, "End date is too long")
    .optional(),

  description: z
    .string()
    .trim()
    .max(1000, "Description is too long")
    .optional(),
});

/*
 * Profile update validation.
 *
 * We intentionally do not allow email/password changes here.
 * Those belong to authentication/account-management logic.
 */
const updateProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name cannot exceed 50 characters"),

  photo: z
    .string()
    .trim()
    .url("Photo must be a valid URL")
    .or(z.literal("")),

  headline: z
    .string()
    .trim()
    .max(120, "Headline cannot exceed 120 characters"),

  about: z
    .string()
    .trim()
    .max(2000, "About section cannot exceed 2000 characters"),

  experience: z
    .array(experienceSchema)
    .max(10, "You can add up to 10 experience entries"),

  education: z
    .array(
      z
        .string()
        .trim()
        .min(1, "Education entry cannot be empty")
        .max(200, "Education entry is too long"),
    )
    .max(10, "You can add up to 10 education entries"),

  skills: z
    .array(
      z
        .string()
        .trim()
        .min(1, "Skill cannot be empty")
        .max(50, "Skill is too long"),
    )
    .max(30, "You can add up to 30 skills"),
});

export interface UpdateProfileData {
  name: string;
  photo: string;
  headline: string;
  about: string;
  experience: {
    company: string;
    title: string;
    startDate: string;
    endDate?: string;
    description?: string;
  }[];
  education: string[];
  skills: string[];
}

export const searchUsers = async (
  currentUserId: string,
  search: string,
) => {
  const trimmedSearch = search.trim();

  if (!trimmedSearch) {
    return [];
  }

  return User.find({
    _id: { $ne: currentUserId },
    name: {
      $regex: trimmedSearch,
      $options: "i",
    },
  })
    .select(
      "_id name photo headline about experience education skills",
    )
    .limit(20)
    .sort({ name: 1 });
};

export const getUserProfile = async (userId: string) => {
  return User.findById(userId).select(
    "_id name email photo headline about experience education skills",
  );
};

/*
 * Update the currently authenticated user's profile.
 *
 * IMPORTANT:
 * The user ID comes from the authenticated JWT.
 * We never accept a user ID from the request body.
 */
export const updateMyProfile = async (
  userId: string,
  profileData: UpdateProfileData,
) => {
  const validatedData = updateProfileSchema.parse(profileData);

  /*
   * Remove duplicate skills while preserving their original order.
   */
  const uniqueSkills = Array.from(
    new Set(
      validatedData.skills.map((skill) => skill.trim()),
    ),
  );

  /*
   * Clean optional experience fields before saving.
   */
  const cleanedExperience = validatedData.experience.map(
    (experience) => ({
      company: experience.company.trim(),
      title: experience.title.trim(),
      startDate: experience.startDate.trim(),
      endDate: experience.endDate?.trim() || undefined,
      description:
        experience.description?.trim() || undefined,
    }),
  );

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        name: validatedData.name.trim(),
        photo: validatedData.photo.trim(),
        headline: validatedData.headline.trim(),
        about: validatedData.about.trim(),
        experience: cleanedExperience,
        education: validatedData.education.map((item) =>
          item.trim(),
        ),
        skills: uniqueSkills,
      },
    },
    {
      new: true,
      runValidators: true,
    },
  ).select(
    "_id name email photo headline about experience education skills",
  );

  if (!updatedUser) {
    throw new Error("User not found");
  }

  return updatedUser;
};
import { z } from "zod";

export const createPostSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Post content is required")
    .max(2000, "Post content cannot exceed 2000 characters"),

  imageUrl: z
    .string()
    .url("Image URL must be a valid URL")
    .optional()
    .or(z.literal("")),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
import { z } from "zod";

export const createCommentSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Comment cannot be empty")
    .max(1000, "Comment cannot exceed 1000 characters"),

  parentCommentId: z
    .string()
    .optional()
    .or(z.literal("")),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
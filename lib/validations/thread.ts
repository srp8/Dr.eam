import * as z from "zod";

export const ThreadValidation = z.object({
  thread: z.string().min(1).min(3, { message: "Minimum 3 character." }),
  accountId: z.string(),
});

export const CommentValidation = z.object({
  thread: z.string().min(1).min(3, { message: "Minimum 3 characters." }),
});
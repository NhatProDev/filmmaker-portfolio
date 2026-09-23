import { z } from "zod";

// projects.credits is JSONB; this is its contract.
export const projectCreditsSchema = z
  .array(z.strictObject({ role: z.string().min(1).max(120), name: z.string().min(1).max(200) }))
  .max(100);

export type ProjectCredits = z.infer<typeof projectCreditsSchema>;

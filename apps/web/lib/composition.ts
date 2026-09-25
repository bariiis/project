import { z } from "zod";
import { Target } from "@promptsite/compiler";

/** A builder page: what /api/compile compiles and what /api/projects stores. */
export const CompositionBody = z.object({
  title: z.string().trim().min(1).max(120),
  target: Target,
  lang: z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/).default("en"),
  blocks: z.array(z.string().max(80)).min(1).max(20),
  slots: z.record(z.string(), z.record(z.string(), z.string().max(2000))).default({}),
});

export type Composition = z.infer<typeof CompositionBody>;

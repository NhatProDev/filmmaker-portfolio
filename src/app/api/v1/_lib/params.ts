import { z } from "zod";
import { PAGE_KEYS } from "@/features/project-builder/page.service";
import { slugParam, uuidParam } from "./route";

export const projectParams = z.object({ projectId: uuidParam });
export const blockParams = z.object({ blockId: uuidParam });
export const blockMediaParams = z.object({ blockId: uuidParam, blockMediaId: uuidParam });
export const mediaParams = z.object({ mediaId: uuidParam });
export const pageParams = z.object({ pageKey: z.enum(PAGE_KEYS) });
export const slugParams = z.object({ slug: slugParam });

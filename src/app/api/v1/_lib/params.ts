import { z } from "zod";
import { CONTENT_PAGE_KEYS } from "@/features/page-content/page-content.schema";
import { COMPOSED_PAGE_KEYS, PAGE_KEYS } from "@/features/project-builder/page.service";
import { slugParam, uuidParam } from "./route";

export const projectParams = z.object({ projectId: uuidParam });
export const blockParams = z.object({ blockId: uuidParam });
export const blockMediaParams = z.object({ blockId: uuidParam, blockMediaId: uuidParam });
export const mediaParams = z.object({ mediaId: uuidParam });
export const pageParams = z.object({ pageKey: z.enum(PAGE_KEYS) });
// Block routes: only a page that owns a composition (ADR-0007).
export const composedPageParams = z.object({ pageKey: z.enum(COMPOSED_PAGE_KEYS) });
// Content and slot routes: only a structured page (ADR-0017).
export const contentPageParams = z.object({ pageKey: z.enum(CONTENT_PAGE_KEYS) });
export const slugParams = z.object({ slug: slugParam });

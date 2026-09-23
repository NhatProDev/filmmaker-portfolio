import { z } from "zod";
import { BLOCK_TYPES } from "./block.schema";

// Request schemas for composition changes (openapi.yaml). `content` and
// `config` are checked here only for being objects; their shape depends on the
// block type and its container, and parseBlock validates that in the service.

const jsonObject = z.record(z.string(), z.unknown());

export const createBlockSchema = z.strictObject({
  type: z.enum(BLOCK_TYPES),
  content: jsonObject.optional(),
  config: jsonObject.optional(),
  parentBlockId: z.uuid().nullable().optional(),
  // The upper bound depends on the container and is checked in the insert
  // transaction (CLAUDE.md §14).
  position: z.int().min(0).optional(),
  isHidden: z.boolean().optional(),
});

export const updateBlockSchema = z
  .strictObject({
    content: jsonObject.optional(),
    config: jsonObject.optional(),
    isHidden: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "at least one field is required");

const idSet = z
  .array(z.uuid())
  .min(1)
  .refine((ids) => new Set(ids).size === ids.length, "ids must be unique");

export const reorderBlocksSchema = z.strictObject({
  parentBlockId: z.uuid().nullable(),
  blockIds: idSet,
});

const altText = z.string().max(1000).nullable();

export const addBlockMediaSchema = z.strictObject({
  mediaId: z.uuid(),
  position: z.int().min(0).optional(),
  altText: altText.optional(),
  posterMediaId: z.uuid().nullable().optional(),
  config: jsonObject.optional(),
});

export const updateBlockMediaSchema = z
  .strictObject({
    altText: altText.optional(),
    posterMediaId: z.uuid().nullable().optional(),
    config: jsonObject.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "at least one field is required");

export const reorderBlockMediaSchema = z.strictObject({ blockMediaIds: idSet });

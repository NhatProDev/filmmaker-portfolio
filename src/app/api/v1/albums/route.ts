import { createAlbumSchema, listAlbumsQuerySchema } from "@/features/albums/album.schema";
import { adminRoute, json, readJson, readQuery } from "../_lib/route";
import { services } from "../_lib/services";

// Albums (ADR-0019), in display order.
export const GET = adminRoute(async ({ request, db }) => {
  readQuery(request, listAlbumsQuerySchema);
  return json({ data: await services(db).albums.list() });
});

export const POST = adminRoute(async ({ request, db }) => {
  const body = await readJson(request, createAlbumSchema);
  return json({ data: await services(db).albums.create(body) }, 201);
});

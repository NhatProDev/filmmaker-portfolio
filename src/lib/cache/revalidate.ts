import { revalidatePath } from "next/cache";

// The public pages are statically rendered. After a change visitors can see
// (a publish, an unpublish, a new order, a slug or visibility change) they are
// all regenerated on their next request. The site is small, so the whole
// public tree is revalidated rather than guessing which pages a change reaches.
export function revalidatePublicSite() {
  revalidatePath("/", "layout");
}

// A URL slug from a title: lowercase ASCII, hyphen-separated. Diacritics are
// folded (Vietnamese đ included) so names keep a readable slug.
export function slugify(title: string): string {
  return title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 200);
}

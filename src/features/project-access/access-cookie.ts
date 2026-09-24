// The name of a private project's access cookie. Kept free of any server
// dependency so the edge proxy can import it.
export const ACCESS_COOKIE_PREFIX = "portfolio_access_";
export const accessCookieName = (slug: string) => `${ACCESS_COOKIE_PREFIX}${slug}`;

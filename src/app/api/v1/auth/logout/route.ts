import { ADMIN_SESSION_COOKIE, createAuthService } from "@/features/authentication/auth.service";
import { expireCookie, readCookie } from "@/lib/http/request";
import { noContent, publicRoute } from "../../_lib/route";

// Idempotent: revokes the session server-side if there is one, and always
// clears the cookie.
export const POST = publicRoute(async ({ request, db }) => {
  await createAuthService(db).logout(readCookie(request, ADMIN_SESSION_COOKIE));
  return noContent({ "set-cookie": expireCookie(ADMIN_SESSION_COOKIE, "Strict") });
});

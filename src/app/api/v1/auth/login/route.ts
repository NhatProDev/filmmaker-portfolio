import { toAdminUserDto } from "@/features/authentication/auth.mapper";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_TTL_SECONDS,
  createAuthService,
  loginRequestSchema,
} from "@/features/authentication/auth.service";
import { clientAddress, serializeCookie } from "@/lib/http/request";
import { json, publicRoute, readJson } from "../../_lib/route";

export const POST = publicRoute(async ({ request, db }) => {
  const body = await readJson(request, loginRequestSchema);
  const { admin, token } = await createAuthService(db).login({
    ...body,
    clientAddress: clientAddress(request),
    userAgent: request.headers.get("user-agent"),
  });
  return json({ data: toAdminUserDto(admin) }, 200, {
    "set-cookie": serializeCookie(ADMIN_SESSION_COOKIE, token, {
      maxAgeSeconds: ADMIN_SESSION_TTL_SECONDS,
      sameSite: "Strict",
    }),
  });
});

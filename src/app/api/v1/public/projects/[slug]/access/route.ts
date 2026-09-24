import { z } from "zod";
import { clientAddress, serializeCookie } from "@/lib/http/request";
import { slugParams } from "../../../../_lib/params";
import { noContent, publicRoute, readJson } from "../../../../_lib/route";
import { services } from "../../../../_lib/services";

const bodySchema = z.strictObject({ password: z.string().min(1).max(200) });

// Verifies a private project's password and grants temporary access to that
// project only, as a signed HttpOnly cookie (CLAUDE.md §11).
export const POST = publicRoute(
  async ({ request, params, db }) => {
    const { password } = await readJson(request, bodySchema);
    const grant = await services(db).access.unlock(params.slug, password, clientAddress(request));
    return noContent({
      "set-cookie": serializeCookie(grant.cookieName, grant.cookieValue, {
        maxAgeSeconds: grant.maxAgeSeconds,
        sameSite: "Lax",
      }),
    });
  },
  { params: slugParams },
);

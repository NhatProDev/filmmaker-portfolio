import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DatabaseUnavailableError, getDatabase } from "@db/client";
import { ADMIN_SESSION_COOKIE, createAuthService, type AdminPrincipal } from "./auth.service";

// The signed-in admin for a server component or page. The Studio's pages use
// this; its API routes authenticate through the /api/v1 boundary instead.

export type CurrentAdmin = { admin: AdminPrincipal | null; databaseUnavailable: boolean };

export async function getCurrentAdmin(): Promise<CurrentAdmin> {
  const token = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value ?? null;
  try {
    return { admin: await createAuthService(getDatabase()).authenticate(token), databaseUnavailable: false };
  } catch (error) {
    if (error instanceof DatabaseUnavailableError) return { admin: null, databaseUnavailable: true };
    throw error;
  }
}

export async function requireAdmin(): Promise<AdminPrincipal> {
  const { admin, databaseUnavailable } = await getCurrentAdmin();
  if (!admin) redirect(databaseUnavailable ? "/admin/login?reason=database" : "/admin/login");
  return admin;
}

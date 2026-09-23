import { toAdminUserDto } from "@/features/authentication/auth.mapper";
import { adminRoute, json } from "../../_lib/route";

export const GET = adminRoute(async ({ admin }) => json({ data: toAdminUserDto(admin) }));

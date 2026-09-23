import type { AdminUserRecord } from "./auth.repository";

// The AdminUser DTO (openapi.yaml). Password hashes never reach this shape.
export function toAdminUserDto(admin: AdminUserRecord) {
  return {
    id: admin.id,
    email: admin.email,
    name: admin.name,
    createdAt: admin.createdAt.toISOString(),
    updatedAt: admin.updatedAt.toISOString(),
    lastLoginAt: admin.lastLoginAt?.toISOString() ?? null,
  };
}

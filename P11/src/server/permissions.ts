/**
 * Role matrix. BUILD_SPEC §4 defines `Role { OWNER ADMIN MEMBER VIEWER }` as
 * a single linear hierarchy (no per-resource ACL in v1) — this file is the
 * one place that ordering is encoded.
 */
import type { Role } from "@/generated/prisma/enums";

/** Higher number = more privilege. */
const ROLE_RANK: Record<Role, number> = {
  VIEWER: 0,
  MEMBER: 1,
  ADMIN: 2,
  OWNER: 3,
};

/** Does `role` meet or exceed `minRole`? */
export function hasRole(role: Role, minRole: Role): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minRole];
}

/** Only an OWNER may change another member's role or remove them. */
export function canManageMembers(role: Role): boolean {
  return hasRole(role, "OWNER");
}

/** ADMIN and above may invite new members, at or below their own role. */
export function canInvite(role: Role): boolean {
  return hasRole(role, "ADMIN");
}

/** ADMIN and above may add/edit/remove `CustomFieldDef` rows — a workspace's
 * field vocabulary is a shared, structural setting (every member's forms
 * change when it does), not a per-record edit. */
export function canManageCustomFields(role: Role): boolean {
  return hasRole(role, "ADMIN");
}

/**
 * A role may only grant a role at or below its own rank — an ADMIN cannot
 * invite an OWNER. Enforced here rather than left to the caller because
 * this is exactly the kind of check that "forgot one call site" quietly
 * breaks.
 */
export function canGrantRole(actingRole: Role, targetRole: Role): boolean {
  return ROLE_RANK[actingRole] >= ROLE_RANK[targetRole];
}

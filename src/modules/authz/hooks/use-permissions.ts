"use client";
import { useContext } from "react";
import { PermissionsContext } from "../components/permissions-provider";

export function usePermissions() {
  const perms = useContext(PermissionsContext);
  return {
    has: (permission: string) => perms.has("*") || perms.has(permission),
    permissions: perms,
  };
}

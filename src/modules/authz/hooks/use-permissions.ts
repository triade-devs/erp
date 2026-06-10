"use client";
import { useContext } from "react";
import { PermissionsContext } from "../components/permissions-provider";

export function usePermissions() {
  const { permissions } = useContext(PermissionsContext);
  return {
    has: (permission: string) => permissions.has("*") || permissions.has(permission),
    permissions,
  };
}

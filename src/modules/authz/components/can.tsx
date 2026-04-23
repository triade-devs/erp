"use client";
import type { ReactNode } from "react";
import { usePermissions } from "../hooks/use-permissions";

export function Can({
  permission,
  children,
  fallback = null,
}: {
  permission: string;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { has } = usePermissions();
  return has(permission) ? <>{children}</> : <>{fallback}</>;
}

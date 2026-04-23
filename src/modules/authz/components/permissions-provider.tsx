"use client";
import { createContext, type ReactNode } from "react";

export const PermissionsContext = createContext<Set<string>>(new Set());

export function PermissionsProvider({
  permissions,
  children,
}: {
  permissions: string[];
  children: ReactNode;
}) {
  return (
    <PermissionsContext.Provider value={new Set(permissions)}>
      {children}
    </PermissionsContext.Provider>
  );
}

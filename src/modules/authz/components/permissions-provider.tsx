"use client";
import { createContext, type ReactNode } from "react";

export type FieldMode = "hidden" | "readonly" | "editable";

export type FieldModesMap = Record<string, FieldMode>; // key = `${table}.${column}`

type PermissionsContextValue = {
  permissions: Set<string>;
  fieldModes: FieldModesMap;
};

export const PermissionsContext = createContext<PermissionsContextValue>({
  permissions: new Set(),
  fieldModes: {},
});

export function PermissionsProvider({
  permissions,
  fieldModes,
  children,
}: {
  permissions: string[];
  fieldModes?: FieldModesMap;
  children: ReactNode;
}) {
  return (
    <PermissionsContext.Provider
      value={{ permissions: new Set(permissions), fieldModes: fieldModes ?? {} }}
    >
      {children}
    </PermissionsContext.Provider>
  );
}

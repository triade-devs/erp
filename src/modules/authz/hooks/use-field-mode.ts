"use client";
import { useContext } from "react";
import { PermissionsContext, type FieldMode } from "../components/permissions-provider";

/**
 * Retorna o modo efetivo de uma coluna para o user atual.
 * Default: 'editable' (sem rule = irrestrito).
 */
export function useFieldMode(tableName: string, columnName: string): FieldMode {
  const ctx = useContext(PermissionsContext);
  return ctx.fieldModes[`${tableName}.${columnName}`] ?? "editable";
}

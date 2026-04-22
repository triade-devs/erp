import "server-only";
import { env } from "./env";

export function isMultitenancyEnabled(): boolean {
  return env.NEXT_PUBLIC_MULTITENANCY_ENABLED;
}

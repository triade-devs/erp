import "server-only";
import { env } from "./env";

export function isMultitenancyEnabled(): boolean {
  return env.MULTITENANCY_ENABLED;
}

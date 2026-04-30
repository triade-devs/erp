import type { PhaseChecklist } from "../scripts/phases.js";
import { F0 } from "./f0.js";
import { F1 } from "./f1.js";
import { F2 } from "./f2.js";
import { F3 } from "./f3.js";
import { F4 } from "./f4.js";
import { F5 } from "./f5.js";

export const PHASES: Record<PhaseChecklist["id"], PhaseChecklist> = { F0, F1, F2, F3, F4, F5 };

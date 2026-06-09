// Barrel — única API pública do módulo spaces (aluguel de espaços)

// Actions
export { createSpaceAction } from "./actions/create-space";
export { updateSpaceAction } from "./actions/update-space";
export { deactivateSpaceAction } from "./actions/deactivate-space";
export { createRentalAction } from "./actions/create-rental";
export { cancelRentalAction } from "./actions/cancel-rental";

// Queries
export { listSpaces } from "./queries/list-spaces";
export { getSpace } from "./queries/get-space";
export { listRentals } from "./queries/list-rentals";
export { getOccupancy } from "./queries/get-occupancy";

// Components
export { SpaceTable } from "./components/space-table";
export { SpaceForm } from "./components/space-form";
export { RentalForm } from "./components/rental-form";
export { RentalTable } from "./components/rental-table";
export { SpaceCalendar } from "./components/space-calendar";

// Services
export {
  normalizeRentalPeriod,
  hasOverlap,
  validateNoOverlap,
  formatRentalPeriod,
  RentalOverlapError,
} from "./services/rental-service";

// Types
export type {
  Space,
  SpaceInsert,
  SpaceUpdate,
  SpaceRental,
  SpaceRentalInsert,
  RentalWithRelations,
  BookingMode,
  RentalKind,
  RentalStatus,
  PaginatedResult,
} from "./types";

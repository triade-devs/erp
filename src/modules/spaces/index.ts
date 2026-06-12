// Barrel — única API pública do módulo spaces (aluguel de espaços)

// Actions
export { createSpaceAction } from "./actions/create-space";
export { updateSpaceAction } from "./actions/update-space";
export { deactivateSpaceAction } from "./actions/deactivate-space";
export { createRentalAction } from "./actions/create-rental";
export { cancelRentalAction } from "./actions/cancel-rental";
export { requestRentalAction } from "./actions/request-rental";
export { decideRentalAction } from "./actions/decide-rental";
export { updateRequestAction } from "./actions/update-request";

// Queries
export { listSpaces } from "./queries/list-spaces";
export { getSpace } from "./queries/get-space";
export { listRentals } from "./queries/list-rentals";
export { getOccupancy } from "./queries/get-occupancy";
export { listPendingRequests } from "./queries/list-pending-requests";
export { listMyRentals } from "./queries/list-my-rentals";

// Components
export { SpaceTable } from "./components/space-table";
export { SpaceForm } from "./components/space-form";
export { RentalForm } from "./components/rental-form";
export { RentalTable } from "./components/rental-table";
export { SpaceCalendar } from "./components/space-calendar";
export { RequestRentalDialog } from "./components/request-rental-dialog";
export { PendingRequestCard } from "./components/pending-request-card";
export { MyRentalsList } from "./components/my-rentals-list";
export { EditRequestDialog } from "./components/edit-request-dialog";

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
  PendingRequestBatch,
} from "./types";

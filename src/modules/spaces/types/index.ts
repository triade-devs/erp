import type { Database } from "@/types/database.types";

export type Space = Database["public"]["Tables"]["spaces"]["Row"];
export type SpaceInsert = Database["public"]["Tables"]["spaces"]["Insert"];
export type SpaceUpdate = Database["public"]["Tables"]["spaces"]["Update"];

export type SpaceRental = Database["public"]["Tables"]["space_rentals"]["Row"];
export type SpaceRentalInsert = Database["public"]["Tables"]["space_rentals"]["Insert"];

export type BookingMode = Database["public"]["Enums"]["space_booking_mode"];
export type RentalKind = Database["public"]["Enums"]["rental_kind"];
export type RentalStatus = Database["public"]["Enums"]["rental_status"];

/** Aluguel acrescido de dados do espaço e do responsável (para listagens/calendário). */
export type RentalWithRelations = SpaceRental & {
  spaces: { id: string; name: string } | null;
  renter: { id: string; full_name: string } | null;
};

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

import { z } from "zod";

export const spaceSchema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres").max(120, "Máximo 120 caracteres"),
  description: z.string().max(2000, "Máximo 2000 caracteres").optional().nullable(),
  location: z.string().max(200, "Máximo 200 caracteres").optional().nullable(),
  capacity: z.coerce
    .number({ invalid_type_error: "Valor inválido" })
    .int("Deve ser um número inteiro")
    .positive("Deve ser maior que zero")
    .optional()
    .nullable(),
  defaultPrice: z.coerce
    .number({ invalid_type_error: "Valor inválido" })
    .nonnegative("Deve ser >= 0")
    .default(0),
  bookingMode: z.enum(["daily", "hourly", "both"], { required_error: "Selecione o modo" }),
  isActive: z.coerce.boolean().default(true),
});

export const rentalSchema = z
  .object({
    spaceId: z.string().uuid("Espaço inválido"),
    renterUserId: z.string().uuid("Selecione o responsável pelo aluguel"),
    bookingKind: z.enum(["daily", "hourly"], { required_error: "Selecione o tipo de reserva" }),
    startsAt: z.coerce.date({ invalid_type_error: "Data de início inválida" }),
    endsAt: z.coerce.date({ invalid_type_error: "Data de término inválida" }),
    price: z.coerce
      .number({ invalid_type_error: "Valor inválido" })
      .nonnegative("Deve ser >= 0")
      .default(0),
    notes: z.string().max(500, "Máximo 500 caracteres").optional().nullable(),
  })
  .refine((d) => (d.bookingKind === "daily" ? d.endsAt >= d.startsAt : d.endsAt > d.startsAt), {
    message: "O término deve ser igual ou depois do início",
    path: ["endsAt"],
  });

export const cancelRentalSchema = z.object({
  rentalId: z.string().uuid("Aluguel inválido"),
  spaceId: z.string().uuid("Espaço inválido"),
});

export const listSpacesSchema = z.object({
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  onlyActive: z.coerce.boolean().default(true),
  sortBy: z.enum(["name", "default_price", "created_at"]).default("name"),
  sortDir: z.enum(["asc", "desc"]).default("asc"),
});

export type SpaceInput = z.infer<typeof spaceSchema>;
export type RentalInput = z.infer<typeof rentalSchema>;
export type CancelRentalInput = z.infer<typeof cancelRentalSchema>;
export type ListSpacesInput = z.infer<typeof listSpacesSchema>;

import { z } from "zod";
import { MOTIVOS_BAJA } from "@/lib/constants";

const motivoEnum = z.enum(MOTIVOS_BAJA, {
  message: "Seleccione un motivo válido",
});

/**
 * Schema para el formulario cliente de bajas.
 *
 * Solo valida forma y longitud. La autorización de administrador, el estado
 * ACTIVO del bien y la transacción irreversible se validan en Server Action y
 * RPC.
 */
export const createBajaSchema = z.object({
  id_bien: z.number().int().positive("Seleccione un bien"),
  motivo: motivoEnum,
  descripcion: z
    .string()
    .max(500, "La descripción no puede superar 500 caracteres")
    .optional()
    .or(z.literal("")),
});

/**
 * Schema para Server Actions. `id_bien` se coerciona porque llega desde
 * `FormData`; el motivo reutiliza el enum compartido con la UI y la BD.
 */
export const createBajaActionSchema = z.object({
  id_bien: z.coerce.number().int().positive("Seleccione un bien"),
  motivo: motivoEnum,
  descripcion: z
    .string()
    .max(500, "La descripción no puede superar 500 caracteres")
    .optional()
    .or(z.literal("")),
});

export type CreateBajaInput = z.infer<typeof createBajaSchema>;

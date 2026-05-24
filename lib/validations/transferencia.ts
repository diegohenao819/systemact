import { z } from "zod";

const RESPONSABLE_DESTINO_REQUERIDO = "Seleccione el responsable destino";
const responsableDestinoSchema = z
  .string()
  .trim()
  .min(1, RESPONSABLE_DESTINO_REQUERIDO)
  .uuid(RESPONSABLE_DESTINO_REQUERIDO);

/**
 * Schema usado en el formulario cliente de transferencias.
 *
 * La validación de "misma ubicación" y estado ACTIVO ocurre en el RPC porque
 * necesita leer y bloquear el bien actual en la base de datos.
 */
export const createTransferenciaSchema = z.object({
  id_bien: z.number().int().positive("Seleccione un bien"),
  sede_destino: z.number().int().positive("Seleccione la sede destino"),
  area_destino: z.number().int().positive("Seleccione el área destino"),
  responsable_destino: responsableDestinoSchema,
  motivo: z.string().min(3, "El motivo debe tener al menos 3 caracteres"),
});

/**
 * Schema para Server Actions. Convierte ids desde `FormData` y deja el resto de
 * reglas transaccionales al RPC `crear_transferencia`.
 */
export const createTransferenciaActionSchema = z.object({
  id_bien: z.coerce.number().int().positive("Seleccione un bien"),
  sede_destino: z.coerce.number().int().positive("Seleccione la sede destino"),
  area_destino: z.coerce.number().int().positive("Seleccione el área destino"),
  responsable_destino: responsableDestinoSchema,
  motivo: z.string().min(3, "El motivo debe tener al menos 3 caracteres"),
});

export type CreateTransferenciaInput = z.infer<typeof createTransferenciaSchema>;

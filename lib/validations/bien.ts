import { z } from "zod";

const MAX_CANTIDAD = 1_000_000;
const MAX_VALOR_UNITARIO = 100_000_000_000;
const RESPONSABLE_REQUERIDO = "Seleccione un responsable";

const responsableIdSchema = z
  .string()
  .trim()
  .min(1, RESPONSABLE_REQUERIDO)
  .uuid(RESPONSABLE_REQUERIDO);

/**
 * Schema usado por React Hook Form.
 *
 * Aquí los campos numéricos ya llegan como number porque el formulario los
 * transforma antes de validar. El schema equivalente para Server Actions vive
 * abajo y usa `z.coerce` porque `FormData` siempre entrega strings.
 */
export const createBienSchema = z
  .object({
    nombre: z.string().trim().min(1, "El nombre es obligatorio"),
    id_caracteristica: z.number().positive("Seleccione un tipo de bien"),
    id_sede: z.number().positive("Seleccione una sede"),
    id_area: z.number().positive("Seleccione un área"),
    id_responsable: responsableIdSchema,
    serial: z.string().optional().or(z.literal("")),
    placa: z.string().optional().or(z.literal("")),
    cantidad: z
      .number()
      .int()
      .positive("La cantidad debe ser mayor a 0")
      .max(MAX_CANTIDAD, `La cantidad no puede superar ${MAX_CANTIDAD}`),
    valor_unitario: z
      .number()
      .nonnegative("El valor no puede ser negativo")
      .max(MAX_VALOR_UNITARIO, "El valor unitario es demasiado alto"),
    estado: z.enum(["ACTIVO", "INACTIVO"]),
    observaciones: z.string().optional().or(z.literal("")),
    imagen_url: z.string().url().optional().or(z.literal("")),
  });

/**
 * Schema defensivo para Server Actions.
 *
 * Nunca asume que el navegador envía tipos correctos. Convierte números desde
 * `FormData`, valida límites de negocio y mantiene los mensajes de error de la
 * UI alineados con los del servidor.
 */
export const createBienActionSchema = z
  .object({
    nombre: z.string().trim().min(1, "El nombre es obligatorio"),
    id_caracteristica: z.coerce.number().positive("Seleccione un tipo de bien"),
    id_sede: z.coerce.number().positive("Seleccione una sede"),
    id_area: z.coerce.number().positive("Seleccione un área"),
    id_responsable: responsableIdSchema,
    serial: z.string().optional().or(z.literal("")),
    placa: z.string().optional().or(z.literal("")),
    cantidad: z
      .coerce.number()
      .int()
      .positive("La cantidad debe ser mayor a 0")
      .max(MAX_CANTIDAD, `La cantidad no puede superar ${MAX_CANTIDAD}`),
    valor_unitario: z
      .coerce.number()
      .nonnegative("El valor no puede ser negativo")
      .max(MAX_VALOR_UNITARIO, "El valor unitario es demasiado alto"),
    estado: z.enum(["ACTIVO", "INACTIVO"]),
    observaciones: z.string().optional().or(z.literal("")),
    imagen_url: z.string().url("URL de imagen inválida").optional().or(z.literal("")),
  });

export const updateBienSchema = createBienSchema.extend({
  id_bien: z.number().positive(),
});

export const updateBienActionSchema = createBienActionSchema.extend({
  id_bien: z.coerce.number().positive(),
});

export type CreateBienInput = z.infer<typeof createBienSchema>;
export type UpdateBienInput = z.infer<typeof updateBienSchema>;

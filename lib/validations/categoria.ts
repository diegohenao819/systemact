import { z } from "zod";

const codigoRegex = /^[A-Z0-9]{2,8}$/;

export const createCategoriaSchema = z.object({
  codigo: z
    .string()
    .trim()
    .regex(
      codigoRegex,
      "El código debe ser de 2 a 8 caracteres en mayúsculas o números (ej: COMP, PORT, RED1)",
    ),
  descripcion: z
    .string()
    .trim()
    .min(3, "La descripción debe tener al menos 3 caracteres")
    .max(120, "Máximo 120 caracteres"),
  observaciones: z
    .string()
    .trim()
    .max(500, "Máximo 500 caracteres")
    .optional()
    .or(z.literal("")),
});

export const updateCategoriaSchema = createCategoriaSchema.extend({
  id_caracteristica: z.coerce.number().int().positive(),
});

export const createCategoriaActionSchema = z.object({
  codigo: z
    .string()
    .trim()
    .regex(
      codigoRegex,
      "El código debe ser de 2 a 8 caracteres en mayúsculas o números",
    ),
  descripcion: z.string().trim().min(3).max(120),
  observaciones: z.string().trim().max(500).optional().or(z.literal("")),
});

export const updateCategoriaActionSchema = createCategoriaActionSchema.extend({
  id_caracteristica: z.coerce.number().int().positive(),
});

export type CreateCategoriaInput = z.infer<typeof createCategoriaSchema>;
export type UpdateCategoriaInput = z.infer<typeof updateCategoriaSchema>;

import { z } from "zod";

export const createSedeSchema = z.object({
  nombre_sede: z
    .string()
    .min(1, "El nombre de la sede es obligatorio")
    .max(150, "Máximo 150 caracteres"),
  abreviatura: z
    .string()
    .max(10, "Máximo 10 caracteres")
    .optional()
    .or(z.literal("")),
  ciudad: z
    .string()
    .max(100, "Máximo 100 caracteres")
    .optional()
    .or(z.literal("")),
  direccion: z
    .string()
    .max(255, "Máximo 255 caracteres")
    .optional()
    .or(z.literal("")),
});

export const updateSedeSchema = createSedeSchema.extend({
  id_sede: z.coerce.number().positive(),
});

export type CreateSedeInput = z.infer<typeof createSedeSchema>;
export type UpdateSedeInput = z.infer<typeof updateSedeSchema>;

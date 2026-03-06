import { z } from "zod";

export const createAreaSchema = z.object({
  nombre_area: z
    .string()
    .min(1, "El nombre del área es obligatorio")
    .max(100, "Máximo 100 caracteres"),
  estado: z.enum(["ACTIVO", "INACTIVO"]),
});

export const updateAreaSchema = createAreaSchema.extend({
  id_area: z.coerce.number().positive(),
});

export type CreateAreaInput = z.infer<typeof createAreaSchema>;
export type UpdateAreaInput = z.infer<typeof updateAreaSchema>;
import { z } from "zod";

export const createBienSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  id_caracteristica: z.number().positive("Seleccione un tipo de bien"),
  id_sede: z.number().positive("Seleccione una sede"),
  id_area: z.number().positive("Seleccione un área"),
  id_responsable: z.string().min(1, "Seleccione un responsable"),
  serial: z.string().optional().or(z.literal("")),
  placa: z.string().optional().or(z.literal("")),
  cantidad: z.number().int().positive("La cantidad debe ser mayor a 0"),
  valor_unitario: z.number().nonnegative("El valor no puede ser negativo"),
  estado: z.enum(["ACTIVO", "INACTIVO"]),
  observaciones: z.string().optional().or(z.literal("")),
});

// Schema separado para actions (recibe strings de FormData y los coerce)
export const createBienActionSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  id_caracteristica: z.coerce.number().positive("Seleccione un tipo de bien"),
  id_sede: z.coerce.number().positive("Seleccione una sede"),
  id_area: z.coerce.number().positive("Seleccione un área"),
  id_responsable: z.string().min(1, "Seleccione un responsable"),
  serial: z.string().optional().or(z.literal("")),
  placa: z.string().optional().or(z.literal("")),
  cantidad: z.coerce.number().int().positive("La cantidad debe ser mayor a 0"),
  valor_unitario: z.coerce.number().nonnegative("El valor no puede ser negativo"),
  estado: z.enum(["ACTIVO", "INACTIVO"]),
  observaciones: z.string().optional().or(z.literal("")),
});

export const updateBienSchema = createBienSchema.extend({
  id_bien: z.number().positive(),
});

export const updateBienActionSchema = createBienActionSchema.extend({
  id_bien: z.coerce.number().positive(),
});

export type CreateBienInput = z.infer<typeof createBienSchema>;
export type UpdateBienInput = z.infer<typeof updateBienSchema>;
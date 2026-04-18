import { z } from "zod";

export const createTransferenciaSchema = z.object({
  id_bien: z.number().int().positive("Seleccione un bien"),
  sede_destino: z.number().int().positive("Seleccione la sede destino"),
  area_destino: z.number().int().positive("Seleccione el área destino"),
  responsable_destino: z.string().optional().or(z.literal("")),
  responsable_destino_texto: z.string().optional().or(z.literal("")),
  motivo: z.string().min(3, "El motivo debe tener al menos 3 caracteres"),
});

// Schema para Server Actions (recibe strings de FormData)
export const createTransferenciaActionSchema = z.object({
  id_bien: z.coerce.number().int().positive("Seleccione un bien"),
  sede_destino: z.coerce.number().int().positive("Seleccione la sede destino"),
  area_destino: z.coerce.number().int().positive("Seleccione el área destino"),
  responsable_destino: z.string().optional().or(z.literal("")),
  responsable_destino_texto: z.string().optional().or(z.literal("")),
  motivo: z.string().min(3, "El motivo debe tener al menos 3 caracteres"),
});

export type CreateTransferenciaInput = z.infer<typeof createTransferenciaSchema>;

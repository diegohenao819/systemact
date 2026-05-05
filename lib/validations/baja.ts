import { z } from "zod";
import { MOTIVOS_BAJA } from "@/lib/constants";

const motivoEnum = z.enum(MOTIVOS_BAJA, {
  message: "Seleccione un motivo válido",
});

// Schema para uso en cliente (React Hook Form, valores ya tipados)
export const createBajaSchema = z.object({
  id_bien: z.number().int().positive("Seleccione un bien"),
  motivo: motivoEnum,
  descripcion: z
    .string()
    .max(500, "La descripción no puede superar 500 caracteres")
    .optional()
    .or(z.literal("")),
});

// Schema para Server Actions (recibe strings de FormData)
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

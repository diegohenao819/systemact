import type { Rol } from "@/lib/constants";

export interface Profile {
  id: string;
  nombre: string;
  apellido: string;
  cedula: string | null;
  cargo: string | null;
  rol: Rol;
  id_sede: number | null;
  area: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

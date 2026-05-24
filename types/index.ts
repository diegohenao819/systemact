import type {
  ESTADOS_SOLICITUD_BAJA,
  ESTADOS_SOLICITUD_TRANSFERENCIA,
  Rol,
} from "@/lib/constants";

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

export type EstadoSolicitudTransferencia =
  (typeof ESTADOS_SOLICITUD_TRANSFERENCIA)[keyof typeof ESTADOS_SOLICITUD_TRANSFERENCIA];

export type EstadoSolicitudBaja =
  (typeof ESTADOS_SOLICITUD_BAJA)[keyof typeof ESTADOS_SOLICITUD_BAJA];

export interface SolicitudTransferencia {
  id_solicitud_transferencia: number;
  id_bien: number;
  sede_origen: number;
  area_origen: number;
  responsable_origen: string;
  sede_destino: number;
  area_destino: number;
  responsable_destino: string;
  motivo: string;
  estado: EstadoSolicitudTransferencia;
  solicitado_por: string;
  aprobado_entrega_por: string | null;
  aprobado_entrega_at: string | null;
  aprobado_recepcion_por: string | null;
  aprobado_recepcion_at: string | null;
  rechazado_por: string | null;
  rechazado_at: string | null;
  motivo_rechazo: string | null;
  created_at: string;
  updated_at: string;
}

export interface SolicitudBaja {
  id_solicitud_baja: number;
  id_bien: number;
  responsable_actual: string;
  motivo: string;
  descripcion: string | null;
  estado: EstadoSolicitudBaja;
  solicitado_por: string;
  aprobado_por: string | null;
  aprobado_at: string | null;
  rechazado_por: string | null;
  rechazado_at: string | null;
  motivo_rechazo: string | null;
  created_at: string;
  updated_at: string;
}

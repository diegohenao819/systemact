-- RLS para transferencias: lectura desde el frontend
alter table public.transferencias enable row level security;

drop policy if exists "authenticated_can_read_transferencias" on public.transferencias;
create policy "authenticated_can_read_transferencias"
on public.transferencias
for select
to authenticated
using (true);

-- RPC: registrar una transferencia
--
-- Flujo transaccional:
--   1. Bloquea la fila del bien (for update) y valida estado = ACTIVO.
--   2. Resuelve nombres de área origen/destino (snapshot en texto).
--   3. Valida que la ubicación destino sea distinta a la actual.
--   4. Inserta en `transferencias`.
--   5. Actualiza el bien con la nueva ubicación/responsable.
--   6. Inserta entrada de auditoría en `movimiento_bienes`.
--
-- Responsable destino:
--   - p_responsable_destino (uuid): si viene, se guarda en bienes.id_responsable
--     y en transferencias.responsable_destino.
--   - p_responsable_destino_texto (text): si no hay uuid pero sí texto (por ej.
--     "Desconocido" o un nombre escrito a mano), se guarda en
--     bienes.responsable_texto. transferencias.responsable_destino queda null.
create or replace function public.crear_transferencia(
  p_id_bien integer,
  p_sede_destino integer,
  p_area_destino integer,
  p_motivo text,
  p_usuario_registro uuid,
  p_responsable_destino uuid default null,
  p_responsable_destino_texto text default null
)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id_transferencia integer;
  v_sede_origen integer;
  v_area_origen integer;
  v_responsable_origen uuid;
  v_responsable_origen_texto text;
  v_estado text;
  v_codigo text;
  v_nombre_area_origen text;
  v_nombre_area_destino text;
  v_nombre_sede_destino text;
  v_responsable_texto_normalizado text;
begin
  if p_motivo is null or length(trim(p_motivo)) = 0 then
    raise exception 'El motivo es obligatorio';
  end if;

  v_responsable_texto_normalizado := nullif(trim(p_responsable_destino_texto), '');

  -- Si viene UUID, el texto se ignora (el UUID manda).
  if p_responsable_destino is not null then
    v_responsable_texto_normalizado := null;
  end if;

  -- Lock del bien y lectura del estado actual
  select b.id_sede, b.id_area, b.id_responsable, b.responsable_texto, b.estado, b.codigo_generado
    into v_sede_origen, v_area_origen, v_responsable_origen, v_responsable_origen_texto, v_estado, v_codigo
  from public.bienes as b
  where b.id_bien = p_id_bien
  for update;

  if not found then
    raise exception 'Bien no encontrado';
  end if;

  if v_estado <> 'ACTIVO' then
    raise exception 'Solo pueden transferirse bienes en estado ACTIVO';
  end if;

  -- Evitar transferencias a la misma ubicación exacta
  if v_sede_origen = p_sede_destino
     and coalesce(v_area_origen, -1) = coalesce(p_area_destino, -1)
     and coalesce(v_responsable_origen::text, '') = coalesce(p_responsable_destino::text, '')
     and coalesce(v_responsable_origen_texto, '') = coalesce(v_responsable_texto_normalizado, '') then
    raise exception 'El destino debe ser distinto a la ubicación actual';
  end if;

  -- Resolver nombres (snapshot textual en la tabla de transferencias)
  select a.nombre_area into v_nombre_area_origen
  from public.areas as a
  where a.id_area = v_area_origen;

  select a.nombre_area into v_nombre_area_destino
  from public.areas as a
  where a.id_area = p_area_destino;

  select s.nombre_sede into v_nombre_sede_destino
  from public.sedes as s
  where s.id_sede = p_sede_destino;

  if v_nombre_sede_destino is null then
    raise exception 'Sede destino no encontrada';
  end if;

  -- Insertar registro de transferencia
  insert into public.transferencias (
    id_bien,
    sede_origen,
    sede_destino,
    area_origen,
    area_destino,
    responsable_origen,
    responsable_destino,
    motivo,
    usuario_registro
  )
  values (
    p_id_bien,
    v_sede_origen,
    p_sede_destino,
    v_nombre_area_origen,
    v_nombre_area_destino,
    v_responsable_origen,
    p_responsable_destino,
    trim(p_motivo),
    p_usuario_registro
  )
  returning id_transferencia into v_id_transferencia;

  -- Aplicar cambio de ubicación sobre el bien
  update public.bienes
  set
    id_sede = p_sede_destino,
    id_area = p_area_destino,
    id_responsable = p_responsable_destino,
    responsable_texto = v_responsable_texto_normalizado,
    updated_at = now()
  where id_bien = p_id_bien;

  -- Auditoría
  insert into public.movimiento_bienes (
    id_bien,
    tipo_movimiento,
    detalle,
    usuario_responsable
  )
  values (
    p_id_bien,
    'TRANSFERENCIA',
    format(
      'Transferencia de %s: %s → %s%s',
      v_codigo,
      coalesce(v_nombre_area_origen, '(sin área)'),
      v_nombre_sede_destino,
      case
        when v_nombre_area_destino is not null
          then ' / ' || v_nombre_area_destino
        else ''
      end
    ),
    p_usuario_registro
  );

  return v_id_transferencia;
end;
$$;

grant execute on function public.crear_transferencia(
  integer,
  integer,
  integer,
  text,
  uuid,
  uuid,
  text
) to authenticated;

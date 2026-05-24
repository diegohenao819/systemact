-- Ajuste de UX/regla para transferencias:
-- - quien crea la solicitud puede cancelarla;
-- - solo el responsable destino puede aceptar o rechazar;
-- - la etapa de entrega queda implícita al crear la solicitud.

update public.solicitudes_transferencia
set
  estado = 'PENDIENTE_RECEPCION',
  aprobado_entrega_por = coalesce(aprobado_entrega_por, solicitado_por),
  aprobado_entrega_at = coalesce(aprobado_entrega_at, created_at)
where estado = 'PENDIENTE_ENTREGA';

drop policy if exists "solicitudes_transferencia_insert" on public.solicitudes_transferencia;
create policy "solicitudes_transferencia_insert"
  on public.solicitudes_transferencia for insert to authenticated
  with check (
    public.get_my_rol() in ('ADMINISTRADOR', 'ESTANDAR')
    and solicitado_por = auth.uid()
    and estado in ('PENDIENTE_ENTREGA', 'PENDIENTE_RECEPCION')
  );

create or replace function public.crear_solicitud_transferencia(
  p_id_bien integer,
  p_sede_destino integer,
  p_area_destino integer,
  p_responsable_destino uuid,
  p_motivo text,
  p_usuario_solicitante uuid
)
returns bigint
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id_solicitud bigint;
  v_sede_origen integer;
  v_area_origen integer;
  v_responsable_origen uuid;
  v_estado text;
  v_codigo text;
  v_nombre text;
  v_nombre_sede_destino text;
begin
  perform public.require_rol_escritura();

  if p_usuario_solicitante is distinct from auth.uid() then
    raise exception 'usuario_solicitante debe coincidir con el usuario autenticado'
      using errcode = '42501';
  end if;

  if p_responsable_destino is null then
    raise exception 'El responsable destino es obligatorio';
  end if;

  if p_motivo is null or length(trim(p_motivo)) = 0 then
    raise exception 'El motivo es obligatorio';
  end if;

  select b.id_sede, b.id_area, b.id_responsable, b.estado, b.codigo_generado, b.nombre
    into v_sede_origen, v_area_origen, v_responsable_origen, v_estado, v_codigo, v_nombre
  from public.bienes as b
  where b.id_bien = p_id_bien
  for update;

  if not found then
    raise exception 'Bien no encontrado';
  end if;

  if public.bien_tiene_solicitud_pendiente(p_id_bien) then
    raise exception 'El bien tiene una solicitud pendiente y está bloqueado';
  end if;

  if v_estado <> 'ACTIVO' then
    raise exception 'Solo pueden transferirse bienes en estado ACTIVO';
  end if;

  if v_responsable_origen is null then
    raise exception 'El bien debe tener un responsable registrado';
  end if;

  if v_sede_origen = p_sede_destino then
    raise exception 'Las solicitudes aplican únicamente para transferencias entre sedes';
  end if;

  select s.nombre_sede into v_nombre_sede_destino
  from public.sedes as s where s.id_sede = p_sede_destino;

  if v_nombre_sede_destino is null then
    raise exception 'Sede destino no encontrada';
  end if;

  if not exists (select 1 from public.areas a where a.id_area = p_area_destino) then
    raise exception 'Área destino no encontrada';
  end if;

  if not exists (
    select 1 from public.profiles p
    where p.id = p_responsable_destino and coalesce(p.activo, false) = true
  ) then
    raise exception 'Responsable destino no encontrado o inactivo';
  end if;

  insert into public.solicitudes_transferencia (
    id_bien,
    sede_origen,
    area_origen,
    responsable_origen,
    sede_destino,
    area_destino,
    responsable_destino,
    motivo,
    estado,
    solicitado_por,
    aprobado_entrega_por,
    aprobado_entrega_at
  )
  values (
    p_id_bien,
    v_sede_origen,
    v_area_origen,
    v_responsable_origen,
    p_sede_destino,
    p_area_destino,
    p_responsable_destino,
    trim(p_motivo),
    'PENDIENTE_RECEPCION',
    p_usuario_solicitante,
    p_usuario_solicitante,
    now()
  )
  returning id_solicitud_transferencia into v_id_solicitud;

  insert into public.movimiento_bienes (id_bien, tipo_movimiento, detalle, usuario_responsable)
  values (
    p_id_bien,
    'MODIFICACION',
    format('Solicitud de transferencia entre sedes creada para %s (%s)', v_nombre, v_codigo),
    p_usuario_solicitante
  );

  return v_id_solicitud;
end;
$$;

create or replace function public.cancelar_solicitud_transferencia(
  p_id_solicitud_transferencia bigint
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_solicitud public.solicitudes_transferencia%rowtype;
begin
  if auth.uid() is null then
    raise exception 'No autenticado' using errcode = '28000';
  end if;

  select *
    into v_solicitud
  from public.solicitudes_transferencia
  where id_solicitud_transferencia = p_id_solicitud_transferencia
  for update;

  if not found then
    raise exception 'Solicitud no encontrada';
  end if;

  if v_solicitud.estado not in ('PENDIENTE_ENTREGA', 'PENDIENTE_RECEPCION') then
    raise exception 'Solo se pueden cancelar solicitudes pendientes';
  end if;

  if v_solicitud.solicitado_por <> auth.uid() then
    raise exception 'Solo quien creó la solicitud puede cancelarla'
      using errcode = '42501';
  end if;

  update public.solicitudes_transferencia
  set
    estado = 'CANCELADA',
    rechazado_por = auth.uid(),
    rechazado_at = now(),
    motivo_rechazo = 'Cancelada por el solicitante'
  where id_solicitud_transferencia = p_id_solicitud_transferencia;

  insert into public.movimiento_bienes (id_bien, tipo_movimiento, detalle, usuario_responsable)
  values (
    v_solicitud.id_bien,
    'MODIFICACION',
    format('Solicitud de transferencia #%s cancelada por el solicitante', p_id_solicitud_transferencia),
    auth.uid()
  );
end;
$$;

create or replace function public.rechazar_solicitud_transferencia(
  p_id_solicitud_transferencia bigint,
  p_motivo_rechazo text
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_solicitud public.solicitudes_transferencia%rowtype;
begin
  if auth.uid() is null then
    raise exception 'No autenticado' using errcode = '28000';
  end if;

  if p_motivo_rechazo is null or length(trim(p_motivo_rechazo)) < 3 then
    raise exception 'El motivo de rechazo debe tener al menos 3 caracteres';
  end if;

  select *
    into v_solicitud
  from public.solicitudes_transferencia
  where id_solicitud_transferencia = p_id_solicitud_transferencia
  for update;

  if not found then
    raise exception 'Solicitud no encontrada';
  end if;

  if v_solicitud.estado <> 'PENDIENTE_RECEPCION' then
    raise exception 'Solo se pueden rechazar solicitudes pendientes de recepción';
  end if;

  if v_solicitud.responsable_destino <> auth.uid() then
    raise exception 'Solo el responsable destino puede rechazar esta solicitud'
      using errcode = '42501';
  end if;

  update public.solicitudes_transferencia
  set
    estado = 'RECHAZADA',
    rechazado_por = auth.uid(),
    rechazado_at = now(),
    motivo_rechazo = trim(p_motivo_rechazo)
  where id_solicitud_transferencia = p_id_solicitud_transferencia;

  insert into public.movimiento_bienes (id_bien, tipo_movimiento, detalle, usuario_responsable)
  values (
    v_solicitud.id_bien,
    'MODIFICACION',
    format('Solicitud de transferencia #%s rechazada: %s', p_id_solicitud_transferencia, trim(p_motivo_rechazo)),
    auth.uid()
  );
end;
$$;

grant execute on function public.cancelar_solicitud_transferencia(bigint) to authenticated;

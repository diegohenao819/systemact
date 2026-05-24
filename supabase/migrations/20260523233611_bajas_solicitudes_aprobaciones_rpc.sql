-- Iteración 3 del flujo de aprobaciones:
-- - una baja directa solo procede si quien la registra es el responsable actual;
-- - si la solicita un tercero con rol de escritura, se crea solicitud;
-- - el responsable actual aprueba o rechaza la solicitud.

drop policy if exists "solicitudes_baja_update" on public.solicitudes_baja;
create policy "solicitudes_baja_update"
  on public.solicitudes_baja for update to authenticated
  using (
    public.get_my_rol() = 'ADMINISTRADOR'
    or responsable_actual = auth.uid()
  )
  with check (
    public.get_my_rol() = 'ADMINISTRADOR'
    or responsable_actual = auth.uid()
  );

create or replace function public.crear_baja(
  p_id_bien integer,
  p_motivo text,
  p_descripcion text,
  p_usuario_registro uuid
)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id_baja integer;
  v_estado text;
  v_codigo text;
  v_nombre text;
  v_responsable_actual uuid;
  v_baja_existente integer;
  v_motivos_validos text[] := array[
    'DAÑO IRREPARABLE',
    'OBSOLESCENCIA',
    'ROBO',
    'PERDIDA',
    'DONACION',
    'VENTA',
    'OTRO'
  ];
begin
  perform public.require_rol_escritura();

  if p_usuario_registro is distinct from auth.uid() then
    raise exception 'usuario_registro debe coincidir con el usuario autenticado'
      using errcode = '42501';
  end if;

  if p_motivo is null or not (p_motivo = any(v_motivos_validos)) then
    raise exception 'Motivo inválido: %', coalesce(p_motivo, '(null)');
  end if;

  select b.estado, b.codigo_generado, b.nombre, b.id_responsable
    into v_estado, v_codigo, v_nombre, v_responsable_actual
  from public.bienes as b
  where b.id_bien = p_id_bien
  for update;

  if not found then
    raise exception 'Bien no encontrado';
  end if;

  if public.bien_tiene_solicitud_pendiente(p_id_bien) then
    raise exception 'El bien tiene una solicitud pendiente y está bloqueado';
  end if;

  if v_responsable_actual is null then
    raise exception 'El bien debe tener un responsable registrado';
  end if;

  if v_responsable_actual is distinct from auth.uid() then
    raise exception 'La baja directa solo puede registrarla el responsable actual'
      using errcode = '42501';
  end if;

  if v_estado <> 'ACTIVO' then
    raise exception 'Solo bienes en estado ACTIVO pueden darse de baja (estado actual: %)', v_estado;
  end if;

  select id_baja into v_baja_existente
  from public.bajas
  where id_bien = p_id_bien
  limit 1;

  if v_baja_existente is not null then
    raise exception 'Este bien ya tiene una baja registrada (id_baja: %)', v_baja_existente;
  end if;

  insert into public.bajas (id_bien, motivo, descripcion, usuario_registro)
  values (p_id_bien, p_motivo, nullif(trim(p_descripcion), ''), p_usuario_registro)
  returning id_baja into v_id_baja;

  update public.bienes
  set estado = 'DE BAJA', updated_at = now()
  where id_bien = p_id_bien;

  insert into public.movimiento_bienes (id_bien, tipo_movimiento, detalle, usuario_responsable)
  values (
    p_id_bien,
    'BAJA',
    format('Baja de %s (%s): %s', v_codigo, v_nombre, p_motivo),
    p_usuario_registro
  );

  return v_id_baja;
end;
$$;

create or replace function public.crear_solicitud_baja(
  p_id_bien integer,
  p_motivo text,
  p_descripcion text,
  p_usuario_solicitante uuid
)
returns bigint
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id_solicitud bigint;
  v_estado text;
  v_codigo text;
  v_nombre text;
  v_responsable_actual uuid;
  v_motivos_validos text[] := array[
    'DAÑO IRREPARABLE',
    'OBSOLESCENCIA',
    'ROBO',
    'PERDIDA',
    'DONACION',
    'VENTA',
    'OTRO'
  ];
begin
  perform public.require_rol_escritura();

  if p_usuario_solicitante is distinct from auth.uid() then
    raise exception 'usuario_solicitante debe coincidir con el usuario autenticado'
      using errcode = '42501';
  end if;

  if p_motivo is null or not (p_motivo = any(v_motivos_validos)) then
    raise exception 'Motivo inválido: %', coalesce(p_motivo, '(null)');
  end if;

  select b.estado, b.codigo_generado, b.nombre, b.id_responsable
    into v_estado, v_codigo, v_nombre, v_responsable_actual
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
    raise exception 'Solo bienes en estado ACTIVO pueden solicitar baja';
  end if;

  if v_responsable_actual is null then
    raise exception 'El bien debe tener un responsable registrado';
  end if;

  if v_responsable_actual = auth.uid() then
    raise exception 'El responsable actual debe registrar la baja directa';
  end if;

  insert into public.solicitudes_baja (
    id_bien,
    responsable_actual,
    motivo,
    descripcion,
    solicitado_por
  )
  values (
    p_id_bien,
    v_responsable_actual,
    p_motivo,
    nullif(trim(p_descripcion), ''),
    p_usuario_solicitante
  )
  returning id_solicitud_baja into v_id_solicitud;

  insert into public.movimiento_bienes (id_bien, tipo_movimiento, detalle, usuario_responsable)
  values (
    p_id_bien,
    'MODIFICACION',
    format('Solicitud de baja creada para %s (%s): %s', v_nombre, v_codigo, p_motivo),
    p_usuario_solicitante
  );

  return v_id_solicitud;
end;
$$;

create or replace function public.aprobar_solicitud_baja(
  p_id_solicitud_baja bigint
)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_solicitud public.solicitudes_baja%rowtype;
  v_id_baja integer;
  v_estado text;
  v_codigo text;
  v_nombre text;
  v_baja_existente integer;
begin
  if auth.uid() is null then
    raise exception 'No autenticado' using errcode = '28000';
  end if;

  select *
    into v_solicitud
  from public.solicitudes_baja
  where id_solicitud_baja = p_id_solicitud_baja
  for update;

  if not found then
    raise exception 'Solicitud no encontrada';
  end if;

  if v_solicitud.estado <> 'PENDIENTE_RESPONSABLE' then
    raise exception 'La solicitud no está pendiente de aprobación';
  end if;

  if v_solicitud.responsable_actual <> auth.uid() then
    raise exception 'Solo el responsable actual puede aprobar la baja'
      using errcode = '42501';
  end if;

  select b.estado, b.codigo_generado, b.nombre
    into v_estado, v_codigo, v_nombre
  from public.bienes b
  where b.id_bien = v_solicitud.id_bien
  for update;

  if not found then
    raise exception 'Bien no encontrado';
  end if;

  if v_estado <> 'ACTIVO' then
    raise exception 'Solo bienes en estado ACTIVO pueden darse de baja';
  end if;

  select id_baja into v_baja_existente
  from public.bajas
  where id_bien = v_solicitud.id_bien
  limit 1;

  if v_baja_existente is not null then
    raise exception 'Este bien ya tiene una baja registrada (id_baja: %)', v_baja_existente;
  end if;

  insert into public.bajas (id_bien, motivo, descripcion, usuario_registro)
  values (
    v_solicitud.id_bien,
    v_solicitud.motivo,
    v_solicitud.descripcion,
    auth.uid()
  )
  returning id_baja into v_id_baja;

  update public.bienes
  set estado = 'DE BAJA', updated_at = now()
  where id_bien = v_solicitud.id_bien;

  update public.solicitudes_baja
  set
    estado = 'APROBADA',
    aprobado_por = auth.uid(),
    aprobado_at = now()
  where id_solicitud_baja = p_id_solicitud_baja;

  insert into public.movimiento_bienes (id_bien, tipo_movimiento, detalle, usuario_responsable)
  values (
    v_solicitud.id_bien,
    'BAJA',
    format('Baja aprobada de %s (%s): %s', v_codigo, v_nombre, v_solicitud.motivo),
    auth.uid()
  );

  return v_id_baja;
end;
$$;

create or replace function public.rechazar_solicitud_baja(
  p_id_solicitud_baja bigint,
  p_motivo_rechazo text
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_solicitud public.solicitudes_baja%rowtype;
  v_rol text;
begin
  if auth.uid() is null then
    raise exception 'No autenticado' using errcode = '28000';
  end if;

  select rol into v_rol
  from public.profiles
  where id = auth.uid() and coalesce(activo, false) = true;

  if v_rol is null then
    raise exception 'Usuario inactivo o no encontrado' using errcode = '28000';
  end if;

  select *
    into v_solicitud
  from public.solicitudes_baja
  where id_solicitud_baja = p_id_solicitud_baja
  for update;

  if not found then
    raise exception 'Solicitud no encontrada';
  end if;

  if v_solicitud.estado <> 'PENDIENTE_RESPONSABLE' then
    raise exception 'Solo se pueden rechazar solicitudes pendientes';
  end if;

  if p_motivo_rechazo is null or length(trim(p_motivo_rechazo)) < 3 then
    raise exception 'El motivo de rechazo debe tener al menos 3 caracteres';
  end if;

  if not (v_solicitud.responsable_actual = auth.uid() or v_rol = 'ADMINISTRADOR') then
    raise exception 'No tienes permisos para rechazar esta solicitud'
      using errcode = '42501';
  end if;

  update public.solicitudes_baja
  set
    estado = 'RECHAZADA',
    rechazado_por = auth.uid(),
    rechazado_at = now(),
    motivo_rechazo = trim(p_motivo_rechazo)
  where id_solicitud_baja = p_id_solicitud_baja;

  insert into public.movimiento_bienes (id_bien, tipo_movimiento, detalle, usuario_responsable)
  values (
    v_solicitud.id_bien,
    'MODIFICACION',
    format('Solicitud de baja #%s rechazada: %s', p_id_solicitud_baja, trim(p_motivo_rechazo)),
    auth.uid()
  );
end;
$$;

grant execute on function public.crear_baja(integer, text, text, uuid) to authenticated;
grant execute on function public.crear_solicitud_baja(integer, text, text, uuid) to authenticated;
grant execute on function public.aprobar_solicitud_baja(bigint) to authenticated;
grant execute on function public.rechazar_solicitud_baja(bigint, text) to authenticated;

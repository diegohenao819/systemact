-- Iteración 2 del flujo de aprobaciones:
-- - las transferencias dentro de la misma sede siguen siendo directas;
-- - las transferencias entre sedes se convierten en solicitudes;
-- - el responsable origen aprueba entrega y el responsable destino aprueba recepción;
-- - los bienes con solicitudes pendientes quedan bloqueados para edición,
--   transferencia directa y baja.

create or replace function public.listar_bienes_con_solicitud_pendiente()
returns table(id_bien integer, tipo_solicitud text, estado text)
language sql
security definer
set search_path = public
stable
as $$
  select st.id_bien, 'TRANSFERENCIA'::text, st.estado
  from public.solicitudes_transferencia st
  where st.estado in ('PENDIENTE_ENTREGA', 'PENDIENTE_RECEPCION')
  union all
  select sb.id_bien, 'BAJA'::text, sb.estado
  from public.solicitudes_baja sb
  where sb.estado = 'PENDIENTE_RESPONSABLE';
$$;

grant execute on function public.listar_bienes_con_solicitud_pendiente() to authenticated;

drop policy if exists "solicitudes_transferencia_update" on public.solicitudes_transferencia;
create policy "solicitudes_transferencia_update"
  on public.solicitudes_transferencia for update to authenticated
  using (
    public.get_my_rol() = 'ADMINISTRADOR'
    or responsable_origen = auth.uid()
    or responsable_destino = auth.uid()
  )
  with check (
    public.get_my_rol() = 'ADMINISTRADOR'
    or responsable_origen = auth.uid()
    or responsable_destino = auth.uid()
  );

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
  v_estado text;
  v_codigo text;
  v_nombre_area_origen text;
  v_nombre_area_destino text;
  v_nombre_sede_destino text;
begin
  perform public.require_rol_escritura();

  if p_usuario_registro is distinct from auth.uid() then
    raise exception 'usuario_registro debe coincidir con el usuario autenticado'
      using errcode = '42501';
  end if;

  if p_responsable_destino is null then
    raise exception 'El responsable destino es obligatorio';
  end if;

  if p_motivo is null or length(trim(p_motivo)) = 0 then
    raise exception 'El motivo es obligatorio';
  end if;

  select b.id_sede, b.id_area, b.id_responsable, b.estado, b.codigo_generado
    into v_sede_origen, v_area_origen, v_responsable_origen, v_estado, v_codigo
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

  if v_sede_origen <> p_sede_destino then
    raise exception 'Las transferencias entre sedes requieren solicitud de aprobación';
  end if;

  if v_sede_origen = p_sede_destino
     and coalesce(v_area_origen, -1) = coalesce(p_area_destino, -1)
     and v_responsable_origen = p_responsable_destino then
    raise exception 'El destino debe ser distinto a la ubicación actual';
  end if;

  select a.nombre_area into v_nombre_area_origen
  from public.areas as a where a.id_area = v_area_origen;

  select a.nombre_area into v_nombre_area_destino
  from public.areas as a where a.id_area = p_area_destino;

  select s.nombre_sede into v_nombre_sede_destino
  from public.sedes as s where s.id_sede = p_sede_destino;

  if v_nombre_sede_destino is null then
    raise exception 'Sede destino no encontrada';
  end if;

  insert into public.transferencias (
    id_bien, sede_origen, sede_destino, area_origen, area_destino,
    responsable_origen, responsable_destino, motivo, usuario_registro
  )
  values (
    p_id_bien, v_sede_origen, p_sede_destino,
    v_nombre_area_origen, v_nombre_area_destino,
    v_responsable_origen, p_responsable_destino,
    trim(p_motivo), p_usuario_registro
  )
  returning id_transferencia into v_id_transferencia;

  update public.bienes
  set
    id_sede = p_sede_destino,
    id_area = p_area_destino,
    id_responsable = p_responsable_destino,
    responsable_texto = null,
    updated_at = now()
  where id_bien = p_id_bien;

  insert into public.movimiento_bienes (id_bien, tipo_movimiento, detalle, usuario_responsable)
  values (
    p_id_bien,
    'TRANSFERENCIA',
    format(
      'Transferencia de %s: %s → %s%s',
      v_codigo,
      coalesce(v_nombre_area_origen, '(sin área)'),
      v_nombre_sede_destino,
      case
        when v_nombre_area_destino is not null then ' / ' || v_nombre_area_destino
        else ''
      end
    ),
    p_usuario_registro
  );

  return v_id_transferencia;
end;
$$;

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
    solicitado_por
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
    p_usuario_solicitante
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

create or replace function public.aprobar_entrega_transferencia(
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
  perform public.require_rol_escritura();

  select *
    into v_solicitud
  from public.solicitudes_transferencia
  where id_solicitud_transferencia = p_id_solicitud_transferencia
  for update;

  if not found then
    raise exception 'Solicitud no encontrada';
  end if;

  if v_solicitud.estado <> 'PENDIENTE_ENTREGA' then
    raise exception 'La solicitud no está pendiente de entrega';
  end if;

  if v_solicitud.responsable_origen <> auth.uid() then
    raise exception 'Solo el responsable que entrega puede aprobar esta etapa'
      using errcode = '42501';
  end if;

  update public.solicitudes_transferencia
  set
    estado = 'PENDIENTE_RECEPCION',
    aprobado_entrega_por = auth.uid(),
    aprobado_entrega_at = now()
  where id_solicitud_transferencia = p_id_solicitud_transferencia;

  insert into public.movimiento_bienes (id_bien, tipo_movimiento, detalle, usuario_responsable)
  values (
    v_solicitud.id_bien,
    'MODIFICACION',
    format('Entrega aprobada para solicitud de transferencia #%s', p_id_solicitud_transferencia),
    auth.uid()
  );
end;
$$;

create or replace function public.aprobar_recepcion_transferencia(
  p_id_solicitud_transferencia bigint
)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_solicitud public.solicitudes_transferencia%rowtype;
  v_id_transferencia integer;
  v_estado_bien text;
  v_codigo text;
  v_nombre_area_origen text;
  v_nombre_area_destino text;
  v_nombre_sede_destino text;
begin
  perform public.require_rol_escritura();

  select *
    into v_solicitud
  from public.solicitudes_transferencia
  where id_solicitud_transferencia = p_id_solicitud_transferencia
  for update;

  if not found then
    raise exception 'Solicitud no encontrada';
  end if;

  if v_solicitud.estado <> 'PENDIENTE_RECEPCION' then
    raise exception 'La solicitud no está pendiente de recepción';
  end if;

  if v_solicitud.responsable_destino <> auth.uid() then
    raise exception 'Solo el responsable que recibe puede aprobar esta etapa'
      using errcode = '42501';
  end if;

  select b.estado, b.codigo_generado
    into v_estado_bien, v_codigo
  from public.bienes b
  where b.id_bien = v_solicitud.id_bien
  for update;

  if not found then
    raise exception 'Bien no encontrado';
  end if;

  if v_estado_bien <> 'ACTIVO' then
    raise exception 'Solo pueden transferirse bienes en estado ACTIVO';
  end if;

  select a.nombre_area into v_nombre_area_origen
  from public.areas a where a.id_area = v_solicitud.area_origen;

  select a.nombre_area into v_nombre_area_destino
  from public.areas a where a.id_area = v_solicitud.area_destino;

  select s.nombre_sede into v_nombre_sede_destino
  from public.sedes s where s.id_sede = v_solicitud.sede_destino;

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
    v_solicitud.id_bien,
    v_solicitud.sede_origen,
    v_solicitud.sede_destino,
    v_nombre_area_origen,
    v_nombre_area_destino,
    v_solicitud.responsable_origen,
    v_solicitud.responsable_destino,
    v_solicitud.motivo,
    auth.uid()
  )
  returning id_transferencia into v_id_transferencia;

  update public.bienes
  set
    id_sede = v_solicitud.sede_destino,
    id_area = v_solicitud.area_destino,
    id_responsable = v_solicitud.responsable_destino,
    responsable_texto = null,
    updated_at = now()
  where id_bien = v_solicitud.id_bien;

  update public.solicitudes_transferencia
  set
    estado = 'APROBADA',
    aprobado_recepcion_por = auth.uid(),
    aprobado_recepcion_at = now()
  where id_solicitud_transferencia = p_id_solicitud_transferencia;

  insert into public.movimiento_bienes (id_bien, tipo_movimiento, detalle, usuario_responsable)
  values (
    v_solicitud.id_bien,
    'TRANSFERENCIA',
    format(
      'Transferencia aprobada de %s: %s → %s%s',
      v_codigo,
      coalesce(v_nombre_area_origen, '(sin área)'),
      v_nombre_sede_destino,
      case
        when v_nombre_area_destino is not null then ' / ' || v_nombre_area_destino
        else ''
      end
    ),
    auth.uid()
  );

  return v_id_transferencia;
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
  from public.solicitudes_transferencia
  where id_solicitud_transferencia = p_id_solicitud_transferencia
  for update;

  if not found then
    raise exception 'Solicitud no encontrada';
  end if;

  if v_solicitud.estado not in ('PENDIENTE_ENTREGA', 'PENDIENTE_RECEPCION') then
    raise exception 'Solo se pueden rechazar solicitudes pendientes';
  end if;

  if p_motivo_rechazo is null or length(trim(p_motivo_rechazo)) < 3 then
    raise exception 'El motivo de rechazo debe tener al menos 3 caracteres';
  end if;

  if not (
    (v_solicitud.estado = 'PENDIENTE_ENTREGA' and v_solicitud.responsable_origen = auth.uid())
    or (v_solicitud.estado = 'PENDIENTE_RECEPCION' and v_solicitud.responsable_destino = auth.uid())
    or v_rol = 'ADMINISTRADOR'
  ) then
    raise exception 'No tienes permisos para rechazar esta solicitud'
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

grant execute on function public.crear_solicitud_transferencia(integer, integer, integer, uuid, text, uuid) to authenticated;
grant execute on function public.aprobar_entrega_transferencia(bigint) to authenticated;
grant execute on function public.aprobar_recepcion_transferencia(bigint) to authenticated;
grant execute on function public.rechazar_solicitud_transferencia(bigint, text) to authenticated;

create or replace function public.actualizar_bien_con_auditoria(
  p_id_bien integer,
  p_nombre text,
  p_id_caracteristica integer,
  p_id_sede integer,
  p_id_area integer,
  p_id_responsable uuid,
  p_responsable_texto text,
  p_serial text,
  p_placa text,
  p_cantidad integer,
  p_valor_unitario numeric,
  p_estado text,
  p_observaciones text,
  p_usuario_responsable uuid,
  p_imagen_url text default null
)
returns void
language plpgsql
set search_path to 'public'
as $$
declare
  v_rows_updated integer;
begin
  perform public.require_rol_escritura();

  if public.bien_tiene_solicitud_pendiente(p_id_bien) then
    raise exception 'El bien tiene una solicitud pendiente y está bloqueado';
  end if;

  if p_id_responsable is null then
    raise exception 'El responsable es obligatorio';
  end if;

  update public.bienes
  set
    nombre = p_nombre,
    id_caracteristica = p_id_caracteristica,
    id_sede = p_id_sede,
    id_area = p_id_area,
    id_responsable = p_id_responsable,
    responsable_texto = null,
    serial = nullif(trim(p_serial), ''),
    placa = nullif(trim(p_placa), ''),
    cantidad = p_cantidad,
    valor_unitario = p_valor_unitario,
    estado = p_estado,
    observaciones = nullif(trim(p_observaciones), ''),
    imagen_url = nullif(trim(p_imagen_url), ''),
    updated_at = now()
  where bienes.id_bien = p_id_bien;

  get diagnostics v_rows_updated = row_count;
  if v_rows_updated = 0 then
    raise exception 'Bien no encontrado';
  end if;

  insert into public.movimiento_bienes (id_bien, tipo_movimiento, detalle, usuario_responsable)
  values (
    p_id_bien,
    'MODIFICACION',
    format('Bien modificado: %s', p_nombre),
    p_usuario_responsable
  );
end;
$$;

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
  perform public.require_rol_admin();

  if p_usuario_registro is distinct from auth.uid() then
    raise exception 'usuario_registro debe coincidir con el usuario autenticado'
      using errcode = '42501';
  end if;

  if p_motivo is null or not (p_motivo = any(v_motivos_validos)) then
    raise exception 'Motivo inválido: %', coalesce(p_motivo, '(null)');
  end if;

  select b.estado, b.codigo_generado, b.nombre
    into v_estado, v_codigo, v_nombre
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

grant execute on function public.crear_baja(integer, text, text, uuid) to authenticated;

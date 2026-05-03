-- Re-creación de los 3 RPCs existentes añadiendo validación de rol al inicio.
-- Firmas idénticas a las actuales — ningún caller del frontend cambia.

create or replace function public.crear_bien_con_auditoria(
  p_nombre text,
  p_id_caracteristica integer,
  p_id_sede integer,
  p_id_area integer,
  p_id_responsable uuid default null,
  p_responsable_texto text default null,
  p_serial text default null,
  p_placa text default null,
  p_cantidad integer default 1,
  p_valor_unitario numeric default 0,
  p_estado text default 'ACTIVO',
  p_observaciones text default null,
  p_usuario_responsable uuid default null,
  p_imagen_url text default null
)
returns table(id_bien integer, codigo_generado text)
language plpgsql
set search_path to 'public'
as $function$
declare
  v_prefijo text;
begin
  perform public.require_rol_escritura();

  select c.codigo
  into v_prefijo
  from public.caracteristicas as c
  where c.id_caracteristica = p_id_caracteristica;

  if v_prefijo is null then
    raise exception 'Tipo de bien no encontrado';
  end if;

  select public.generar_codigo_bien(v_prefijo)
  into codigo_generado;

  insert into public.bienes (
    codigo_generado,
    nombre,
    id_caracteristica,
    id_sede,
    id_area,
    id_responsable,
    responsable_texto,
    serial,
    placa,
    cantidad,
    valor_unitario,
    estado,
    observaciones,
    imagen_url
  )
  values (
    codigo_generado,
    p_nombre,
    p_id_caracteristica,
    p_id_sede,
    p_id_area,
    p_id_responsable,
    case
      when p_id_responsable is null then nullif(trim(p_responsable_texto), '')
      else null
    end,
    nullif(trim(p_serial), ''),
    nullif(trim(p_placa), ''),
    p_cantidad,
    p_valor_unitario,
    p_estado,
    nullif(trim(p_observaciones), ''),
    nullif(trim(p_imagen_url), '')
  )
  returning bienes.id_bien, bienes.codigo_generado
  into id_bien, codigo_generado;

  insert into public.movimiento_bienes (
    id_bien,
    tipo_movimiento,
    detalle,
    usuario_responsable
  )
  values (
    id_bien,
    'REGISTRO',
    format('Bien registrado: %s (%s)', p_nombre, codigo_generado),
    p_usuario_responsable
  );

  return next;
end;
$function$;


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
as $function$
declare
  v_rows_updated integer;
begin
  perform public.require_rol_escritura();

  update public.bienes
  set
    nombre = p_nombre,
    id_caracteristica = p_id_caracteristica,
    id_sede = p_id_sede,
    id_area = p_id_area,
    id_responsable = p_id_responsable,
    responsable_texto = case
      when p_id_responsable is null then nullif(trim(p_responsable_texto), '')
      else null
    end,
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

  insert into public.movimiento_bienes (
    id_bien,
    tipo_movimiento,
    detalle,
    usuario_responsable
  )
  values (
    p_id_bien,
    'MODIFICACION',
    format('Bien modificado: %s', p_nombre),
    p_usuario_responsable
  );
end;
$function$;


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
  perform public.require_rol_escritura();

  if p_motivo is null or length(trim(p_motivo)) = 0 then
    raise exception 'El motivo es obligatorio';
  end if;

  v_responsable_texto_normalizado := nullif(trim(p_responsable_destino_texto), '');

  if p_responsable_destino is not null then
    v_responsable_texto_normalizado := null;
  end if;

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

  if v_sede_origen = p_sede_destino
     and coalesce(v_area_origen, -1) = coalesce(p_area_destino, -1)
     and coalesce(v_responsable_origen::text, '') = coalesce(p_responsable_destino::text, '')
     and coalesce(v_responsable_origen_texto, '') = coalesce(v_responsable_texto_normalizado, '') then
    raise exception 'El destino debe ser distinto a la ubicación actual';
  end if;

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

  update public.bienes
  set
    id_sede = p_sede_destino,
    id_area = p_area_destino,
    id_responsable = p_responsable_destino,
    responsable_texto = v_responsable_texto_normalizado,
    updated_at = now()
  where id_bien = p_id_bien;

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

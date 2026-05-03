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
  p_usuario_responsable uuid default null
)
returns table (id_bien integer, codigo_generado text)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_prefijo text;
begin
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
    observaciones
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
    nullif(trim(p_observaciones), '')
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
$$;

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
  p_usuario_responsable uuid
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_rows_updated integer;
begin
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
$$;

grant execute on function public.crear_bien_con_auditoria(
  text,
  integer,
  integer,
  integer,
  uuid,
  text,
  text,
  text,
  integer,
  numeric,
  text,
  text,
  uuid
) to authenticated;

grant execute on function public.actualizar_bien_con_auditoria(
  integer,
  text,
  integer,
  integer,
  integer,
  uuid,
  text,
  text,
  text,
  integer,
  numeric,
  text,
  text,
  uuid
) to authenticated;

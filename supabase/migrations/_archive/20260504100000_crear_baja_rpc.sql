-- RPC para registrar la baja de un bien.
--
-- Reglas:
--   1. Solo ADMINISTRADOR (require_rol_admin).
--   2. p_usuario_registro debe coincidir con auth.uid() (no se puede falsificar
--      el autor de la baja desde un caller manipulado).
--   3. Lock del bien con `select … for update`.
--   4. Bien debe estar en estado ACTIVO.
--   5. No puede haber ya una baja registrada para ese mismo bien.
--   6. Motivo válido (CHECK ya en la tabla, pero validamos antes para mejor mensaje).
--
-- Efectos transaccionales:
--   - INSERT en bajas con motivo, descripción, usuario_registro.
--   - UPDATE bienes.estado = 'DE BAJA' + updated_at.
--   - INSERT en movimiento_bienes con tipo_movimiento = 'BAJA'.
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

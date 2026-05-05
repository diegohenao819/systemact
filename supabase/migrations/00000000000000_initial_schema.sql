-- ═══════════════════════════════════════════════════════════════════════════
-- SYSTEMACT — Esquema base
-- ═══════════════════════════════════════════════════════════════════════════
-- Migración inicial idempotente. Crea todo el esquema desde cero en un
-- proyecto Supabase nuevo: tablas, secuencias, FKs, RLS, RPCs, triggers,
-- bucket de Storage. Es seguro re-ejecutarla sobre una BD existente.
--
-- Para inicializar un proyecto nuevo:
--   1. supabase db reset            (aplica esta migración)
--   2. supabase db seed             (carga datos de ejemplo desde seed.sql)
--   3. Registra el primer usuario desde la app y promuévelo manualmente:
--        update profiles set rol = 'ADMINISTRADOR' where id = '<uuid>';
-- ═══════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────
-- 1. FUNCIONES UTILITARIAS BASE
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- Genera códigos automáticos en el formato PREFIJO-AÑO-CORRELATIVO
-- (por ejemplo COMP-2026-001 para una computadora). El correlativo
-- toma el siguiente disponible dentro del prefijo y año.
create or replace function public.generar_codigo_bien(prefijo text)
returns text
language plpgsql
as $$
declare
  anio text;
  siguiente integer;
  codigo text;
begin
  anio := extract(year from now())::text;

  select coalesce(max(
    cast(split_part(codigo_generado, '-', 3) as integer)
  ), 0) + 1
  into siguiente
  from public.bienes
  where codigo_generado like prefijo || '-' || anio || '-%';

  codigo := prefijo || '-' || anio || '-' || lpad(siguiente::text, 3, '0');
  return codigo;
end;
$$;


-- ─────────────────────────────────────────────────────────────────────────
-- 2. TABLAS (en orden de dependencia)
-- ─────────────────────────────────────────────────────────────────────────

-- Sedes ─ ubicaciones físicas
create table if not exists public.sedes (
  id_sede     serial primary key,
  nombre_sede text not null unique,
  abreviatura text,
  ciudad      text,
  direccion   text,
  created_at  timestamptz default now()
);
comment on table public.sedes is 'Ubicaciones físicas donde opera Conviventia';


-- Áreas ─ ramas organizacionales
create table if not exists public.areas (
  id_area     serial primary key,
  nombre_area text not null unique,
  estado      text default 'ACTIVO' check (estado in ('ACTIVO', 'INACTIVO')),
  created_at  timestamptz default now()
);
comment on table public.areas is 'Ramas organizacionales de Conviventia (GAF, Focos, etc.)';


-- Características ─ catálogo de tipos de bienes con prefijos
create table if not exists public.caracteristicas (
  id_caracteristica serial primary key,
  codigo            text not null unique,
  descripcion       text not null,
  imagen_url        text,
  observaciones     text,
  created_at        timestamptz default now()
);
comment on table public.caracteristicas is 'Catálogo de tipos de bienes con prefijos para código automático';


-- Profiles ─ datos del empleado vinculados a auth.users
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nombre      text not null default '',
  apellido    text not null default '',
  cedula      text unique,
  cargo       text,
  rol         text not null default 'CONSULTOR'
              check (rol in ('ADMINISTRADOR', 'ESTANDAR', 'CONSULTOR')),
  id_sede     integer references public.sedes(id_sede),
  area        text,
  activo      boolean default true,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
comment on table public.profiles is 'Datos del empleado vinculados a auth.users via FK';


-- Bienes ─ entidad principal del inventario
create table if not exists public.bienes (
  id_bien            serial primary key,
  codigo_generado    text not null unique,
  nombre             text not null,
  id_caracteristica  integer references public.caracteristicas(id_caracteristica),
  id_responsable     uuid    references public.profiles(id),
  id_sede            integer not null references public.sedes(id_sede),
  id_area            integer references public.areas(id_area),
  serial             text,
  placa              text unique,
  cantidad           integer not null default 1 check (cantidad > 0),
  valor_unitario     numeric(15, 2) not null default 0,
  valor_total        numeric(15, 2) generated always as (cantidad::numeric * valor_unitario) stored,
  estado             text not null default 'ACTIVO'
                     check (estado in ('ACTIVO', 'INACTIVO', 'DE BAJA')),
  imagen_url         text,
  observaciones      text,
  responsable_texto  text,
  fecha_registro     timestamptz default now(),
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);
comment on table  public.bienes is 'Entidad principal: todos los activos físicos del inventario';
comment on column public.bienes.codigo_generado   is 'Código automático formato: PREFIJO-AÑO-CORRELATIVO (ej: COMP-2026-001)';
comment on column public.bienes.responsable_texto is 'Nombre del responsable cuando no está registrado en profiles';
comment on column public.bienes.valor_total       is 'Columna calculada: cantidad * valor_unitario';


-- Transferencias ─ movimientos entre sedes/áreas/responsables
create table if not exists public.transferencias (
  id_transferencia    serial primary key,
  id_bien             integer not null references public.bienes(id_bien),
  sede_origen         integer not null references public.sedes(id_sede),
  sede_destino        integer not null references public.sedes(id_sede),
  area_origen         text,
  area_destino        text,
  responsable_origen  uuid references public.profiles(id),
  responsable_destino uuid references public.profiles(id),
  motivo              text not null,
  usuario_registro    uuid not null references public.profiles(id),
  created_at          timestamptz default now()
);
comment on table public.transferencias is 'Movimientos de bienes entre sedes, áreas o responsables';


-- Bajas ─ registro de bienes retirados del inventario
create table if not exists public.bajas (
  id_baja          serial primary key,
  id_bien          integer not null references public.bienes(id_bien),
  motivo           text not null check (motivo in (
                     'DAÑO IRREPARABLE',
                     'OBSOLESCENCIA',
                     'ROBO',
                     'PERDIDA',
                     'DONACION',
                     'VENTA',
                     'OTRO'
                   )),
  descripcion      text,
  usuario_registro uuid not null references public.profiles(id),
  created_at       timestamptz default now()
);
comment on table public.bajas is 'Registro de bienes dados de baja del inventario (Soft Delete)';


-- Movimiento de bienes ─ log de auditoría
create table if not exists public.movimiento_bienes (
  id_movimiento       serial primary key,
  id_bien             integer not null references public.bienes(id_bien),
  tipo_movimiento     text not null check (tipo_movimiento in (
                        'REGISTRO',
                        'TRANSFERENCIA',
                        'BAJA',
                        'MODIFICACION'
                      )),
  detalle             text,
  usuario_responsable uuid not null references public.profiles(id),
  created_at          timestamptz default now()
);
comment on table public.movimiento_bienes is 'Log de auditoría: registra todas las acciones sobre cada bien';


-- Keepalive ─ tabla auxiliar para evitar que Supabase pause el proyecto
create table if not exists public.keepalive (
  id        bigserial primary key,
  pinged_at timestamptz not null default now()
);


-- ─────────────────────────────────────────────────────────────────────────
-- 3. TRIGGERS — actualización automática de `updated_at`
-- ─────────────────────────────────────────────────────────────────────────

drop trigger if exists set_updated_at_bienes   on public.bienes;
create trigger set_updated_at_bienes
  before update on public.bienes
  for each row execute function public.handle_updated_at();

drop trigger if exists set_updated_at_profiles on public.profiles;
create trigger set_updated_at_profiles
  before update on public.profiles
  for each row execute function public.handle_updated_at();


-- ─────────────────────────────────────────────────────────────────────────
-- 4. SINCRONIZACIÓN auth.users → profiles
-- ─────────────────────────────────────────────────────────────────────────
-- Cada vez que Supabase Auth crea un usuario, se inserta automáticamente
-- una fila en `profiles` con rol `CONSULTOR` (mínimos privilegios). El
-- primer admin se promueve manualmente con un UPDATE en SQL.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, nombre, apellido, rol)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nombre', ''),
    coalesce(new.raw_user_meta_data ->> 'apellido', ''),
    coalesce(new.raw_user_meta_data ->> 'rol', 'CONSULTOR')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ─────────────────────────────────────────────────────────────────────────
-- 5. HELPERS DE ROL — usados por RLS y RPCs
-- ─────────────────────────────────────────────────────────────────────────

-- Devuelve el rol del usuario autenticado (security definer para que pueda
-- ser invocado desde políticas RLS sin recursividad).
create or replace function public.get_my_rol()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select rol from public.profiles where id = auth.uid();
$$;

-- Devuelve la sede del usuario autenticado.
create or replace function public.get_my_sede()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select id_sede from public.profiles where id = auth.uid();
$$;

-- Versión "amigable" que llama el cliente cuando necesita su rol actual.
create or replace function public.current_user_rol()
returns text
language sql
stable
security invoker
set search_path = public
as $$
  select rol from public.profiles where id = auth.uid()
$$;
grant execute on function public.current_user_rol() to authenticated;

-- Lanza excepción si el caller no tiene permiso de escritura
-- (ADMIN o ESTANDAR) y está activo.
create or replace function public.require_rol_escritura()
returns void
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_rol text;
  v_activo boolean;
begin
  select rol, activo into v_rol, v_activo
  from public.profiles where id = auth.uid();

  if v_rol is null then
    raise exception 'No autenticado' using errcode = '28000';
  end if;
  if not coalesce(v_activo, false) then
    raise exception 'Usuario inactivo' using errcode = '28000';
  end if;
  if v_rol not in ('ADMINISTRADOR', 'ESTANDAR') then
    raise exception 'Tu rol (%) no permite esta acción', v_rol using errcode = '42501';
  end if;
end;
$$;

-- Lanza excepción si el caller no es ADMINISTRADOR activo.
create or replace function public.require_rol_admin()
returns void
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_rol text;
  v_activo boolean;
begin
  select rol, activo into v_rol, v_activo
  from public.profiles where id = auth.uid();

  if v_rol is null then
    raise exception 'No autenticado' using errcode = '28000';
  end if;
  if not coalesce(v_activo, false) then
    raise exception 'Usuario inactivo' using errcode = '28000';
  end if;
  if v_rol <> 'ADMINISTRADOR' then
    raise exception 'Solo administradores pueden ejecutar esta acción' using errcode = '42501';
  end if;
end;
$$;


-- ─────────────────────────────────────────────────────────────────────────
-- 6. RPCs PRINCIPALES — todas validan rol antes de tocar datos
-- ─────────────────────────────────────────────────────────────────────────

-- Crea un bien y registra el evento en el log de auditoría.
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
as $$
declare
  v_prefijo text;
begin
  perform public.require_rol_escritura();

  select c.codigo into v_prefijo
  from public.caracteristicas as c
  where c.id_caracteristica = p_id_caracteristica;

  if v_prefijo is null then
    raise exception 'Tipo de bien no encontrado';
  end if;

  select public.generar_codigo_bien(v_prefijo) into codigo_generado;

  insert into public.bienes (
    codigo_generado, nombre, id_caracteristica, id_sede, id_area,
    id_responsable, responsable_texto, serial, placa, cantidad,
    valor_unitario, estado, observaciones, imagen_url
  )
  values (
    codigo_generado, p_nombre, p_id_caracteristica, p_id_sede, p_id_area,
    p_id_responsable,
    case when p_id_responsable is null then nullif(trim(p_responsable_texto), '') else null end,
    nullif(trim(p_serial), ''),
    nullif(trim(p_placa), ''),
    p_cantidad, p_valor_unitario, p_estado,
    nullif(trim(p_observaciones), ''),
    nullif(trim(p_imagen_url), '')
  )
  returning bienes.id_bien, bienes.codigo_generado
  into id_bien, codigo_generado;

  insert into public.movimiento_bienes (id_bien, tipo_movimiento, detalle, usuario_responsable)
  values (
    id_bien,
    'REGISTRO',
    format('Bien registrado: %s (%s)', p_nombre, codigo_generado),
    p_usuario_responsable
  );

  return next;
end;
$$;


-- Modifica un bien y registra el evento.
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

  insert into public.movimiento_bienes (id_bien, tipo_movimiento, detalle, usuario_responsable)
  values (
    p_id_bien,
    'MODIFICACION',
    format('Bien modificado: %s', p_nombre),
    p_usuario_responsable
  );
end;
$$;


-- Registra una transferencia (cambio de sede/área/responsable) atómicamente.
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
    responsable_texto = v_responsable_texto_normalizado,
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


-- Registra la baja de un bien (irreversible). Solo ADMIN.
-- Garantiza que p_usuario_registro = auth.uid() (no se puede falsificar autor).
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


-- ── Gestión de usuarios (solo ADMIN) ─────────────────────────────────────

create or replace function public.actualizar_rol_usuario(
  p_id uuid,
  p_nuevo_rol text
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_rol_actual text;
  v_es_activo boolean;
  v_admins_restantes integer;
begin
  perform public.require_rol_admin();

  if p_nuevo_rol not in ('ADMINISTRADOR', 'ESTANDAR', 'CONSULTOR') then
    raise exception 'Rol inválido: %', p_nuevo_rol;
  end if;

  select rol, activo into v_rol_actual, v_es_activo
  from public.profiles where id = p_id;

  if v_rol_actual is null then
    raise exception 'Usuario no encontrado';
  end if;

  if v_rol_actual = p_nuevo_rol then return; end if;

  if v_rol_actual = 'ADMINISTRADOR' and coalesce(v_es_activo, false)
     and p_nuevo_rol <> 'ADMINISTRADOR' then
    select count(*) into v_admins_restantes
    from public.profiles
    where rol = 'ADMINISTRADOR' and activo = true and id <> p_id;

    if v_admins_restantes = 0 then
      raise exception 'No se puede dejar el sistema sin administradores activos';
    end if;
  end if;

  update public.profiles set rol = p_nuevo_rol, updated_at = now() where id = p_id;
end;
$$;
grant execute on function public.actualizar_rol_usuario(uuid, text) to authenticated;


create or replace function public.set_usuario_activo(
  p_id uuid,
  p_activo boolean
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_rol_actual text;
  v_activo_actual boolean;
  v_admins_restantes integer;
begin
  perform public.require_rol_admin();

  select rol, activo into v_rol_actual, v_activo_actual
  from public.profiles where id = p_id;

  if v_rol_actual is null then
    raise exception 'Usuario no encontrado';
  end if;

  if coalesce(v_activo_actual, false) = coalesce(p_activo, false) then return; end if;

  if v_rol_actual = 'ADMINISTRADOR' and coalesce(v_activo_actual, false)
     and p_activo = false then
    select count(*) into v_admins_restantes
    from public.profiles
    where rol = 'ADMINISTRADOR' and activo = true and id <> p_id;

    if v_admins_restantes = 0 then
      raise exception 'No se puede desactivar al último administrador activo';
    end if;
  end if;

  update public.profiles set activo = p_activo, updated_at = now() where id = p_id;
end;
$$;
grant execute on function public.set_usuario_activo(uuid, boolean) to authenticated;


-- Lista usuarios incluyendo email de auth.users (security definer + validación
-- de rol al inicio + grants restringidos a authenticated).
create or replace function public.listar_usuarios_admin()
returns table (
  id uuid,
  email text,
  nombre text,
  apellido text,
  cedula text,
  cargo text,
  rol text,
  id_sede integer,
  nombre_sede text,
  area text,
  activo boolean,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.require_rol_admin();

  return query
  select
    p.id, u.email::text,
    p.nombre, p.apellido, p.cedula, p.cargo, p.rol,
    p.id_sede, s.nombre_sede, p.area,
    p.activo, p.created_at, p.updated_at
  from public.profiles p
  join auth.users u on u.id = p.id
  left join public.sedes s on s.id_sede = p.id_sede
  order by p.created_at asc;
end;
$$;
revoke execute on function public.listar_usuarios_admin() from public;
revoke execute on function public.listar_usuarios_admin() from anon;
grant  execute on function public.listar_usuarios_admin() to authenticated;


-- ─────────────────────────────────────────────────────────────────────────
-- 7. RLS — habilitar y declarar políticas
-- ─────────────────────────────────────────────────────────────────────────

alter table public.sedes             enable row level security;
alter table public.areas             enable row level security;
alter table public.caracteristicas   enable row level security;
alter table public.profiles          enable row level security;
alter table public.bienes            enable row level security;
alter table public.transferencias    enable row level security;
alter table public.bajas             enable row level security;
alter table public.movimiento_bienes enable row level security;
alter table public.keepalive         enable row level security;


-- Sedes: lectura libre, escritura solo admin (vía RPCs con require_rol_admin).
drop policy if exists "sedes_select_all"   on public.sedes;
drop policy if exists "sedes_insert_admin" on public.sedes;
drop policy if exists "sedes_update_admin" on public.sedes;
create policy "sedes_select_all"   on public.sedes for select to authenticated using (true);
create policy "sedes_insert_admin" on public.sedes for insert to authenticated with check (public.get_my_rol() = 'ADMINISTRADOR');
create policy "sedes_update_admin" on public.sedes for update to authenticated using       (public.get_my_rol() = 'ADMINISTRADOR');


-- Áreas: igual que sedes
drop policy if exists "areas_select_all"   on public.areas;
drop policy if exists "areas_insert_admin" on public.areas;
drop policy if exists "areas_update_admin" on public.areas;
create policy "areas_select_all"   on public.areas for select to authenticated using (true);
create policy "areas_insert_admin" on public.areas for insert to authenticated with check (public.get_my_rol() = 'ADMINISTRADOR');
create policy "areas_update_admin" on public.areas for update to authenticated using       (public.get_my_rol() = 'ADMINISTRADOR');


-- Características: lectura libre, escritura ADMIN o ESTANDAR
drop policy if exists "caracteristicas_select_all" on public.caracteristicas;
drop policy if exists "caracteristicas_insert"     on public.caracteristicas;
drop policy if exists "caracteristicas_update"     on public.caracteristicas;
create policy "caracteristicas_select_all" on public.caracteristicas for select to authenticated using (true);
create policy "caracteristicas_insert"     on public.caracteristicas for insert to authenticated with check (public.get_my_rol() in ('ADMINISTRADOR', 'ESTANDAR'));
create policy "caracteristicas_update"     on public.caracteristicas for update to authenticated using       (public.get_my_rol() in ('ADMINISTRADOR', 'ESTANDAR'));


-- Profiles: lectura libre para autenticados (necesario para resolver
-- responsables en las pantallas), escritura propia o admin.
drop policy if exists "authenticated_can_read_profiles" on public.profiles;
drop policy if exists "profiles_select_own"             on public.profiles;
drop policy if exists "profiles_insert_admin"           on public.profiles;
drop policy if exists "profiles_update_own"             on public.profiles;
create policy "authenticated_can_read_profiles" on public.profiles for select to authenticated using (true);
create policy "profiles_insert_admin"           on public.profiles for insert to authenticated with check (public.get_my_rol() = 'ADMINISTRADOR');
create policy "profiles_update_own"             on public.profiles for update to authenticated
  using       (id = auth.uid() or public.get_my_rol() = 'ADMINISTRADOR')
  with check  (id = auth.uid() or public.get_my_rol() = 'ADMINISTRADOR');


-- Bienes: lectura libre para autenticados (CONSULTOR puede ver el inventario),
-- escritura ADMIN o ESTANDAR (los RPCs validan también).
drop policy if exists "bienes_select" on public.bienes;
drop policy if exists "bienes_insert" on public.bienes;
drop policy if exists "bienes_update" on public.bienes;
create policy "bienes_select" on public.bienes for select to authenticated using (true);
create policy "bienes_insert" on public.bienes for insert to authenticated with check (public.get_my_rol() in ('ADMINISTRADOR', 'ESTANDAR'));
create policy "bienes_update" on public.bienes for update to authenticated using       (public.get_my_rol() in ('ADMINISTRADOR', 'ESTANDAR'));


-- Transferencias: lectura libre (CONSULTOR puede consultar),
-- escritura solo vía RPC `crear_transferencia`.
drop policy if exists "transferencias_select"       on public.transferencias;
drop policy if exists "transferencias_insert_admin" on public.transferencias;
create policy "transferencias_select"       on public.transferencias for select to authenticated using (true);
create policy "transferencias_insert_admin" on public.transferencias for insert to authenticated with check (public.get_my_rol() in ('ADMINISTRADOR', 'ESTANDAR'));


-- Bajas: lectura libre, escritura solo admin (vía futuro RPC `crear_baja`).
drop policy if exists "bajas_select"       on public.bajas;
drop policy if exists "bajas_insert_admin" on public.bajas;
create policy "bajas_select"       on public.bajas for select to authenticated using (true);
create policy "bajas_insert_admin" on public.bajas for insert to authenticated with check (public.get_my_rol() = 'ADMINISTRADOR');


-- Movimientos: lectura libre (timeline en /inicio + historial),
-- inserts solo vía RPCs `security invoker` que ya validan rol.
drop policy if exists "movimientos_select" on public.movimiento_bienes;
drop policy if exists "movimientos_insert" on public.movimiento_bienes;
create policy "movimientos_select" on public.movimiento_bienes for select to authenticated using (true);
create policy "movimientos_insert" on public.movimiento_bienes for insert to authenticated with check (true);


-- Keepalive: solo el job pg_cron escribe; lectura abierta no aporta valor.
-- Sin policies → ningún rol puede leer/escribir directamente.


-- ─────────────────────────────────────────────────────────────────────────
-- 8. STORAGE — bucket de imágenes de bienes
-- ─────────────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'bienes',
  'bienes',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;


-- Lectura pública (URLs directas a las imágenes); escritura solo autenticados.
drop policy if exists "bienes_public_read"           on storage.objects;
drop policy if exists "bienes_authenticated_insert"  on storage.objects;
drop policy if exists "bienes_authenticated_update"  on storage.objects;
drop policy if exists "bienes_authenticated_delete"  on storage.objects;

create policy "bienes_public_read"
  on storage.objects for select to public
  using (bucket_id = 'bienes');

create policy "bienes_authenticated_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'bienes');

create policy "bienes_authenticated_update"
  on storage.objects for update to authenticated
  using       (bucket_id = 'bienes')
  with check  (bucket_id = 'bienes');

create policy "bienes_authenticated_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'bienes');

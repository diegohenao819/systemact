-- Iteración 1 del flujo de aprobaciones:
-- - deja de permitir responsables ambiguos en nuevos cambios de bienes;
-- - crea las tablas base para solicitudes de transferencia y baja;
-- - añade un helper para detectar bienes bloqueados por solicitudes pendientes.

comment on column public.bienes.responsable_texto is
  'Campo legacy. Los nuevos flujos usan exclusivamente bienes.id_responsable.';

alter table public.bienes
  add constraint bienes_responsable_usuario_required
  check (id_responsable is not null)
  not valid;

alter table public.bienes
  add constraint bienes_responsable_texto_legacy_empty
  check (responsable_texto is null)
  not valid;

create table if not exists public.solicitudes_transferencia (
  id_solicitud_transferencia bigserial primary key,
  id_bien integer not null references public.bienes(id_bien),
  sede_origen integer not null references public.sedes(id_sede),
  area_origen integer references public.areas(id_area),
  responsable_origen uuid not null references public.profiles(id),
  sede_destino integer not null references public.sedes(id_sede),
  area_destino integer not null references public.areas(id_area),
  responsable_destino uuid not null references public.profiles(id),
  motivo text not null,
  estado text not null default 'PENDIENTE_ENTREGA'
    check (estado in (
      'PENDIENTE_ENTREGA',
      'PENDIENTE_RECEPCION',
      'APROBADA',
      'RECHAZADA',
      'CANCELADA'
    )),
  solicitado_por uuid not null references public.profiles(id),
  aprobado_entrega_por uuid references public.profiles(id),
  aprobado_entrega_at timestamptz,
  aprobado_recepcion_por uuid references public.profiles(id),
  aprobado_recepcion_at timestamptz,
  rechazado_por uuid references public.profiles(id),
  rechazado_at timestamptz,
  motivo_rechazo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.solicitudes_transferencia is
  'Solicitudes de transferencia entre sedes. El movimiento real se ejecuta solo después de las aprobaciones requeridas.';

create table if not exists public.solicitudes_baja (
  id_solicitud_baja bigserial primary key,
  id_bien integer not null references public.bienes(id_bien),
  responsable_actual uuid not null references public.profiles(id),
  motivo text not null check (motivo in (
    'DAÑO IRREPARABLE',
    'OBSOLESCENCIA',
    'ROBO',
    'PERDIDA',
    'DONACION',
    'VENTA',
    'OTRO'
  )),
  descripcion text,
  estado text not null default 'PENDIENTE_RESPONSABLE'
    check (estado in (
      'PENDIENTE_RESPONSABLE',
      'APROBADA',
      'RECHAZADA',
      'CANCELADA'
    )),
  solicitado_por uuid not null references public.profiles(id),
  aprobado_por uuid references public.profiles(id),
  aprobado_at timestamptz,
  rechazado_por uuid references public.profiles(id),
  rechazado_at timestamptz,
  motivo_rechazo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.solicitudes_baja is
  'Solicitudes de baja cuando la baja la solicita alguien distinto del responsable actual.';

create unique index if not exists solicitudes_transferencia_unica_pendiente
  on public.solicitudes_transferencia (id_bien)
  where estado in ('PENDIENTE_ENTREGA', 'PENDIENTE_RECEPCION');

create unique index if not exists solicitudes_baja_unica_pendiente
  on public.solicitudes_baja (id_bien)
  where estado = 'PENDIENTE_RESPONSABLE';

create index if not exists solicitudes_transferencia_responsable_origen_idx
  on public.solicitudes_transferencia (responsable_origen, estado, created_at desc);

create index if not exists solicitudes_transferencia_responsable_destino_idx
  on public.solicitudes_transferencia (responsable_destino, estado, created_at desc);

create index if not exists solicitudes_transferencia_solicitado_por_idx
  on public.solicitudes_transferencia (solicitado_por, estado, created_at desc);

create index if not exists solicitudes_baja_responsable_actual_idx
  on public.solicitudes_baja (responsable_actual, estado, created_at desc);

create index if not exists solicitudes_baja_solicitado_por_idx
  on public.solicitudes_baja (solicitado_por, estado, created_at desc);

drop trigger if exists solicitudes_transferencia_updated_at on public.solicitudes_transferencia;
create trigger solicitudes_transferencia_updated_at
  before update on public.solicitudes_transferencia
  for each row execute function public.handle_updated_at();

drop trigger if exists solicitudes_baja_updated_at on public.solicitudes_baja;
create trigger solicitudes_baja_updated_at
  before update on public.solicitudes_baja
  for each row execute function public.handle_updated_at();

alter table public.solicitudes_transferencia enable row level security;
alter table public.solicitudes_baja enable row level security;

drop policy if exists "solicitudes_transferencia_select" on public.solicitudes_transferencia;
create policy "solicitudes_transferencia_select"
  on public.solicitudes_transferencia for select to authenticated
  using (
    public.get_my_rol() = 'ADMINISTRADOR'
    or solicitado_por = auth.uid()
    or responsable_origen = auth.uid()
    or responsable_destino = auth.uid()
  );

drop policy if exists "solicitudes_transferencia_insert" on public.solicitudes_transferencia;
create policy "solicitudes_transferencia_insert"
  on public.solicitudes_transferencia for insert to authenticated
  with check (
    public.get_my_rol() in ('ADMINISTRADOR', 'ESTANDAR')
    and solicitado_por = auth.uid()
    and estado = 'PENDIENTE_ENTREGA'
  );

drop policy if exists "solicitudes_baja_select" on public.solicitudes_baja;
create policy "solicitudes_baja_select"
  on public.solicitudes_baja for select to authenticated
  using (
    public.get_my_rol() = 'ADMINISTRADOR'
    or solicitado_por = auth.uid()
    or responsable_actual = auth.uid()
  );

drop policy if exists "solicitudes_baja_insert" on public.solicitudes_baja;
create policy "solicitudes_baja_insert"
  on public.solicitudes_baja for insert to authenticated
  with check (
    public.get_my_rol() in ('ADMINISTRADOR', 'ESTANDAR')
    and solicitado_por = auth.uid()
    and estado = 'PENDIENTE_RESPONSABLE'
  );

create or replace function public.bien_tiene_solicitud_pendiente(p_id_bien integer)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.solicitudes_transferencia st
    where st.id_bien = p_id_bien
      and st.estado in ('PENDIENTE_ENTREGA', 'PENDIENTE_RECEPCION')
  )
  or exists (
    select 1
    from public.solicitudes_baja sb
    where sb.id_bien = p_id_bien
      and sb.estado = 'PENDIENTE_RESPONSABLE'
  );
$$;

grant execute on function public.bien_tiene_solicitud_pendiente(integer) to authenticated;

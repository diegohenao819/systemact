alter table public.bienes enable row level security;
alter table public.sedes enable row level security;
alter table public.areas enable row level security;
alter table public.caracteristicas enable row level security;
alter table public.profiles enable row level security;

drop policy if exists "authenticated_can_read_bienes" on public.bienes;
create policy "authenticated_can_read_bienes"
on public.bienes
for select
to authenticated
using (true);

drop policy if exists "authenticated_can_read_sedes" on public.sedes;
create policy "authenticated_can_read_sedes"
on public.sedes
for select
to authenticated
using (true);

drop policy if exists "authenticated_can_read_areas" on public.areas;
create policy "authenticated_can_read_areas"
on public.areas
for select
to authenticated
using (true);

drop policy if exists "authenticated_can_read_caracteristicas" on public.caracteristicas;
create policy "authenticated_can_read_caracteristicas"
on public.caracteristicas
for select
to authenticated
using (true);

drop policy if exists "authenticated_can_read_profiles_basic" on public.profiles;
create policy "authenticated_can_read_profiles_basic"
on public.profiles
for select
to authenticated
using (true);

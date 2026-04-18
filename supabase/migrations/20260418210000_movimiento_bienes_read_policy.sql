-- ============================================================
-- RLS para movimiento_bienes: lectura por autenticados
-- ============================================================

alter table public.movimiento_bienes enable row level security;

drop policy if exists "authenticated_can_read_movimiento_bienes"
  on public.movimiento_bienes;

create policy "authenticated_can_read_movimiento_bienes"
on public.movimiento_bienes
for select
to authenticated
using (true);

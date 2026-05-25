-- Permite que los usuarios con rol de escritura completen transferencias
-- aprobadas desde el flujo de solicitudes. El RPC de aprobación ya valida que
-- quien ejecuta sea el responsable destino.

drop policy if exists "transferencias_insert_admin" on public.transferencias;
create policy "transferencias_insert_admin"
  on public.transferencias for insert to authenticated
  with check (public.get_my_rol() in ('ADMINISTRADOR', 'ESTANDAR'));

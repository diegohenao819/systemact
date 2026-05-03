-- La policy `bienes_select` original restringía a CONSULTOR a ver solo los
-- bienes de los que es responsable, y a ESTANDAR a su sede. Para el módulo de
-- consulta del plan original, todo usuario autenticado debe poder leer los
-- bienes (la escritura sigue restringida por bienes_update + RPCs con
-- require_rol_escritura).
drop policy if exists "bienes_select" on public.bienes;

create policy "bienes_select"
on public.bienes
for select
to authenticated
using (true);

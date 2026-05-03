-- RPC para listar usuarios desde el módulo /usuarios.
-- Usa security definer porque necesita leer auth.users.email, pero valida que
-- el caller sea ADMINISTRADOR activo antes de devolver datos.
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
    p.id,
    u.email::text,
    p.nombre,
    p.apellido,
    p.cedula,
    p.cargo,
    p.rol,
    p.id_sede,
    s.nombre_sede,
    p.area,
    p.activo,
    p.created_at,
    p.updated_at
  from public.profiles p
  join auth.users u on u.id = p.id
  left join public.sedes s on s.id_sede = p.id_sede
  order by p.created_at asc;
end;
$$;

grant execute on function public.listar_usuarios_admin() to authenticated;

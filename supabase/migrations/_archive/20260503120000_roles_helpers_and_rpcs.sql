-- Helpers de rol + RPCs de gestión de usuarios + RLS de profiles
--
-- Crea tres helpers reutilizables (current_user_rol, require_rol_escritura,
-- require_rol_admin), dos RPCs para administrar usuarios desde /usuarios
-- (actualizar_rol_usuario, set_usuario_activo) y abre la lectura de profiles
-- a usuarios autenticados.

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

  if v_rol_actual = p_nuevo_rol then
    return;
  end if;

  if v_rol_actual = 'ADMINISTRADOR' and coalesce(v_es_activo, false)
     and p_nuevo_rol <> 'ADMINISTRADOR' then
    select count(*) into v_admins_restantes
    from public.profiles
    where rol = 'ADMINISTRADOR' and activo = true and id <> p_id;

    if v_admins_restantes = 0 then
      raise exception 'No se puede dejar el sistema sin administradores activos';
    end if;
  end if;

  update public.profiles
  set rol = p_nuevo_rol, updated_at = now()
  where id = p_id;
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

  if coalesce(v_activo_actual, false) = coalesce(p_activo, false) then
    return;
  end if;

  if v_rol_actual = 'ADMINISTRADOR' and coalesce(v_activo_actual, false)
     and p_activo = false then
    select count(*) into v_admins_restantes
    from public.profiles
    where rol = 'ADMINISTRADOR' and activo = true and id <> p_id;

    if v_admins_restantes = 0 then
      raise exception 'No se puede desactivar al último administrador activo';
    end if;
  end if;

  update public.profiles
  set activo = p_activo, updated_at = now()
  where id = p_id;
end;
$$;

grant execute on function public.set_usuario_activo(uuid, boolean) to authenticated;

drop policy if exists "authenticated_can_read_profiles" on public.profiles;
create policy "authenticated_can_read_profiles"
on public.profiles
for select
to authenticated
using (true);

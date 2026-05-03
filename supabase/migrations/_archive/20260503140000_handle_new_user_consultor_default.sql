-- Cambia el rol por defecto en handle_new_user de ADMINISTRADOR a CONSULTOR.
-- Antes: cualquier registro nuevo entraba con permisos totales — riesgo
-- evidente para un proyecto open source.
-- Ahora: nuevos usuarios entran en modo lectura. Un admin existente los
-- promueve desde /usuarios.
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

-- listar_usuarios_admin es SECURITY DEFINER porque lee auth.users.email.
-- El RPC ya valida que el caller sea admin, pero por higiene quitamos el
-- EXECUTE que Postgres concede a public por default y lo dejamos solo en
-- authenticated.
revoke execute on function public.listar_usuarios_admin() from public;
revoke execute on function public.listar_usuarios_admin() from anon;
grant execute on function public.listar_usuarios_admin() to authenticated;

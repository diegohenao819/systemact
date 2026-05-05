# Archivo histórico de migraciones

Estos archivos documentan los cambios incrementales aplicados al esquema durante el desarrollo del proyecto. **No se ejecutan** en un `supabase db reset` — todo su contenido ya está consolidado en `../00000000000000_initial_schema.sql`.

Se conservan como referencia para entender la evolución del esquema.

| Archivo | Cambio |
|---------|--------|
| `20260311123000_bienes_auditoria_rpc.sql` | Primer RPC `crear_bien_con_auditoria` con auditoría a `movimiento_bienes` |
| `20260311142000_read_policies_bienes_catalogos.sql` | RLS de lectura sobre catálogos (sedes/áreas/características) |
| `20260418200000_bienes_imagen_storage.sql` | Bucket `bienes` en Storage + parámetro `p_imagen_url` en RPCs |
| `20260418210000_movimiento_bienes_read_policy.sql` | Lectura de `movimiento_bienes` para timeline en `/inicio` |
| `20260418220000_transferencias_rpc.sql` | RPC `crear_transferencia` |
| `20260503120000_roles_helpers_and_rpcs.sql` | Helpers `current_user_rol`, `require_rol_*`, RPCs de gestión de usuarios |
| `20260503121000_rpcs_existentes_validacion_rol.sql` | Validación de rol en `crear_bien`, `actualizar_bien`, `crear_transferencia` |
| `20260503122000_listar_usuarios_admin_rpc.sql` | RPC `listar_usuarios_admin` (lee `auth.users.email`) |
| `20260503123000_revoke_listar_usuarios_admin_public.sql` | Revoca EXECUTE de `public`/`anon` |
| `20260503130000_bienes_lectura_abierta.sql` | Apertura de lectura de `bienes` a todos los autenticados |
| `20260503140000_handle_new_user_consultor_default.sql` | `handle_new_user` ahora crea perfiles con rol `CONSULTOR` por default (antes `ADMINISTRADOR`) |
| `20260504100000_crear_baja_rpc.sql` | RPC `crear_baja` — registra baja transaccional con auditoría, valida ADMIN y `usuario_registro = auth.uid()` |

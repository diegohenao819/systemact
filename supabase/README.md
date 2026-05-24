# SYSTEMACT — Capa de base de datos

Todo el esquema, las funciones, las RLS y los buckets de Storage viven en este directorio. Un clone limpio del repo puede levantar el backend completo con un par de comandos.

## Estructura

```
supabase/
├── config.toml                # Config del CLI local (puertos, auth, schemas)
├── seed.sql                   # Datos de ejemplo (sedes, áreas, tipos de bien)
├── migrations/
│   ├── 00000000000000_initial_schema.sql   # Esquema completo (tablas, RLS, RPCs, trigger, storage)
│   ├── 20260523*_*.sql       # Solicitudes/aprobaciones y ajustes posteriores
│   └── _archive/              # Historial de migraciones incrementales (referencia, no se ejecuta)
└── README.md                  # Este archivo
```

El archivo `00000000000000_initial_schema.sql` contiene la base inicial del sistema. Las migraciones posteriores agregan el flujo de solicitudes/aprobaciones para transferencias y bajas. Para levantar el backend completo, se aplican todas las migraciones en orden.

## Arrancar desde cero

### Pre-requisitos

- [Node.js 20+](https://nodejs.org/)
- [Supabase CLI](https://supabase.com/docs/guides/cli/getting-started) (`npm install -g supabase` o `scoop install supabase`)
- Docker Desktop si vas a correr Supabase localmente.

### Opción 1 — proyecto local (Docker)

```bash
# Desde la raíz del repo
supabase start              # levanta Postgres, Auth, Studio, Storage en local
supabase db reset           # aplica la migración inicial + carga seed.sql
```

Studio queda en `http://127.0.0.1:54323`. La app Next.js apuntará a `http://127.0.0.1:54321` por las variables `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` que el CLI imprime al iniciar.

### Opción 2 — proyecto en Supabase Cloud

```bash
supabase login
supabase link --project-ref <tu-project-ref>
supabase db push            # aplica la migración inicial al proyecto remoto

# Cargar el seed manualmente (db push no carga seeds):
psql "$DATABASE_URL" -f supabase/seed.sql
```

`<tu-project-ref>` está en la URL del dashboard de Supabase: `https://supabase.com/dashboard/project/<ref>`.

## Crear el primer administrador

`handle_new_user` (trigger en `auth.users`) crea automáticamente el perfil con rol `CONSULTOR` para cada nuevo registro. Esto es seguro por defecto: nadie puede escribir hasta que un admin lo promueva.

Como el primer registro no tiene a quién promoverlo, se hace manualmente:

1. Registra tu usuario desde la app (`/auth/sign-up`).
2. En Studio (o vía `psql`), ejecuta:
   ```sql
   update public.profiles
   set rol = 'ADMINISTRADOR'
   where id = (select id from auth.users where email = 'tu-correo@dominio.com');
   ```
3. Cierra sesión y entra de nuevo. Vas a ver el módulo `/usuarios` en el sidebar y desde ahí puedes promover/desactivar al resto del equipo.

## Modelo de roles

| Rol            | Lectura                          | Escritura inventario | Bajas | Catálogos (sedes/áreas) | Usuarios |
|----------------|----------------------------------|----------------------|-------|-------------------------|----------|
| `ADMINISTRADOR`| Todo                             | ✓                    | ✓ / solicita si no es responsable | ✓                       | ✓        |
| `ESTANDAR`     | Todo                             | ✓                    | ✓ / solicita si no es responsable | ✗                       | ✗        |
| `CONSULTOR`    | Todo (modo lectura)              | ✗                    | ✗     | ✗                       | ✗        |

### Reglas de solicitudes y bloqueo

- Todo bien debe tener `id_responsable`; `responsable_texto` queda como campo legacy y no se usa en nuevos flujos.
- Las transferencias dentro de la misma sede se ejecutan inmediatamente con `crear_transferencia`.
- Las transferencias entre sedes crean `solicitudes_transferencia`. Quien crea la solicitud puede cancelarla; el responsable destino puede aceptar o rechazar. Mientras esté pendiente, `bien_tiene_solicitud_pendiente(id_bien)` bloquea edición, transferencia directa y baja.
- Las bajas se registran directamente solo si quien las solicita es el responsable actual. Si las solicita otro usuario con rol de escritura, se crea `solicitudes_baja` y el responsable actual aprueba o rechaza.
- Los usuarios `ESTANDAR` solo ven solicitudes donde participan; `ADMINISTRADOR` ve todas.

Las restricciones se aplican en tres capas:
1. **RLS** sobre cada tabla (frontera de la BD).
2. **RPCs `security invoker`** que llaman `require_rol_escritura()` o `require_rol_admin()` antes de tocar datos.
3. **Server actions** y **guards de página** (`requireRol`) en Next.js — defensa en profundidad y mejor UX.

## Hacer cambios al esquema

```bash
# Crea una migración nueva
supabase migration new nombre_descriptivo

# Edita el archivo SQL que se generó en supabase/migrations/
# Aplica al proyecto local:
supabase db reset

# Cuando quede listo, push al remoto:
supabase db push
```

Los archivos en `_archive/` no se vuelven a ejecutar — son sólo memoria histórica de cómo fue evolucionando el esquema durante el desarrollo inicial. Las migraciones fuera de `_archive/` sí son parte del esquema actual.

## Catálogos cargados por el seed

- **4 sedes** de ejemplo (Bogotá, Medellín, Cali, Barranquilla).
- **6 áreas** organizacionales (GAF, Focos, Tecnología, Talento Humano, Comunicaciones, Dirección).
- **9 tipos de bien** con prefijos para los códigos automáticos (`COMP`, `PORT`, `MON`, `IMP`, `MOB`, `VID`, `TEL`, `RED`, `OTRO`).

Si tu organización tiene otras sedes/áreas, edita `seed.sql` antes del primer `supabase db reset`. Después de eso, los cambios se hacen desde `/sedes` y `/areas` con la cuenta de admin.

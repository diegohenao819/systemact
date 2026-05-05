# AGENTS.md — SYSTEMACT Conviventia

> Este archivo es la fuente de verdad para cualquier agente de IA (Claude Code, Cursor, Copilot, etc.) que trabaje en este repositorio. Léelo completo antes de generar código.

---

## 1. Visión General del Proyecto

**SYSTEMACT** es un sistema de gestión de inventario de recursos físicos para la organización **Conviventia** (ONG colombiana). Migración desde un sistema legacy en PHP/MySQL hacia un stack moderno.

| Aspecto | Detalle |
|---------|---------|
| Tipo | Aplicación web interna (no pública) |
| Usuarios objetivo | ~20-50 empleados internos de Conviventia |
| Idioma de la UI | Español (Colombia) |
| Zona horaria | America/Bogota (UTC-5) |
| Moneda | COP (Peso colombiano), sin decimales en display |

---

## 2. Stack Tecnológico

```
Frontend:    Next.js 15 (App Router) + React 19 + TypeScript strict
Estilos:     TailwindCSS + shadcn/ui + lucide-react
Formularios: React Hook Form + Zod
Tablas:      TanStack Table v8
Gráficos:    Recharts
Toasts:      Sonner
Backend:     Supabase (BaaS)
BD:          PostgreSQL 15 (vía Supabase)
Auth:        Supabase Auth (email/password + JWT en cookies HTTP-only)
Storage:     Supabase Storage (imágenes de bienes)
Deploy:      Vercel (frontend) + Supabase Cloud (backend)
```

### Versiones Mínimas

- Node.js >= 20
- TypeScript >= 5.0

### Lo que NO se usa (aunque se considere "obvio")

- **No hay React Query / TanStack Query** — todas las lecturas son Server Components, no hace falta cliente de cache.
- **No hay Zustand ni otro store global** — el estado de UI vive en `useState` local; el estado del servidor lo maneja Next.js con cache + `revalidatePath`.
- **No hay API Routes para mutaciones** — todas las mutaciones son Server Actions. La excepción actual es `app/api/export/*`, usado como Route Handlers de solo lectura para descargar archivos `.xlsx`.

---

## 3. Estructura del Proyecto

```
systemact/
├── app/
│   ├── auth/                    # Rutas públicas (login, sign-up, recuperación)
│   ├── (dashboard)/             # Grupo de rutas protegidas (requiere sesión)
│   │   ├── layout.tsx           # Sidebar + navbar; carga el rol del usuario
│   │   ├── inicio/              # Dashboard con KPIs, timeline, chart por sede
│   │   ├── bienes/
│   │   │   ├── page.tsx         # Listado con TanStack Table
│   │   │   ├── nuevo/page.tsx   # Form de creación (guard WRITE_ROLES)
│   │   │   ├── [id]/page.tsx    # Form de edición  (guard WRITE_ROLES)
│   │   │   ├── bienes-table.tsx
│   │   │   ├── bien-form.tsx
│   │   │   ├── bien-detail-dialog.tsx
│   │   │   └── actions.ts       # Server actions: crearBien, actualizarBien
│   │   ├── sedes/               # CRUD inline con dialog (admin only para escribir)
│   │   ├── areas/               # CRUD inline (admin only)
│   │   ├── usuarios/            # Gestión de roles + activar/desactivar (ADMIN)
│   │   ├── categorias/          # CRUD de tipos de bien/prefijos (admin only para escribir)
│   │   ├── transferencias/
│   │   │   ├── page.tsx
│   │   │   ├── nueva/page.tsx
│   │   │   └── ...
│   │   ├── bajas/               # Bajas con confirmación doble (ADMIN)
│   │   ├── historial/           # Timeline por bien + exportación a Excel
│   │   └── reportes/            # Inventario por persona + exportación a Excel
│   ├── api/
│   │   └── export/              # Route Handlers de descarga .xlsx (bienes, reportes, historial)
│   ├── layout.tsx
│   └── page.tsx                 # Portada pública con login/sign-up
├── components/
│   ├── ui/                      # shadcn/ui (no editar manualmente)
│   ├── layout/                  # Sidebar, Navbar, MobileSidebar
│   └── *-form.tsx               # Componentes de auth (login, sign-up, etc.)
├── lib/
│   ├── auth/
│   │   └── require-rol.ts       # getAuthContext() y requireRol() para guards
│   ├── export/
│   │   └── excel.ts             # Helpers ExcelJS: estilos, formato COP, headers de descarga
│   ├── supabase/
│   │   ├── client.ts            # createBrowserClient (componentes cliente)
│   │   ├── server.ts            # createServerClient (server components / actions)
│   │   └── proxy.ts             # Helper para el middleware (refresh de sesión)
│   ├── validations/             # Esquemas Zod por entidad
│   │   ├── bien.ts
│   │   ├── sede.ts
│   │   ├── area.ts
│   │   ├── baja.ts
│   │   ├── categoria.ts
│   │   └── transferencia.ts
│   ├── constants.ts             # ROLES, ESTADOS_BIEN, MOTIVOS_BAJA, NAV_GROUPS
│   └── utils.ts                 # cn() y helpers genéricos
├── types/
│   └── index.ts                 # Tipos de dominio compartidos
├── supabase/
│   ├── migrations/
│   │   ├── 00000000000000_initial_schema.sql   # Baseline completo
│   │   └── _archive/                           # Historial (no se ejecuta)
│   ├── seed.sql                 # Sedes, áreas, tipos de bien
│   ├── config.toml              # Config del Supabase CLI
│   └── README.md                # Setup detallado de la BD
├── middleware.ts                # Refresca sesión en cada request
├── documentation/
│   └── CHANGELOG.md
├── README.md
├── AGENTS.md
└── .env.example                 # Template (.env.local va al gitignore)
```

---

## 4. Esquema de Base de Datos (PostgreSQL / Supabase)

> ⚠️ Toda la verdad del esquema vive en `supabase/migrations/00000000000000_initial_schema.sql`. Este resumen es para orientación rápida.

### 4.1. `profiles` (extiende `auth.users`)

```sql
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nombre      text not null default '',
  apellido    text not null default '',
  cedula      text unique,                      -- nullable
  cargo       text,
  rol         text not null default 'CONSULTOR'
              check (rol in ('ADMINISTRADOR', 'ESTANDAR', 'CONSULTOR')),
  id_sede     integer references public.sedes(id_sede),
  area        text,
  activo      boolean default true,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
```

`handle_new_user` (trigger en `auth.users`) crea el perfil automáticamente con rol `CONSULTOR`.

### 4.2. `sedes`, `areas`, `caracteristicas`

Catálogos. `caracteristicas.codigo` es el prefijo para los códigos automáticos de bien (`COMP`, `PORT`, etc.).

### 4.3. `bienes` (entidad principal)

- `codigo_generado` se genera vía `generar_codigo_bien(prefijo)` con formato `PREFIJO-AÑO-CORRELATIVO` (ej: `COMP-2026-001`).
- `valor_total` es columna **GENERATED** (`cantidad * valor_unitario`) — nunca se envía desde el cliente.
- `estado` ∈ `{'ACTIVO', 'INACTIVO', 'DE BAJA'}`.
- `responsable_texto` se usa cuando el responsable no está en `profiles`.
- `imagen_url` apunta al bucket `bienes` de Storage.

### 4.4. `transferencias`, `bajas`, `movimiento_bienes`

- **`transferencias`**: snapshot del cambio de ubicación. `area_origen` / `area_destino` son `text` (no FK) para mantener historial legible.
- **`bajas`**: registro irreversible. `motivo` con CHECK constraint a la lista de tipos (DAÑO IRREPARABLE, OBSOLESCENCIA, etc.).
- **`movimiento_bienes`**: log de auditoría con `tipo_movimiento` ∈ `{'REGISTRO', 'TRANSFERENCIA', 'BAJA', 'MODIFICACION'}`. Lo escriben los RPCs, no se inserta directo desde la app.

### 4.5. Funciones / RPCs

| Función | Tipo | Caller | Propósito |
|---------|------|--------|-----------|
| `handle_updated_at` | trigger | Postgres | Actualiza `updated_at` en `bienes` y `profiles` |
| `handle_new_user` | trigger en `auth.users` | Postgres | Crea `profiles` row al registrarse un usuario |
| `generar_codigo_bien` | helper | RPCs internos | Calcula correlativo para un prefijo |
| `get_my_rol` / `get_my_sede` | helper (security definer) | RLS policies | Evita recursividad al consultar el rol |
| `current_user_rol` | helper (security invoker) | Frontend | Lo llama el cliente para conocer su rol |
| `require_rol_escritura` | guard | RPCs | `raise exception` si no es ADMIN/ESTANDAR activo |
| `require_rol_admin` | guard | RPCs | `raise exception` si no es ADMIN activo |
| `crear_bien_con_auditoria` | RPC | Server action | Crea bien + log; valida rol escritura |
| `actualizar_bien_con_auditoria` | RPC | Server action | Modifica bien + log |
| `crear_transferencia` | RPC | Server action | Cambio de ubicación atómico (lock + log) |
| `actualizar_rol_usuario` | RPC | Server action | Solo ADMIN. Protege "último admin activo" |
| `set_usuario_activo` | RPC | Server action | Solo ADMIN. Protege "último admin activo" |
| `listar_usuarios_admin` | RPC (security definer) | Server component | Lista usuarios con email de `auth.users`. EXECUTE revocado de `public`/`anon` |

---

## 5. Autenticación y Autorización

### 5.1. Flujo de Auth

1. Login con email/password vía `supabase.auth.signInWithPassword()`.
2. Supabase devuelve JWT y lo guarda en cookies HTTP-only (manejado por `@supabase/ssr`).
3. El middleware (`middleware.ts` en raíz, helper en `lib/supabase/proxy.ts`) refresca la sesión en cada request.
4. El rol se obtiene de `profiles.rol` asociado al `user.id` cuando se necesita (typically en el layout del dashboard o en `getAuthContext`).

### 5.2. Roles

| Rol             | Lectura          | Escritura inventario | Transferencias | Bajas | Catálogos (sedes/áreas) | Usuarios |
|-----------------|------------------|----------------------|----------------|-------|-------------------------|----------|
| `ADMINISTRADOR` | Todo             | ✓                    | ✓              | ✓     | ✓                       | ✓        |
| `ESTANDAR`      | Todo             | ✓                    | ✓              | ✗     | ✗                       | ✗        |
| `CONSULTOR`     | Todo (read-only) | ✗                    | ✗              | ✗     | ✗                       | ✗        |

El control de acceso se aplica en **tres capas coordinadas**:

1. **RLS sobre cada tabla** — frontera de la BD. Las policies usan `get_my_rol()` (security definer) para evaluar el rol del caller.
2. **RPCs `security invoker`** — `crear_bien_con_auditoria`, `actualizar_bien_con_auditoria`, `crear_transferencia` llaman `perform require_rol_escritura()` antes de tocar datos. Las RPCs de gestión de usuarios llaman `require_rol_admin()`.
3. **Guards de página y server actions** en Next.js — `requireRol(roles)` en server components, validación `ctx.rol !== ROLES.ADMINISTRADOR` en server actions, renderizado condicional de botones por rol.

### 5.3. Helper de guard en server components

```typescript
// app/(dashboard)/bajas/page.tsx
import { requireRol, ADMIN_ONLY } from "@/lib/auth/require-rol";

export default async function BajasPage() {
  const ctx = await requireRol(ADMIN_ONLY);
  // si el usuario no es ADMIN, requireRol ya hizo redirect("/inicio")
  // ctx.rol, ctx.userId, ctx.email disponibles para server actions
}
```

Para páginas que cualquiera puede ver pero condicionan UI por rol, usar `getAuthContext()` en lugar de `requireRol()`:

```typescript
const ctx = await getAuthContext();
const canWrite = ctx.rol === ROLES.ADMINISTRADOR || ctx.rol === ROLES.ESTANDAR;
return <>{canWrite && <Button>Nuevo</Button>}</>;
```

### 5.4. Middleware de protección

`middleware.ts` (raíz) usa `lib/supabase/proxy.ts` para refrescar la sesión en cada request a rutas no públicas. Las rutas en `app/auth/*` son públicas; el resto exige sesión activa. Si no hay sesión, las páginas dentro de `(dashboard)` redirigen a `/auth/login` desde su propio loader.

### 5.5. RLS obligatorio

**Toda tabla en `public` tiene RLS habilitado.** Nunca desactivar RLS ni usar `service_role` key en el cliente. La `service_role` solo se usa en Server Actions o Route Handlers cuando es estrictamente necesario — actualmente el proyecto no la usa.

### 5.6. Bootstrap del primer admin

`handle_new_user` (trigger en `auth.users`) crea perfiles con rol `CONSULTOR` por defecto. El primer admin se promueve manualmente:

```sql
update public.profiles
set rol = 'ADMINISTRADOR'
where id = (select id from auth.users where email = 'admin@dominio.com');
```

Después de eso, los demás usuarios se gestionan desde `/usuarios`.

### 5.7. Protección de "último admin activo"

`actualizar_rol_usuario` y `set_usuario_activo` validan en BD que la operación no deje el sistema sin admins activos. Esto previene que un único admin se quite el rol o se desactive accidentalmente y bloquee toda la administración del sistema.

---

## 6. Convenciones de Código

### 6.1. TypeScript

- **Strict mode** siempre habilitado.
- Nunca usar `any`. Preferir `unknown` si el tipo no se conoce.
- Interfaces para objetos de dominio, types para unions/aliases.
- Si en el futuro se generan tipos con `supabase gen types typescript`, el archivo va a `types/database.types.ts`. Hoy no existen — se tipan a mano cuando hace falta.

### 6.2. Nombres

| Elemento | Convención | Ejemplo |
|----------|-----------|---------|
| Archivos/carpetas | kebab-case | `nuevo-bien.tsx` |
| Componentes React | PascalCase | `BienForm.tsx` → `export function BienForm()` |
| Hooks | camelCase con "use" | `useBienes()` |
| Variables/funciones | camelCase | `valorTotal`, `calcularTotal()` |
| Tipos/Interfaces | PascalCase | `Bien`, `CreateBienInput` |
| Constantes | UPPER_SNAKE_CASE | `ESTADOS_BIEN`, `MOTIVOS_BAJA` |
| Tablas BD | snake_case plural | `bienes`, `transferencias` |
| Columnas BD | snake_case | `id_bien`, `valor_unitario` |
| Rutas URL | kebab-case | `/bienes/nuevo`, `/reportes/costo-sede` |

### 6.3. Componentes

- Usar **Server Components** por defecto. Agregar `"use client"` solo cuando sea necesario (interactividad, hooks de estado, event handlers).
- Un componente por archivo.
- Props tipadas siempre con interface.
- Usar named exports: `export function BienCard()`. Solo se usa `export default` cuando lo exige Next.js (page, layout).

### 6.4. Data Fetching

- **Server Components**: fetch directamente con el Supabase server client (`lib/supabase/server`). Es el patrón usado en todo el proyecto.
- **Mutaciones**: Server Actions (`"use server"`) que llaman RPCs.
- **No usar React Query** — el proyecto no lo necesita. Si en el futuro un componente cliente necesita reaccionar a cambios sin recargar la página, evaluar Supabase Realtime antes de añadir una capa de cache cliente.
- Encapsular queries complejas en funciones de `lib/`. Componentes de página solo hacen el fetch top-level y pasan datos a hijos.

### 6.5. Formularios

```typescript
// Patrón estándar
// 1. Schema Zod en lib/validations/[entidad].ts
// 2. React Hook Form con zodResolver en el componente cliente
// 3. Server Action con validación Zod del FormData (defensa en profundidad)
// 4. revalidatePath() tras mutación exitosa
// 5. toast con Sonner para feedback al usuario
```

### 6.6. Manejo de Errores

- Siempre usar try/catch en Server Actions.
- Retornar objetos `{ success: boolean, error?: string, data?: T }`.
- Mostrar errores al usuario con Sonner toast.
- Nunca exponer mensajes internos de Supabase al usuario final.
- Loggear errores en consola del servidor.

---

## 7. Reglas de Negocio Críticas

Estas reglas deben respetarse siempre, independientemente del módulo.

### 7.1. Bienes

- El **código** se genera automáticamente: `{PREFIJO}-{AÑO}-{CORRELATIVO_3_DIGITOS}` (ej: `COMP-2026-001`). La función `generar_codigo_bien(prefijo)` en BD lo calcula.
- El **valor_total** es columna `GENERATED` en Postgres. En el frontend se muestra en tiempo real para feedback, pero no se envía al servidor.
- La **placa** es única cuando se proporciona. Puede ser nula.
- El **responsable** puede ser un UUID de `profiles`, texto libre en `responsable_texto`, o nulo.
- Un bien **nunca se elimina** físicamente. Se cambia su estado a `DE BAJA` (Soft Delete).
- Las **imágenes** se suben directo del cliente al bucket `bienes` con nombre `{crypto.randomUUID()}.{ext}` (evita el límite de 4.5 MB de Server Actions en Vercel).

### 7.2. Transferencias

- No se puede transferir un bien a su **misma ubicación** (misma sede + misma área + mismo responsable).
- Solo bienes en estado **ACTIVO** pueden transferirse.
- Toda la lógica vive en el RPC `crear_transferencia` (`security invoker`, transaccional con `select … for update`). El server action sólo valida entradas y llama al RPC.
- Los campos `area_origen` / `area_destino` son `text` (snapshot del nombre del área), no FKs. El RPC los resuelve desde `areas.nombre_area` para mantener historial legible aunque se renombre un área.
- El responsable destino acepta tres modos: UUID de `profiles`, texto libre (se guarda en `bienes.responsable_texto`), o sentinel `"Desconocido"`.

### 7.3. Bajas

- Solo bienes en estado **ACTIVO** pueden darse de baja.
- Solo `ADMINISTRADOR` puede ejecutar bajas.
- Al confirmar la baja: cambiar estado del bien a `DE BAJA` + insertar en `bajas` + insertar en `movimiento_bienes`. **Todo en una transacción** (futuro RPC `crear_baja`).
- Por su carácter irreversible, el formulario debe tener confirmación adicional (modal con mensaje explícito antes de submit).

### 7.4. Auditoría (`movimiento_bienes`)

Cada vez que ocurre algo sobre un bien, se inserta un registro:

| Acción | tipo_movimiento | Detalle (formato sugerido) |
|--------|----------------|----------------------------|
| Se crea un bien | `REGISTRO` | `Bien registrado: {nombre} ({codigo})` |
| Se transfiere | `TRANSFERENCIA` | `Transferencia de {codigo}: {area_origen} → {sede_destino} / {area_destino}` |
| Se da de baja | `BAJA` | `Baja por: {motivo}` |
| Se edita info | `MODIFICACION` | `Bien modificado: {nombre}` |

> **Patrón actual**: la auditoría se hace dentro de cada RPC (`crear_bien_con_auditoria`, etc.) con un `insert into movimiento_bienes` explícito. No se usan triggers porque queremos control sobre el formato del `detalle` (que mezcla campos resueltos como nombres de áreas/sedes).

---

## 8. Supabase Storage

### Bucket: `bienes`

- **Tipo**: público (SELECT abierto, INSERT/UPDATE/DELETE solo `authenticated`).
- **Tamaño máximo**: 5 MB por archivo.
- **Tipos permitidos**: `image/jpeg`, `image/png`, `image/webp`.
- **Estructura de rutas**: archivo en raíz del bucket con nombre `{crypto.randomUUID()}.{ext}`.
- Para mostrar imágenes usar `supabase.storage.from('bienes').getPublicUrl(path)`.
- **La subida se hace desde el cliente**, no vía Server Action (evita el límite de 4.5 MB de Server Actions en Vercel).
- Policies (definidas en `supabase/migrations/00000000000000_initial_schema.sql`):
  - `bienes_public_read` — SELECT para cualquiera
  - `bienes_authenticated_insert` / `_update` / `_delete` — solo autenticados

---

## 9. Variables de Entorno

`.env.local` (NUNCA commitear, ya está en `.gitignore`):

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>

# Opcional para Playwright E2E autenticado.
# Usar solo en .env.local o variables del entorno de CI, nunca en archivos versionados.
E2E_USER_EMAIL=<test-user-email>
E2E_USER_PASSWORD=<test-user-password>
```

Hay un template en `.env.example` que sí se versiona.

- Las variables `NEXT_PUBLIC_*` son accesibles en el cliente.
- Las variables `E2E_*` son solo para el runner de Playwright; `playwright.config.ts` carga `.env.local` con `@next/env`.
- **No usar `SUPABASE_SERVICE_ROLE_KEY`** a menos que sea estrictamente necesario. Si se llega a necesitar, va solo en variables de entorno del servidor (Vercel) y nunca prefijada con `NEXT_PUBLIC_`.

---

## 10. Datos Iniciales (Seed)

`supabase/seed.sql` carga:

- **4 sedes** de ejemplo (Bogotá, Medellín, Cali, Barranquilla) — ajustar antes del primer `db reset` si Conviventia tiene otras.
- **6 áreas** organizacionales (GAF, Focos, Tecnología, Talento Humano, Comunicaciones, Dirección).
- **9 tipos de bien** con prefijos para los códigos automáticos: `COMP`, `PORT`, `MON`, `IMP`, `MOB`, `VID`, `TEL`, `RED`, `OTRO`.

El seed es idempotente (`on conflict do nothing`). **No crea usuarios** — el primer admin se promueve manualmente con SQL después de registrarse desde la app (ver §5.6).

---

## 11. Patrones de Referencia

### 11.1. Server Action (mutación vía RPC)

**Preferencia**: toda mutación que toca más de una tabla o requiere transaccionalidad pasa por un RPC PL/pgSQL (`security invoker`, `set search_path = public`). El Server Action sólo valida entradas, resuelve el user, y llama al RPC. La lógica de negocio (locks, cascadas, auditoría, validación de rol) vive en la BD.

```typescript
// app/(dashboard)/transferencias/actions.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { createTransferenciaActionSchema } from "@/lib/validations/transferencia";

export async function crearTransferencia(formData: FormData) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autenticado" };

  const parsed = createTransferenciaActionSchema.safeParse({
    id_bien: formData.get("id_bien"),
    sede_destino: formData.get("sede_destino"),
    // ...
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const { data, error } = await supabase.rpc("crear_transferencia", {
    p_id_bien: parsed.data.id_bien,
    p_sede_destino: parsed.data.sede_destino,
    // ...
    p_usuario_registro: user.id,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/transferencias");
  revalidatePath("/bienes");
  return { success: true, id_transferencia: data as number };
}
```

### 11.2. Lectura desde Server Component

```typescript
// app/(dashboard)/bienes/page.tsx
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth/require-rol";
import { ROLES } from "@/lib/constants";

export default async function BienesPage() {
  const ctx = await getAuthContext();
  const canWrite = ctx.rol === ROLES.ADMINISTRADOR || ctx.rol === ROLES.ESTANDAR;

  const supabase = await createClient();
  const { data: bienes } = await supabase
    .from("bienes")
    .select("*, sedes(nombre_sede), areas(nombre_area), profiles:id_responsable(nombre, apellido)")
    .order("created_at", { ascending: false });

  return <BienesTable data={bienes ?? []} canWrite={canWrite} />;
}
```

### 11.3. Zod Schema

```typescript
// lib/validations/bien.ts
import { z } from "zod";

export const createBienSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  id_sede: z.coerce.number().positive("Seleccione una sede"),
  id_area: z.coerce.number().positive("Seleccione un área"),
  cantidad: z.coerce.number().int().positive("La cantidad debe ser mayor a 0"),
  valor_unitario: z.coerce.number().nonnegative("El valor no puede ser negativo"),
  serial: z.string().optional(),
  placa: z.string().optional(),
  estado: z.enum(["ACTIVO", "INACTIVO"]).default("ACTIVO"),
  observaciones: z.string().optional(),
});

export type CreateBienInput = z.infer<typeof createBienSchema>;
```

---

## 12. Qué NO Hacer

- ❌ No usar `any` en TypeScript.
- ❌ No desactivar RLS en ninguna tabla.
- ❌ No usar `supabase.auth.admin` ni `service_role` en componentes cliente.
- ❌ No eliminar registros físicamente (usar Soft Delete cambiando estado).
- ❌ No hardcodear strings de roles. Usar constantes de `lib/constants.ts` (`ROLES.ADMINISTRADOR`, etc.).
- ❌ No crear API Routes (`app/api/`) para mutaciones cuando un Server Action es suficiente. Para descargas de archivos, seguir el patrón existente de Route Handlers en `app/api/export/*`.
- ❌ No instalar librerías de UI adicionales. Usar shadcn/ui + Tailwind.
- ❌ No hacer fetch de datos en `useEffect`. Usar Server Components.
- ❌ No instalar React Query / Zustand sin justificación clara — el proyecto no los necesita hoy.
- ❌ No almacenar imágenes en base64 en la BD. Usar Supabase Storage.
- ❌ No mezclar español e inglés en nombres de variables/funciones (inglés para código, español para UI).
- ❌ No commitear `.env.local` ni claves de Supabase. `.mcp.json` y `.claude/settings.local.json` también van al gitignore.
- ❌ No saltar la validación de rol en RPCs nuevos. Si el RPC modifica datos, el primer `perform` debe ser `require_rol_escritura()` o `require_rol_admin()`.

---

## 13. Estado del Proyecto

### Completado
- Auth (login, registro, recuperación), bienes (CRUD + imágenes + modal + filtros por sede/área/tipo/estado), sedes, áreas, categorías (CRUD), transferencias, bajas (RPC + confirmación doble + historial), reportes (inventario por persona), historial (timeline por bien), **exportación a Excel desde /bienes, /reportes y /historial**, panel de control con timeline + chart, usuarios con gestión de roles, RBAC en RLS + RPCs + guards de página + UI condicional, esquema reproducible (baseline + seed + config + README), suite base de pruebas automatizadas (Vitest + Playwright).

### Pendiente del plan original (UTP)
- **Validación funcional con usuarios reales y ajustes de usabilidad** (semana 11) — ejecutar checklist con Kevin/equipo de Conviventia y registrar hallazgos.
- **Manuales** técnico y de usuario, presentación final (semana 12).

---

## 14. Contexto del Sistema Legacy

El sistema anterior fue construido en PHP nativo + MySQL + jQuery. Se puede consultar en el repositorio original `diegohenao819-proyecto_systemact`. Los archivos clave para entender la lógica de negocio original son:

- `contextos.txt` — documentación de las mejoras implementadas en el legacy.
- `REQUISITOS_NEXTJS_SUPABASE.md` — requerimientos funcionales detallados por módulo.
- `DOCUMENTO_ANALISIS_SEMANA_1_2.md` — análisis técnico de la migración.
- `RespaldoBD_Inventario/*.sql` — respaldos de la BD MySQL original.

---

*Última actualización: Mayo 2026*

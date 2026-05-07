# Manual Técnico — SYSTEMACT

Sistema de gestión de inventario de activos físicos para **Conviventia**.

| | |
|---|---|
| Versión | 1.1 |
| Fecha | Mayo 2026 |
| Autor | Diego Alejandro Henao Henao |
| Repositorio | `systemact/` |
| Stack | Next.js 16 · Supabase · TypeScript |
| Despliegue | Vercel + Supabase Cloud |

---

## 1. Introducción

SYSTEMACT es una aplicación web interna que permite a Conviventia registrar, transferir, dar de baja y auditar los activos físicos de la organización. Reemplaza un sistema legacy en PHP/MySQL por un stack moderno basado en Next.js y Supabase.

### Alcance del manual

Este documento cubre la información técnica necesaria para instalar, configurar, mantener y extender el sistema. No es un manual de uso final — para eso ver `MANUAL_USUARIO.md`.

### Audiencia

Personal técnico de Conviventia y futuros desarrolladores que reciban el sistema.

---

## 2. Stack tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Framework | Next.js (App Router) | 16.x |
| Lenguaje | TypeScript (strict) | 5+ |
| Runtime | Node.js | 20+ |
| UI | React | 19 |
| Estilos | Tailwind CSS + shadcn/ui | 3.4 / latest |
| Iconos | lucide-react | — |
| Formularios | React Hook Form + Zod | 7 / 4 |
| Tablas | TanStack Table | 8 |
| Gráficos | Recharts | 3 |
| Notificaciones | Sonner | 2 |
| Exportación | ExcelJS | 4 |
| Backend | Supabase (BaaS) | latest |
| Base de datos | PostgreSQL | 15 |
| Autenticación | Supabase Auth (JWT en cookies HTTP-only) | — |
| Almacenamiento | Supabase Storage | — |
| Pruebas | Vitest + Playwright | 4 / 1 |
| Hosting | Vercel (frontend) + Supabase Cloud (backend) | — |

### Por qué este stack

- **Next.js 16 con Server Components y Server Actions** elimina la necesidad de mantener una API REST separada para mutaciones.
- **Supabase** unifica Postgres, Auth y Storage en un solo proveedor; la lógica crítica vive en RPCs PL/pgSQL.
- **TypeScript estricto + Zod** garantiza tipado en cliente, servidor y validación de entrada.

---

## 3. Arquitectura general

```
┌──────────────────────────────────────────────────────────────┐
│                      Navegador (Cliente)                     │
│   Server Components renderizados + Client Components mínimos │
└────────────┬─────────────────────────────────────────────────┘
             │  HTTP + cookies (JWT)
             ▼
┌──────────────────────────────────────────────────────────────┐
│                    Next.js 16 (Vercel)                       │
│  ┌────────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │ Server         │  │ Server       │  │ Route Handlers  │   │
│  │ Components     │  │ Actions      │  │ (export .xlsx)  │   │
│  └────────┬───────┘  └──────┬───────┘  └────────┬────────┘   │
│           │                 │                   │            │
│           └─────── @supabase/ssr ───────────────┘            │
│                   proxy.ts  (refresh sesión)                 │
└────────────┬─────────────────────────────────────────────────┘
             │  PostgREST + RPC + Auth
             ▼
┌──────────────────────────────────────────────────────────────┐
│                     Supabase (Cloud)                         │
│  ┌──────────┐   ┌──────────────┐   ┌────────────────────┐    │
│  │ Auth     │   │ PostgreSQL   │   │ Storage            │    │
│  │ (JWT)    │   │ + RLS + RPCs │   │ (bucket "bienes")  │    │
│  └──────────┘   └──────────────┘   └────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

### Tres capas de seguridad coordinadas

1. **RLS** (Row-Level Security) en cada tabla — frontera de la base de datos.
2. **RPCs `security invoker`** que llaman `require_rol_escritura()` o `require_rol_admin()` antes de mutar datos.
3. **Guards de página** (`requireRol`) y validaciones en Server Actions — defensa en profundidad y mejor UX.

### Flujo típico de una mutación

```
Usuario → Form (cliente, Zod)
       → Server Action (revalida con Zod, obtiene user)
       → RPC PL/pgSQL (require_rol_*, lock, insert + log auditoría)
       → revalidatePath()
       → toast Sonner
```

---

## 4. Estructura del repositorio

```
systemact/
├── app/
│   ├── (dashboard)/                # Rutas protegidas (sidebar + layout)
│   │   ├── inicio/                 # Dashboard con KPIs y timeline
│   │   ├── bienes/                 # CRUD de bienes (núcleo)
│   │   ├── sedes/  areas/  categorias/   # Catálogos
│   │   ├── transferencias/         # Cambios de ubicación
│   │   ├── bajas/                  # Salida de inventario (admin only)
│   │   ├── historial/              # Timeline por bien
│   │   ├── reportes/               # Inventario por persona
│   │   ├── usuarios/               # Gestión de roles (admin only)
│   │   └── layout.tsx
│   ├── api/export/                 # Route Handlers para descargas .xlsx
│   ├── auth/                       # Login, sign-up, recuperación
│   ├── page.tsx                    # Portada pública
│   ├── layout.tsx
│   ├── sitemap.ts  robots.ts
│   └── opengraph-image.png
├── components/
│   ├── ui/                         # shadcn/ui (no editar a mano)
│   ├── layout/                     # Sidebar, Navbar, MobileSidebar
│   └── *-form.tsx                  # Forms de auth
├── lib/
│   ├── auth/require-rol.ts         # getAuthContext, requireRol
│   ├── export/excel.ts             # Helpers ExcelJS
│   ├── supabase/                   # Clients (server, client, proxy)
│   ├── validations/                # Esquemas Zod por entidad
│   ├── constants.ts                # ROLES, ESTADOS_BIEN, NAV_GROUPS
│   └── utils.ts
├── supabase/
│   ├── migrations/
│   │   ├── 00000000000000_initial_schema.sql   # Baseline
│   │   └── _archive/               # Histórico (no se ejecuta)
│   ├── seed.sql
│   ├── config.toml
│   └── README.md
├── tests/                          # Playwright E2E
├── types/                          # Tipos compartidos
├── proxy.ts                        # Middleware Next.js (refresh sesión)
├── next.config.ts  tailwind.config.ts  tsconfig.json
├── package.json
├── README.md  AGENTS.md
└── documentation/
    ├── CODE_GUIDE.md
    ├── CHANGELOG.md
    └── MANUAL_TECNICO.md           # Este documento
```

---

## 5. Instalación desde cero

Esta sección lleva al lector desde un equipo limpio hasta tener SYSTEMACT corriendo en local. Al final hay una sub-sección de troubleshooting con los problemas más comunes.

### 5.1. Pre-requisitos

Antes de clonar verificar que estén instalados:

| Herramienta | Versión mínima | Cómo verificar |
|---|---|---|
| Node.js | 20.x | `node --version` |
| npm | 10.x | `npm --version` |
| Git | 2.30+ | `git --version` |
| Supabase CLI | 1.150+ | `supabase --version` |
| Docker Desktop | última | `docker --version` (solo para Supabase local) |

Instalación de la Supabase CLI (elegir la opción adecuada al sistema operativo):

```bash
# Windows (Scoop)
scoop install supabase

# macOS / Linux (Homebrew)
brew install supabase/tap/supabase

# Cualquier SO con npm (alternativa global)
npm install -g supabase
```

Adicionalmente se necesita una **cuenta en [supabase.com](https://supabase.com)** para el despliegue en la nube (no es obligatorio si solo se trabaja en local con Docker).

### 5.2. Clonar el repositorio

```bash
git clone https://github.com/<organizacion>/systemact.git
cd systemact
```

> Si no se tiene acceso al repositorio privado, solicitarlo al administrador del proyecto. El clone vía SSH (`git@github.com:...`) requiere haber añadido la clave pública al perfil de GitHub.

### 5.3. Instalar dependencias

```bash
npm install
```

Esto descarga todo lo declarado en `package.json` y genera la carpeta `node_modules/`. La instalación tarda entre 1 y 3 minutos según la conexión.

> **Nota sobre Next.js**: `package.json` declara `"next": "latest"`. La instalación actual resuelve a **Next 16.x**. Para fijar una versión predecible, sustituir por `"next": "^16.2.4"` y volver a correr `npm install`.

### 5.4. Variables de entorno

Copiar la plantilla y editarla con las credenciales de Supabase:

```bash
cp .env.example .env.local
```

Contenido de `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>

# Opcional: solo para pruebas E2E autenticadas
E2E_USER_EMAIL=usuario@dominio.com
E2E_USER_PASSWORD=contraseña
```

Las credenciales se obtienen en `Supabase Dashboard → Project Settings → API`:

- `NEXT_PUBLIC_SUPABASE_URL` corresponde al campo *Project URL*.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` corresponde a la *anon (public) key*.

> **Nunca** versionar `.env.local`. Ya está incluido en `.gitignore`. La `service_role key` no debe usarse en este proyecto: todas las operaciones privilegiadas pasan por RPCs `security invoker` con guard de rol.

### 5.5. Crear el esquema de la base de datos

Hay dos rutas según el entorno objetivo. Para desarrollo local conviene la opción A; para preparar un entorno productivo o staging, la opción B.

**Opción A — proyecto local con Docker** (desarrollo)

Requiere Docker Desktop encendido.

```bash
supabase start          # levanta Postgres, Auth y Studio en contenedores
supabase db reset       # aplica migración baseline + seed
```

Una vez iniciado:

- Studio: <http://127.0.0.1:54323>
- API REST/Auth: <http://127.0.0.1:54321>
- Postgres: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`

`supabase start` imprime las claves locales (`anon` y `service_role`); copiar la `anon` al `.env.local` para que el frontend pueda hablar con la BD local.

**Opción B — proyecto en Supabase Cloud** (staging/producción)

```bash
supabase login                                     # autenticación interactiva
supabase link --project-ref <project-ref>          # vincula la carpeta al proyecto remoto
supabase db push                                   # aplica la migración baseline
psql "$DATABASE_URL" -f supabase/seed.sql          # carga sedes, áreas y tipos
```

`<project-ref>` es el slug visible en la URL del dashboard (`https://app.supabase.com/project/<project-ref>`). `DATABASE_URL` se obtiene en `Project Settings → Database → Connection string (URI)`.

En cualquiera de los dos caminos, la migración crea: **9 tablas, 15 funciones/RPCs, 25 políticas RLS, 1 bucket de Storage con 4 policies y 3 triggers**.

### 5.6. Levantar el frontend

```bash
npm run dev
```

App disponible en <http://localhost:3000>. La primera carga es lenta (compilación bajo demanda); las siguientes deben responder en menos de un segundo.

### 5.7. Crear el primer administrador

Por defecto, todo nuevo usuario se registra con rol `CONSULTOR` (solo lectura). Para promover el primer admin:

1. Registrarse desde la app en `/auth/sign-up` con un correo válido.
2. En Supabase Studio (SQL Editor) o vía `psql` ejecutar:

   ```sql
   update public.profiles
   set rol = 'ADMINISTRADOR'
   where id = (select id from auth.users where email = 'tu-correo@dominio.com');
   ```

3. Cerrar sesión y volver a entrar. El módulo `/usuarios` ya estará visible y desde allí se gestiona el resto del equipo.

### 5.8. Verificar la instalación

Para confirmar que todo quedó bien instalado, ejecutar la suite completa:

```bash
npm run check       # lint + build + tests unitarios
```

Este comando debe terminar sin errores. Si falla en `build`, revisar primero los tipos (`tsc --noEmit`) y luego las variables de entorno.

### 5.9. Troubleshooting

| Síntoma | Causa probable | Solución |
|---|---|---|
| `supabase: command not found` | CLI no instalada o no en PATH | Reinstalar (`scoop`, `brew` o `npm install -g supabase`) y abrir nueva terminal |
| `Error: connect ECONNREFUSED 127.0.0.1:54322` | Docker apagado | Encender Docker Desktop y correr `supabase start` |
| `Invalid API key` al abrir `/inicio` | Claves de `.env.local` son del proyecto equivocado | Comparar con `Project Settings → API` y reiniciar `npm run dev` |
| Build de Next falla con errores de tipo en producción | Versión local distinta a la de Vercel | Borrar `.next/`, `node_modules/` y reinstalar |
| `db push` falla por migraciones huérfanas | Hay archivos en `_archive/` o desincronización | Revisar `supabase/migrations/`; `_archive/` no se aplica, no debe estar en la raíz |

---

## 6. Base de datos

### 6.1. Modelo de datos

| Tabla | Función |
|-------|---------|
| `profiles` | Extiende `auth.users` con datos de la persona y `rol`. |
| `sedes` | Catálogo de sedes físicas. |
| `areas` | Catálogo de áreas organizacionales. |
| `caracteristicas` | Tipos de bien con prefijo (genera el código automático). |
| `bienes` | Entidad principal — los activos físicos. |
| `transferencias` | Snapshot de cada cambio de ubicación. |
| `bajas` | Registro irreversible de salidas de inventario. |
| `movimiento_bienes` | Log de auditoría por bien. |
| `keepalive` | Tabla utilitaria contra hibernación de Supabase. |

### 6.2. Diagrama relacional simplificado

```
auth.users ──1:1── profiles ──N:1── sedes
                       │
                       └────N:1── areas (por nombre, denormalizado)

bienes ──N:1── sedes
       ──N:1── areas
       ──N:1── caracteristicas
       ──N:1── profiles (responsable opcional)

transferencias ──N:1── bienes
bajas          ──N:1── bienes
movimiento_bienes ──N:1── bienes
```

### 6.3. Reglas clave del modelo

- **Código de bien** generado por `generar_codigo_bien(prefijo)` con formato `PREFIJO-AÑO-NNN` (ej. `COMP-2026-001`).
- **`bienes.valor_total`** es columna `GENERATED` (`cantidad * valor_unitario`); nunca se envía desde el cliente.
- **`bienes.estado`** ∈ `{ ACTIVO, INACTIVO, DE BAJA }`. Un bien **nunca se borra físicamente**; las bajas son soft delete (cambio de estado + registro en `bajas`).
- **`responsable_texto`** se usa cuando el responsable no existe en `profiles` (texto libre).
- **`transferencias.area_origen` / `area_destino`** son `text` (no FK) para preservar historial legible aun si se renombra un área.

### 6.4. Funciones / RPCs principales

| Función | Tipo | Propósito |
|---------|------|-----------|
| `handle_new_user` | trigger | Crea `profiles` automáticamente al registrar usuario. |
| `handle_updated_at` | trigger | Mantiene `updated_at` en `bienes` y `profiles`. |
| `generar_codigo_bien` | helper | Calcula correlativo por prefijo y año. |
| `get_my_rol` / `get_my_sede` | helper (security definer) | Evita recursividad en políticas RLS. |
| `current_user_rol` | helper | Permite al cliente consultar su propio rol. |
| `require_rol_escritura` | guard | Lanza excepción si el caller no es ADMIN/ESTANDAR activo. |
| `require_rol_admin` | guard | Lanza excepción si el caller no es ADMIN activo. |
| `crear_bien_con_auditoria` | RPC | Inserta bien + log de auditoría. |
| `actualizar_bien_con_auditoria` | RPC | Modifica bien + log. |
| `crear_transferencia` | RPC | Cambio de ubicación atómico (lock + log). |
| `crear_baja` | RPC | Da de baja un bien (soft delete + registro en `bajas` + `movimiento_bienes`). Solo `ADMINISTRADOR`. |
| `actualizar_rol_usuario` | RPC | Cambia rol; protege "último admin activo". |
| `set_usuario_activo` | RPC | Activa/desactiva; protege "último admin activo". |
| `listar_usuarios_admin` | RPC (security definer) | Lista usuarios con email de `auth.users`. |

### 6.5. Roles y permisos

| Rol | Lectura | Escritura inventario | Transferencias | Bajas | Catálogos (sedes/áreas) | Tipos de bien (`caracteristicas`) | Usuarios |
|-----|---------|----------------------|----------------|-------|-------------------------|-----------------------------------|----------|
| `ADMINISTRADOR` | Todo | Sí | Sí | Sí | Sí | Sí | Sí |
| `ESTANDAR` | Todo | Sí | Sí | No | No (UI bloqueada por Server Action) | Sí (vía RLS — la UI lo oculta hoy) | No |
| `CONSULTOR` | Todo (read-only) | No | No | No | No | No | No |

> **Nota sobre `caracteristicas`**: la política RLS permite `INSERT/UPDATE` a `ADMINISTRADOR` y `ESTANDAR` (`caracteristicas_insert` / `caracteristicas_update`), pero las Server Actions de `/categorias` exigen `ADMINISTRADOR`. La regla de negocio efectiva, vista desde la UI, es "solo ADMIN". Si se requiere consistencia estricta entre RLS y aplicación, endurecer las dos políticas a `get_my_rol() = 'ADMINISTRADOR'`.

### 6.6. Seed inicial

`supabase/seed.sql` (idempotente) carga:

- **4 sedes** (Bogotá, Medellín, Cali, Barranquilla).
- **6 áreas** (GAF, Focos, Tecnología, Talento Humano, Comunicaciones, Dirección).
- **9 tipos de bien** con prefijos: `COMP`, `PORT`, `MON`, `IMP`, `MOB`, `VID`, `TEL`, `RED`, `OTRO`.

No crea usuarios. Editar el seed antes del primer `db reset` si se requieren otros catálogos.

### 6.7. Storage

Bucket `bienes` (público, max 5 MB, `image/jpeg|png|webp`):

- `SELECT` abierto para mostrar imágenes con URL pública.
- `INSERT/UPDATE/DELETE` solo `authenticated`.
- Las imágenes se suben **directamente desde el cliente** (evita el límite de 4.5 MB de Server Actions en Vercel).
- Nombre de archivo: `{crypto.randomUUID()}.{ext}` en raíz del bucket.

---

## 7. Módulos funcionales

| Ruta | Módulo | Acceso |
|------|--------|--------|
| `/` | Portada pública | público |
| `/auth/login`, `/auth/sign-up`, `/auth/forgot-password` | Autenticación | público |
| `/inicio` | Panel con KPIs, timeline de actividad y gráfico por sede | todos |
| `/bienes` | Listado, alta, edición, detalle y filtros (sede / área / tipo / estado) | lectura: todos · escritura: ADMIN/ESTANDAR |
| `/sedes`, `/areas`, `/categorias` | CRUD de catálogos | lectura: todos · escritura: ADMIN |
| `/transferencias` | Cambios de ubicación entre sedes/áreas/responsables | lectura: todos · escritura: ADMIN/ESTANDAR |
| `/bajas` | Salida de inventario con confirmación doble | ADMIN |
| `/historial` | Timeline cronológico por bien | todos |
| `/reportes` | Inventario por persona | todos |
| `/usuarios` | Gestión de roles y activación | ADMIN |
| `/api/export/bienes`, `/api/export/inventario-persona`, `/api/export/historial` | Descarga `.xlsx` | mismo nivel que la ruta UI |

### Reglas de negocio destacadas

- **Transferencias**: solo bienes `ACTIVO`. No se permite transferir a la misma combinación sede + área + responsable.
- **Bajas**: solo bienes `ACTIVO`, solo `ADMINISTRADOR`. Transacción atómica: cambio de estado + registro en `bajas` + entrada en `movimiento_bienes`.
- **Auditoría** (`movimiento_bienes`): cada operación (`REGISTRO`, `MODIFICACION`, `TRANSFERENCIA`, `BAJA`) deja un registro escrito por el RPC correspondiente.
- **Último admin activo**: las RPCs `actualizar_rol_usuario` y `set_usuario_activo` validan en BD que la operación no deje el sistema sin administradores.

---

## 8. Autenticación y autorización

### 8.1. Flujo de auth

1. Login con email/password vía `supabase.auth.signInWithPassword()`.
2. Supabase emite JWT y lo guarda en cookies HTTP-only (`@supabase/ssr`).
3. `proxy.ts` (middleware de Next.js) refresca la sesión en cada request a rutas no públicas.
4. El rol se obtiene de `profiles.rol` cuando se necesita (en el layout del dashboard, en `getAuthContext`, o en RPCs vía `get_my_rol()`).

### 8.2. Guards en server components

```ts
// app/(dashboard)/bajas/page.tsx
import { requireRol, ADMIN_ONLY } from "@/lib/auth/require-rol";

export default async function BajasPage() {
  const ctx = await requireRol(ADMIN_ONLY);
  // si no es ADMIN, requireRol ya hizo redirect("/inicio")
}
```

Para condicionar UI sin bloquear la página:

```ts
const ctx = await getAuthContext();
const canWrite = ctx.rol === ROLES.ADMINISTRADOR || ctx.rol === ROLES.ESTANDAR;
```

### 8.3. Patrón estándar de mutación

```ts
"use server";

export async function crearTransferencia(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autenticado" };

  const parsed = createTransferenciaActionSchema.safeParse({ /* ... */ });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message };

  const { data, error } = await supabase.rpc("crear_transferencia", { /* ... */ });
  if (error) return { success: false, error: error.message };

  revalidatePath("/transferencias");
  return { success: true, id_transferencia: data };
}
```

---

## 9. API y endpoints

El proyecto **no expone una API REST pública**. Las mutaciones internas se hacen vía Server Actions.

Los únicos endpoints HTTP propios son **Route Handlers de descarga**:

| Método | Endpoint | Parámetros | Devuelve |
|--------|----------|------------|----------|
| GET | `/api/export/bienes` | — | `.xlsx` con todos los bienes activos (estado ≠ `DE BAJA`). El handler **no** filtra por query string actualmente. |
| GET | `/api/export/inventario-persona` | `?persona=<uuid>` (obligatorio) | `.xlsx` con los bienes activos asignados a esa persona. Devuelve `400` si falta el parámetro y `404` si el `uuid` no existe. |
| GET | `/api/export/historial` | `?bien=<id>` (obligatorio) | `.xlsx` con datos del bien, información de la baja (si aplica) y timeline de movimientos. Devuelve `400` si falta el parámetro y `404` si el bien no existe. |

Todos exigen sesión activa; sin sesión devuelven `redirect` a `/auth/login`.

El consumo del cliente con la base de datos (lecturas y RPCs) pasa siempre por el SDK oficial `@supabase/ssr` + `@supabase/supabase-js`.

---

## 10. Despliegue

### 10.1. Frontend en Vercel

1. Conectar el repo a un proyecto de Vercel.
2. Configurar variables de entorno en `Project Settings → Environment Variables`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
3. Build command: `next build` (default).
4. Output: `.next/` (default).

Cada push a `master` dispara un deploy automático.

### 10.2. Backend en Supabase Cloud

1. Crear proyecto en [supabase.com](https://supabase.com).
2. `supabase link --project-ref <ref>`.
3. `supabase db push` para aplicar la migración baseline.
4. Cargar el seed con `psql`.
5. Configurar el bucket `bienes` queda hecho automáticamente por la migración.
6. Activar correo SMTP propio en Supabase si se necesita branding o entrega más confiable.

### 10.3. Migraciones futuras

```bash
supabase migration new <nombre_descriptivo>
# editar el SQL generado
supabase db reset           # aplicar en local
supabase db push            # aplicar en remoto
```

`supabase/migrations/_archive/` no se vuelve a ejecutar — es solo memoria histórica.

---

## 11. Pruebas

```bash
npm run lint        # ESLint
npm run build       # build + type-check
npm run test:unit   # Vitest (validaciones, helpers)
npm run test:e2e    # Playwright (flujos base)
npm run check       # lint + build + test:unit
```

Los E2E autenticados leen `E2E_USER_EMAIL` / `E2E_USER_PASSWORD` de `.env.local`. Sin esas variables, Playwright solo valida que las rutas protegidas y las descargas redirijan al login.

---

## 12. Convenciones de código

| Elemento | Convención | Ejemplo |
|----------|-----------|---------|
| Archivos / carpetas | kebab-case | `bien-form.tsx` |
| Componentes React | PascalCase | `BienForm` |
| Hooks | camelCase con `use` | `useBienes` |
| Variables / funciones | camelCase | `valorTotal` |
| Tipos / interfaces | PascalCase | `CreateBienInput` |
| Constantes | UPPER_SNAKE_CASE | `ESTADOS_BIEN` |
| Tablas BD | snake_case plural | `bienes` |
| Columnas BD | snake_case | `valor_unitario` |
| Rutas URL | kebab-case | `/bienes/nuevo` |

Reglas:

- TypeScript `strict`. Prohibido `any` (preferir `unknown`).
- Server Components por defecto. `"use client"` solo cuando se requiera interactividad.
- Una mutación que toca más de una tabla pasa por un RPC PL/pgSQL (`security invoker`, `set search_path = public`).
- Nunca eliminar registros físicamente: soft delete cambiando `estado`.
- No hardcodear strings de roles: usar `ROLES.*` de `lib/constants.ts`.
- Inglés para código, español para UI.

---

## 13. Mantenimiento

### Tareas periódicas recomendadas

- **Backups**: Supabase Cloud genera backups diarios automáticos (plan Pro). Verificar políticas y descargar respaldo manual antes de migraciones grandes.
- **Actualización de dependencias**: revisar `npm outdated` mensualmente. Mayor riesgo: `next`, `@supabase/*`, `react`.
- **Auditoría de roles**: confirmar trimestralmente la lista de `ADMINISTRADOR` y desactivar usuarios que ya no estén en la organización.
- **Consumo de Storage**: monitorear el bucket `bienes` desde el dashboard de Supabase.
- **Logs**: revisar logs de Supabase y Vercel ante reportes de error.

### Puntos de extensión típicos

| Necesidad | Dónde tocar |
|-----------|-------------|
| Nuevo módulo | `app/(dashboard)/<nuevo>/` + entry en `NAV_GROUPS` (`lib/constants.ts`) |
| Nueva validación | `lib/validations/<entidad>.ts` (Zod) |
| Nueva regla de BD | nueva migración en `supabase/migrations/` + RPC si modifica datos |
| Nuevo reporte Excel | `app/api/export/<reporte>/route.ts` + helper en `lib/export/excel.ts` |
| Nuevo rol | Actualizar CHECK constraint en `profiles.rol`, RPCs `require_rol_*`, `ROLES` en `constants.ts`, y políticas RLS |

### Recuperación ante desastres

1. Recrear proyecto Supabase y ejecutar la migración baseline.
2. Restaurar respaldo más reciente desde el dashboard de Supabase.
3. Revisar bucket `bienes`: las imágenes están vinculadas por URL pública; si se restaura el dump, las URLs siguen siendo válidas.
4. Revisar variables de entorno en Vercel.
5. Volver a desplegar el frontend.

---

## 14. Historial de cambios del manual

| Versión | Fecha | Cambios |
|---|---|---|
| 1.0 | Mayo 2026 | Versión inicial. |
| 1.1 | Mayo 2026 | Stack actualizado a Next.js 16. Tabla de RPCs incluye `crear_baja` (15 funciones). Endpoints de exportación corrigen parámetros (`?bien=<id>`, `?persona=<uuid>`) y describen el comportamiento real de `/api/export/bienes` (sin filtros). Aclaración sobre RLS de `caracteristicas` vs Server Action. Sección 5 ampliada con verificación, troubleshooting y notas de instalación. |

---

## 15. Referencias internas

- `README.md` — guía rápida de arranque.
- `AGENTS.md` — guía exhaustiva de arquitectura y convenciones para colaboradores y agentes IA.
- `documentation/CODE_GUIDE.md` — recorrido del código para nuevos colaboradores.
- `supabase/README.md` — setup detallado de la BD y modelo de roles.
- `documentation/CHANGELOG.md` — historial de cambios.

---

*Documento mantenido en `documentation/MANUAL_TECNICO.md`. Actualizar al introducir cambios estructurales (nuevas tablas, nuevos módulos, cambios en roles o despliegue).*

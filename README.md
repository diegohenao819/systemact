# SYSTEMACT

Sistema de gestión de inventario de activos físicos para [Conviventia](https://conviventia.org). Construido con Next.js 15, Supabase y TypeScript como parte de la práctica de Ingeniería Informática (UTP, 2026).

## Características

- **Inventario** completo con fotos, códigos automáticos por tipo y valoración.
- **Transferencias** entre sedes, áreas y responsables con auditoría transaccional.
- **Roles de tres niveles** (`ADMINISTRADOR`, `ESTANDAR`, `CONSULTOR`) aplicados en RLS, RPCs y guards de página.
- **Panel de control** con timeline de actividad reciente y gráficos por sede.
- **Auditoría** automática de todas las operaciones sobre cada bien (registro, modificación, transferencia, baja).

## Arrancar el proyecto desde cero

### 1. Clonar y configurar variables de entorno

```bash
git clone https://github.com/<tu-org>/systemact.git
cd systemact
cp .env.example .env.local
```

Edita `.env.local` con las credenciales de tu proyecto Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<tu-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<tu-publishable-key>
```

Encuentras estos valores en [tu proyecto Supabase → Settings → API](https://supabase.com/dashboard/project/_?showConnect=true).

### 2. Crear el esquema de la base de datos

Necesitas el [Supabase CLI](https://supabase.com/docs/guides/cli/getting-started). Después:

**Opción A — proyecto local con Docker:**
```bash
supabase start              # arranca Postgres, Auth, Studio en local
supabase db reset           # aplica el esquema + carga seed.sql
```

**Opción B — proyecto en Supabase Cloud:**
```bash
supabase link --project-ref <tu-ref>
supabase db push                        # crea todas las tablas, funciones, RLS
psql "$DATABASE_URL" -f supabase/seed.sql   # carga sedes, áreas y tipos de bien
```

Esto crea **9 tablas, 14 funciones/RPCs, 25 políticas RLS, 1 bucket de Storage** con un solo comando. Detalle en [supabase/README.md](supabase/README.md).

### 3. Levantar el frontend

```bash
npm install
npm run dev
```

App en [localhost:3000](http://localhost:3000).

### 4. Crear el primer administrador

Por defecto, los usuarios nuevos quedan en rol `CONSULTOR` (modo lectura). Para promover el primer admin:

1. Regístrate desde la app (`/auth/sign-up`).
2. En Supabase Studio (o `psql`), ejecuta:
   ```sql
   update public.profiles
   set rol = 'ADMINISTRADOR'
   where id = (select id from auth.users where email = 'tu-correo@dominio.com');
   ```
3. Cierra sesión y vuelve a entrar. Desde `/usuarios` ya puedes gestionar al resto del equipo.

## Stack

- **Framework**: Next.js 15 (App Router, Server Components, Server Actions).
- **Base de datos**: Supabase (Postgres + Auth + Storage + RLS).
- **UI**: Tailwind CSS + shadcn/ui + lucide-react + recharts.
- **Validación**: Zod en cliente y server.
- **Tablas**: TanStack Table v8.

## Estructura del repo

```
systemact/
├── app/(dashboard)/          # Rutas autenticadas (bienes, sedes, áreas, transferencias, usuarios, etc.)
├── app/auth/                 # Login, registro, recuperación de contraseña
├── components/               # ui/, layout/, formularios reutilizables
├── lib/
│   ├── auth/require-rol.ts   # Guards de rol para server components
│   ├── supabase/             # Clients (server, client, proxy)
│   └── validations/          # Esquemas Zod
├── supabase/
│   ├── migrations/           # 1 baseline + _archive/ con historia
│   ├── seed.sql              # Catálogos de ejemplo
│   ├── config.toml           # Config del CLI
│   └── README.md             # Setup detallado de la BD
├── documentation/CHANGELOG.md
└── AGENTS.md                 # Guía detallada para colaboradores y agentes
```

## Documentación

- [`AGENTS.md`](AGENTS.md) — guía exhaustiva del proyecto: arquitectura, modelo de datos, convenciones de código, flujos de auth.
- [`supabase/README.md`](supabase/README.md) — setup de la BD, modelo de roles, cómo agregar migraciones.
- [`documentation/CHANGELOG.md`](documentation/CHANGELOG.md) — historial detallado de cambios.

## Licencia

Por definir.

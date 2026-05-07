# SYSTEMACT

Sistema de gestión de inventario de activos físicos para [Conviventia](https://conviventia.org). Construido con Next.js 15, Supabase y TypeScript como parte de la práctica de Ingeniería Informática (UNIR, 2026).

## Características

- **Inventario** completo con fotos, códigos automáticos por tipo, valoración en COP y filtros por sede / área / tipo / estado.
- **Categorías** (tipos de bien) con prefijos personalizables para los códigos automáticos.
- **Transferencias** entre sedes, áreas y responsables con auditoría transaccional.
- **Bajas** con confirmación doble, motivos tipificados y trazabilidad completa.
- **Reportes** de inventario por persona y trazabilidad por bien (timeline cronológico).
- **Exportación a Excel** desde reportes, listado de bienes e historial — con formato de moneda COP, auto-filtros y panel congelado.
- **Roles de tres niveles** (`ADMINISTRADOR`, `ESTANDAR`, `CONSULTOR`) aplicados en RLS, RPCs y guards de página.
- **Portada pública minimalista** con acceso a login y registro.
- **Panel de control** con timeline de actividad reciente y gráficos por sede.
- **Auditoría** automática de todas las operaciones sobre cada bien (registro, modificación, transferencia, baja).

## Arrancar el proyecto desde cero

### 1. Clonar y configurar variables de entorno

```bash
git clone https://github.com/<tu-org>/systemact.git
cd systemact
cp .env.example .env.local
```

Edita `.env.local` con las credenciales de tu proyecto Supabase. Este archivo es local y no se versiona:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<tu-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<tu-publishable-key>

# Opcional: usuario real para pruebas E2E autenticadas.
# No commitear credenciales reales.
E2E_USER_EMAIL=usuario@dominio.com
E2E_USER_PASSWORD=contraseña
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

- **Framework**: Next.js 15 (App Router, Server Components, Server Actions, Route Handlers).
- **Base de datos**: Supabase (Postgres + Auth + Storage + RLS).
- **UI**: Tailwind CSS + shadcn/ui + lucide-react + recharts.
- **Validación**: Zod en cliente y server.
- **Tablas**: TanStack Table v8.
- **Exportación**: ExcelJS para reportes en `.xlsx`.
- **Pruebas**: Vitest para unitarias y Playwright para E2E.

## Estructura del repo

```
systemact/
├── app/(dashboard)/          # Rutas autenticadas (bienes, sedes, áreas, categorías, transferencias, bajas, reportes, historial, usuarios)
├── app/api/export/           # Route Handlers que devuelven .xlsx (bienes, inventario-persona, historial)
├── app/auth/                 # Login, registro, recuperación de contraseña
├── components/               # ui/, layout/, formularios reutilizables
├── lib/
│   ├── auth/require-rol.ts   # Guards de rol para server components
│   ├── export/excel.ts       # Helpers de ExcelJS (estilos, headers HTTP)
│   ├── supabase/             # Clients (server, client, proxy)
│   └── validations/          # Esquemas Zod
├── supabase/
│   ├── migrations/           # 1 baseline + _archive/ con historia
│   ├── seed.sql              # Catálogos de ejemplo
│   ├── config.toml           # Config del CLI
│   └── README.md             # Setup detallado de la BD
├── documentation/
│   ├── CODE_GUIDE.md          # Guía para entender la arquitectura y flujos del código
│   └── CHANGELOG.md
└── AGENTS.md                 # Guía detallada para colaboradores y agentes
```

## Pruebas

```bash
npm run lint       # ESLint
npm run build      # build + TypeScript
npm run test:unit  # Vitest: validaciones y helpers
npm run test:e2e   # Playwright: flujos funcionales base
```

Los E2E autenticados leen automáticamente estas variables desde `.env.local`:

```bash
E2E_USER_EMAIL=usuario@dominio.com
E2E_USER_PASSWORD=contraseña
```

Sin credenciales, Playwright omite los flujos autenticados y solo valida que las rutas protegidas y las descargas Excel redirijan al login. `.env.local` está ignorado por Git; no subir correos, contraseñas ni claves reales a GitHub.

## Documentación

- [`AGENTS.md`](AGENTS.md) — guía exhaustiva del proyecto: arquitectura, modelo de datos, convenciones de código, flujos de auth.
- [`documentation/CODE_GUIDE.md`](documentation/CODE_GUIDE.md) — guía de lectura del código para nuevos colaboradores: capas, flujos, contratos y puntos de extensión.
- [`supabase/README.md`](supabase/README.md) — setup de la BD, modelo de roles, cómo agregar migraciones.
- [`documentation/CHANGELOG.md`](documentation/CHANGELOG.md) — historial detallado de cambios.

## Licencia

Apache License 2.0.

SYSTEMACT se propone bajo la licencia Apache License 2.0, una licencia de código abierto permisiva que permite el uso, modificación y distribución del software, siempre que se conserve la atribución correspondiente al autor original, el aviso de copyright y los términos de la licencia. Esta licencia fue seleccionada porque facilita la reutilización del proyecto, manteniendo el reconocimiento de autoría y ofreciendo un marco legal claro para futuras mejoras o adaptaciones.

Copyright 2026 Diego Henao

# AGENTS.md — SYSTEMACT Conviventia

> Este archivo es la fuente de verdad para cualquier agente de IA (Claude Code, Cursor, Copilot, etc.) que trabaje en este repositorio. Léelo completo antes de generar código.

---

## 1. Visión General del Proyecto

**SYSTEMACT** es un sistema de gestión de inventario de recursos físicos para la organización **Conviventia** (ONG colombiana). Se está migrando desde un sistema legacy en PHP/MySQL hacia un stack moderno.

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
Frontend:    Next.js 14+ (App Router) + TypeScript strict
Estilos:     TailwindCSS + shadcn/ui
Formularios: React Hook Form + Zod
Tablas:      TanStack Table (React Table v8)
Estado:      Zustand (global ligero) + React Query / TanStack Query (server state)
Toasts:      Sonner
Backend:     Supabase (BaaS)
BD:          PostgreSQL (via Supabase)
Auth:        Supabase Auth (email/password + JWT)
Storage:     Supabase Storage (imágenes de bienes)
Deploy:      Vercel (frontend) + Supabase Cloud (backend)
```

### Versiones Mínimas

- Node.js >= 18
- Next.js >= 14.0
- TypeScript >= 5.0
- React >= 18.2

---

## 3. Estructura del Proyecto

```
systemact/
├── app/
│   ├── (auth)/                  # Grupo de rutas públicas (login, recuperar contraseña)
│   │   ├── login/page.tsx
│   │   └── recuperar/page.tsx
│   ├── (dashboard)/             # Grupo de rutas protegidas (requiere sesión)
│   │   ├── layout.tsx           # Layout con sidebar + navbar
│   │   ├── inicio/page.tsx      # Dashboard principal con KPIs
│   │   ├── bienes/
│   │   │   ├── page.tsx         # Listado con TanStack Table
│   │   │   ├── nuevo/page.tsx   # Formulario de creación
│   │   │   └── [id]/page.tsx    # Detalle / edición de un bien
│   │   ├── sedes/
│   │   ├── areas/
│   │   ├── usuarios/
│   │   ├── transferencias/
│   │   │   ├── page.tsx         # Listado de transferencias
│   │   │   └── nueva/page.tsx   # Formulario nueva transferencia
│   │   ├── bajas/
│   │   │   ├── page.tsx
│   │   │   └── nueva/page.tsx
│   │   ├── historial/page.tsx   # Log de movimientos
│   │   └── reportes/
│   │       ├── page.tsx         # Menú de reportes
│   │       └── [tipo]/page.tsx  # Reporte específico
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Redirect a /login o /inicio
├── components/
│   ├── ui/                      # Componentes shadcn/ui (no editar manualmente)
│   ├── forms/                   # Componentes de formulario reutilizables
│   ├── tables/                  # Columnas y configuraciones de TanStack Table
│   ├── layout/                  # Sidebar, Navbar, Breadcrumbs
│   └── shared/                  # Componentes compartidos (modals, confirmations, etc.)
├── lib/
│   ├── supabase/
│   │   ├── client.ts            # createBrowserClient
│   │   ├── server.ts            # createServerClient
│   │   ├── middleware.ts        # Auth middleware helper
│   │   └── admin.ts             # Service role client (solo server-side)
│   ├── validations/             # Schemas Zod por entidad
│   │   ├── bien.ts
│   │   ├── sede.ts
│   │   ├── area.ts
│   │   ├── transferencia.ts
│   │   ├── baja.ts
│   │   └── usuario.ts
│   ├── utils.ts                 # Helpers genéricos (formatCurrency, formatDate, etc.)
│   └── constants.ts             # Enums, opciones de select, configuración
├── hooks/                       # Custom hooks
│   ├── use-bienes.ts
│   ├── use-sedes.ts
│   └── use-auth.ts
├── stores/                      # Zustand stores
│   └── auth-store.ts
├── types/
│   ├── database.types.ts        # Tipos auto-generados por Supabase CLI
│   └── index.ts                 # Tipos de dominio adicionales
├── supabase/
│   ├── migrations/              # Migraciones SQL (supabase db diff)
│   ├── seed.sql                 # Datos iniciales (áreas, sedes, usuario admin)
│   └── config.toml
├── middleware.ts                 # Next.js middleware (protección de rutas)
├── AGENTS.md                    # Este archivo
└── .env.local                   # Variables de entorno (NO commitear)
```

---

## 4. Esquema de Base de Datos (PostgreSQL / Supabase)

### 4.1. Tabla `profiles` (extiende auth.users)

```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  cedula TEXT UNIQUE NOT NULL,
  cargo TEXT,
  rol TEXT NOT NULL CHECK (rol IN ('ADMINISTRADOR', 'ESTANDAR', 'CONSULTOR')) DEFAULT 'CONSULTOR',
  id_sede INTEGER REFERENCES public.sedes(id_sede),
  area TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 4.2. Tabla `sedes`

```sql
CREATE TABLE public.sedes (
  id_sede SERIAL PRIMARY KEY,
  nombre_sede TEXT NOT NULL UNIQUE,
  abreviatura TEXT,
  ciudad TEXT,
  direccion TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 4.3. Tabla `areas`

```sql
CREATE TABLE public.areas (
  id_area SERIAL PRIMARY KEY,
  nombre_area TEXT NOT NULL UNIQUE,
  estado TEXT CHECK (estado IN ('ACTIVO', 'INACTIVO')) DEFAULT 'ACTIVO',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 4.4. Tabla `caracteristicas` (catálogo de tipos de bienes)

```sql
CREATE TABLE public.caracteristicas (
  id_caracteristica SERIAL PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  descripcion TEXT NOT NULL,
  imagen_url TEXT,
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 4.5. Tabla `bienes` (entidad principal)

```sql
CREATE TABLE public.bienes (
  id_bien SERIAL PRIMARY KEY,
  codigo_generado TEXT NOT NULL UNIQUE,      -- Ej: "COMP-2024-001"
  nombre TEXT NOT NULL,
  id_caracteristica INTEGER REFERENCES public.caracteristicas(id_caracteristica),
  id_responsable UUID REFERENCES public.profiles(id),
  responsable_texto TEXT,                    -- Responsable manual si no existe en profiles
  id_sede INTEGER NOT NULL REFERENCES public.sedes(id_sede),
  id_area INTEGER REFERENCES public.areas(id_area),
  serial TEXT,
  placa TEXT UNIQUE,
  cantidad INTEGER NOT NULL DEFAULT 1 CHECK (cantidad > 0),
  valor_unitario NUMERIC(15,2) NOT NULL DEFAULT 0,
  valor_total NUMERIC(15,2) GENERATED ALWAYS AS (cantidad * valor_unitario) STORED,
  estado TEXT NOT NULL CHECK (estado IN ('ACTIVO', 'INACTIVO', 'DE BAJA')) DEFAULT 'ACTIVO',
  imagen_url TEXT,                           -- URL de Supabase Storage
  observaciones TEXT,
  fecha_registro TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 4.6. Tabla `transferencias`

```sql
CREATE TABLE public.transferencias (
  id_transferencia SERIAL PRIMARY KEY,
  id_bien INTEGER NOT NULL REFERENCES public.bienes(id_bien),
  sede_origen INTEGER NOT NULL REFERENCES public.sedes(id_sede),
  sede_destino INTEGER NOT NULL REFERENCES public.sedes(id_sede),
  area_origen TEXT,
  area_destino TEXT,
  responsable_origen UUID REFERENCES public.profiles(id),
  responsable_destino UUID REFERENCES public.profiles(id),
  motivo TEXT NOT NULL,
  usuario_registro UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 4.7. Tabla `bajas`

```sql
CREATE TABLE public.bajas (
  id_baja SERIAL PRIMARY KEY,
  id_bien INTEGER NOT NULL REFERENCES public.bienes(id_bien),
  motivo TEXT NOT NULL CHECK (motivo IN ('DAÑO IRREPARABLE', 'OBSOLESCENCIA', 'ROBO', 'PERDIDA', 'DONACION', 'VENTA', 'OTRO')),
  descripcion TEXT,
  usuario_registro UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 4.8. Tabla `movimiento_bienes` (audit log)

```sql
CREATE TABLE public.movimiento_bienes (
  id_movimiento SERIAL PRIMARY KEY,
  id_bien INTEGER NOT NULL REFERENCES public.bienes(id_bien),
  tipo_movimiento TEXT NOT NULL CHECK (tipo_movimiento IN ('REGISTRO', 'TRANSFERENCIA', 'BAJA', 'MODIFICACION')),
  detalle TEXT,
  usuario_responsable UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 4.9. Relaciones clave

```
profiles.id_sede → sedes.id_sede
bienes.id_sede → sedes.id_sede
bienes.id_area → areas.id_area
bienes.id_responsable → profiles.id
bienes.id_caracteristica → caracteristicas.id_caracteristica
transferencias.id_bien → bienes.id_bien
bajas.id_bien → bienes.id_bien
movimiento_bienes.id_bien → bienes.id_bien
```

---

## 5. Autenticación y Autorización

### 5.1. Flujo de Auth

1. Login con email/password via `supabase.auth.signInWithPassword()`
2. Supabase devuelve JWT con `user.id`
3. El middleware de Next.js verifica la sesión en cada request a rutas `(dashboard)`
4. El rol se obtiene de `profiles.rol` asociado al `user.id`

### 5.2. Roles

| Rol | Nivel | Puede crear | Puede editar | Puede dar baja | Puede transferir | Ve todo |
|-----|-------|-------------|-------------|----------------|-------------------|---------|
| ADMINISTRADOR | 3 | ✅ | ✅ | ✅ | ✅ | ✅ |
| ESTANDAR | 2 | ✅ | ✅ (propios) | ❌ | ❌ | Solo su sede |
| CONSULTOR | 1 | ❌ | ❌ | ❌ | ❌ | Solo sus bienes |

### 5.3. Middleware de protección

```typescript
// middleware.ts — patrón de referencia
// Rutas públicas: /login, /recuperar
// Todo lo demás requiere sesión activa
// Si no hay sesión → redirect a /login
// Si hay sesión y está en /login → redirect a /inicio
```

### 5.4. RLS obligatorio

**Toda tabla debe tener RLS habilitado.** Nunca desactivar RLS ni usar `service_role` key en el cliente. El `service_role` solo se usa en Server Actions o Route Handlers cuando es estrictamente necesario.

---

## 6. Convenciones de Código

### 6.1. TypeScript

- **Strict mode** siempre habilitado
- Nunca usar `any`. Preferir `unknown` si el tipo no se conoce
- Interfaces para objetos de dominio, types para unions/aliases
- Usar los tipos auto-generados de Supabase: `Database['public']['Tables']['bienes']['Row']`

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

- Usar **Server Components** por defecto. Agregar `"use client"` solo cuando sea necesario (interactividad, hooks de estado, event handlers)
- Un componente por archivo
- Props tipadas siempre con interface
- No usar `export default`. Usar named exports: `export function BienCard()`

### 6.4. Data Fetching

- **Server Components**: Fetch data directamente con el Supabase server client
- **Client Components**: Usar React Query / TanStack Query con hooks custom
- **Mutaciones**: Usar Server Actions (`"use server"`) para todas las escrituras a BD
- Nunca exponer lógica de Supabase directamente en componentes. Encapsular en funciones en `lib/` o `hooks/`

### 6.5. Formularios

```typescript
// Patrón estándar para formularios
// 1. Schema Zod en lib/validations/[entidad].ts
// 2. React Hook Form con zodResolver
// 3. Server Action para procesar el submit
// 4. Revalidar datos con revalidatePath() tras mutación exitosa
```

### 6.6. Manejo de Errores

- Siempre usar try/catch en Server Actions
- Retornar objetos `{ success: boolean, error?: string, data?: T }`
- Mostrar errores al usuario con Sonner toast
- Nunca exponer mensajes internos de Supabase al usuario final
- Loggear errores en consola del servidor

---

## 7. Reglas de Negocio Críticas

Estas reglas deben respetarse siempre, independientemente del módulo:

### 7.1. Bienes

- El **código** se genera automáticamente: `{PREFIJO}-{AÑO}-{CORRELATIVO_3_DIGITOS}` (ej: `COMP-2026-001`)
- El **valor_total** es calculado (cantidad × valor_unitario). En PostgreSQL es columna GENERATED. En el frontend se muestra en tiempo real pero no se envía al servidor
- La **placa** es única cuando se proporciona. Puede ser nula
- El **responsable** puede seleccionarse desde `profiles`, escribirse manualmente en `responsable_texto` o dejarse vacío
- Un bien **nunca se elimina** físicamente. Se cambia su estado a `DE BAJA` (Soft Delete)
- Las **imágenes** se suben a Supabase Storage en el bucket `bienes` con ruta: `bienes/{id_bien}/{filename}`

### 7.2. Transferencias

- No se puede transferir un bien a su **misma ubicación** (misma sede + misma área + mismo responsable)
- Solo bienes en estado **ACTIVO** pueden transferirse
- Al guardar una transferencia, se debe **actualizar el bien** (nueva sede, área, responsable) Y crear el registro en `movimiento_bienes` en la misma transacción

### 7.3. Bajas

- Solo bienes en estado **ACTIVO** pueden darse de baja
- Al confirmar la baja: cambiar estado del bien a `DE BAJA` + insertar en tabla `bajas` + insertar en `movimiento_bienes`. Todo en una transacción
- Los usuarios ESTANDAR necesitan **confirmación adicional** (modal de confirmación con motivo obligatorio)
- Solo ADMINISTRADOR puede ejecutar bajas

### 7.4. Auditoría (movimiento_bienes)

Cada vez que ocurre algo sobre un bien, se debe insertar un registro:

| Acción | tipo_movimiento | Detalle sugerido |
|--------|----------------|------------------|
| Se crea un bien | `REGISTRO` | "Bien registrado: {nombre}" |
| Se transfiere | `TRANSFERENCIA` | "Transferido de {sede_origen} a {sede_destino}" |
| Se da de baja | `BAJA` | "Baja por: {motivo}" |
| Se edita info | `MODIFICACION` | "Campos modificados: {lista}" |

> **Preferencia**: Implementar con **Database Triggers** en PostgreSQL cuando sea posible, en lugar de hacerlo manualmente en el código de la app.

---

## 8. Supabase Storage

### Bucket: `bienes`

- **Tipo**: Privado (requiere auth para acceder)
- **Tamaño máximo**: 5 MB por archivo
- **Tipos permitidos**: `image/jpeg`, `image/png`, `image/webp`
- **Estructura de rutas**: `bienes/{id_bien}/{timestamp}_{filename}`
- Para mostrar imágenes usar `supabase.storage.from('bienes').createSignedUrl(path, 3600)`

---

## 9. Variables de Entorno

```env
# .env.local (NUNCA commitear)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOi...
NEXT_PUBLIC_SITE_URL=https://systemact.vercel.app  # Base URL pública para links de auth
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...   # Solo server-side, NUNCA en cliente
```

- Las variables `NEXT_PUBLIC_*` son accesibles en el cliente
- `SUPABASE_SERVICE_ROLE_KEY` solo se usa en Server Actions / Route Handlers para operaciones admin

---

## 10. Datos Iniciales (Seed)

El archivo `supabase/seed.sql` debe poblar:

### Sedes

Las sedes originales de Conviventia (extraídas del sistema legacy).

### Áreas

```
GAF DIRECCIÓN ADMINISTRATIVA
GAF DIRECCIÓN FINANCIERA
GAF DIRECCIÓN CONTABLE
GAF TALENTO HUMANO
FOCO FAMILIA Y LIDERAZGO
FOCO INFANCIA Y JUVENTUD
FOCO INCLUSIÓN PRODUCTIVA
FOCO ATENCIÓN HUMANITARIA
GERENCIA DE COOPERACIÓN Y RELACIONAMIENTO
```

### Usuario Admin inicial

Crear un usuario con rol ADMINISTRADOR para el primer acceso.

---

## 11. Patrones de Referencia

### 11.1. Server Action (mutación)

```typescript
// app/(dashboard)/bienes/nuevo/actions.ts
"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { createBienSchema } from "@/lib/validations/bien"

export async function crearBien(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "No autenticado" }

  const raw = Object.fromEntries(formData)
  const parsed = createBienSchema.safeParse(raw)
  if (!parsed.success) return { success: false, error: "Datos inválidos" }

  const { data, error } = await supabase
    .from("bienes")
    .insert({ ...parsed.data, id_responsable: user.id })
    .select()
    .single()

  if (error) return { success: false, error: "Error al guardar" }

  revalidatePath("/bienes")
  return { success: true, data }
}
```

### 11.2. Hook de datos (lectura client-side)

```typescript
// hooks/use-bienes.ts
"use client"

import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"

export function useBienes(sedeId?: number) {
  const supabase = createClient()

  return useQuery({
    queryKey: ["bienes", sedeId],
    queryFn: async () => {
      let query = supabase
        .from("bienes")
        .select("*, sedes(nombre_sede), areas(nombre_area), profiles(nombre, apellido)")
        .order("created_at", { ascending: false })

      if (sedeId) query = query.eq("id_sede", sedeId)

      const { data, error } = await query
      if (error) throw error
      return data
    },
  })
}
```

### 11.3. Zod Schema

```typescript
// lib/validations/bien.ts
import { z } from "zod"

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
})

export type CreateBienInput = z.infer<typeof createBienSchema>
```

---

## 12. Qué NO Hacer

- ❌ No usar `any` en TypeScript
- ❌ No desactivar RLS en ninguna tabla
- ❌ No usar `supabase.auth.admin` ni `service_role` en componentes cliente
- ❌ No eliminar registros físicamente (usar Soft Delete cambiando estado)
- ❌ No hardcodear strings de roles. Usar constantes de `lib/constants.ts`
- ❌ No crear API Routes (`app/api/`) cuando un Server Action es suficiente
- ❌ No instalar librerías de UI adicionales. Usar shadcn/ui + Tailwind
- ❌ No hacer fetch de datos en `useEffect`. Usar React Query o Server Components
- ❌ No almacenar imágenes en base64 en la BD. Usar Supabase Storage
- ❌ No mezclar español e inglés en nombres de variables/funciones (usar inglés para código, español para UI)
- ❌ No commitear `.env.local` ni claves de Supabase

---

## 13. Contexto del Sistema Legacy

El sistema anterior fue construido en PHP nativo + MySQL + jQuery. Se puede consultar el código legacy en la carpeta `/legacy/conviventia/` (si se conserva) o en el repositorio original `diegohenao819-proyecto_systemact`. Los archivos clave para entender la lógica de negocio original son:

- `contextos.txt` — Documentación completa de las mejoras implementadas en el legacy
- `REQUISITOS_NEXTJS_SUPABASE.md` — Requerimientos funcionales detallados por módulo
- `DOCUMENTO_ANALISIS_SEMANA_1_2.md` — Análisis técnico de la migración
- `RespaldoBD_Inventario/*.sql` — Respaldos de la BD MySQL original

---

*Última actualización: Marzo 2026*

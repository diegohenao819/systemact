# Changelog

Cambios relevantes del proyecto SYSTEMACT, ordenados del más reciente al más antiguo.

---

## 2026-04-18 — Módulo de transferencias

### Funcionalidades

#### 🔄 Registro de transferencias de bienes
- Nueva página `/transferencias` con tabla de historial:
  - Columnas: Fecha, Bien (código + nombre), Origen (sede / área / responsable), Destino (sede / área / responsable), Motivo, Usuario que registró.
  - Orden por fecha descendente por defecto, búsqueda por código o motivo, paginación de 15 filas.
- Nueva página `/transferencias/nueva`:
  - Selector del bien activo a transferir.
  - Panel comparativo **Ubicación actual → Nueva ubicación** que se actualiza en tiempo real.
  - Selectores de sede y área destino (sólo áreas activas).
  - Responsable destino con toggle **"Elegir de la lista" / "Escribir nombre"** (mismo patrón que el form de bienes).
  - Opción **Desconocido** al tope del dropdown para marcar responsable como desconocido sin escribir.
  - Textarea de motivo obligatorio (mín. 3 caracteres).
  - Botón de submit deshabilitado si el destino coincide con la ubicación actual (validación en cliente + en el RPC).
  - Acepta query param `?bien=<id>` para preseleccionar un bien desde otras pantallas.

### Cambios técnicos en base de datos

#### Tabla `transferencias`
- Sin cambios de esquema — la tabla ya existía. Ahora **se escribe** desde el RPC y **se lee** desde `/transferencias`.
- Los campos `area_origen` y `area_destino` son `text` (snapshot del nombre), el RPC los resuelve desde `areas.nombre_area` al momento de la transferencia. Así el historial se mantiene legible aunque se renombre un área.
- `responsable_destino` es `uuid`: cuando se elige un perfil se guarda el UUID; cuando se usa texto libre o "Desconocido" queda `null` en `transferencias` y la información de texto se conserva en `bienes.responsable_texto`.

#### Tabla `bienes`
- Al ejecutar una transferencia el RPC actualiza `id_sede`, `id_area`, `id_responsable`, `responsable_texto` y `updated_at` de forma atómica.
- `responsable_texto` se sincroniza con el modo elegido (texto libre, "Desconocido" o `null` si se escogió un perfil).

#### Nuevo RPC `crear_transferencia`
Firma (7 parámetros, los dos de responsable son opcionales):
```
crear_transferencia(
  p_id_bien integer,
  p_sede_destino integer,
  p_area_destino integer,
  p_motivo text,
  p_usuario_registro uuid,
  p_responsable_destino uuid default null,
  p_responsable_destino_texto text default null
) returns integer
```

Flujo transaccional:
1. `select ... for update` sobre la fila del bien para bloquearla durante la transacción.
2. Valida que el bien exista y esté en estado `ACTIVO` (los bienes `INACTIVO` o `DE BAJA` no pueden transferirse).
3. Normaliza el texto del responsable (`nullif(trim(...), '')`). Si se pasa UUID, el texto se ignora.
4. Valida que la terna (sede, área, responsable) del destino sea distinta a la actual. Si no, `raise exception`.
5. Resuelve los nombres de área origen y destino vía lookup en `areas`.
6. Inserta en `transferencias` con `responsable_destino` = UUID (o `null` si el destino es texto/desconocido).
7. Actualiza `bienes` con la nueva ubicación y responsable.
8. Inserta entrada de auditoría en `movimiento_bienes` con `tipo_movimiento = 'TRANSFERENCIA'`, detalle formateado como `"Transferencia de <código>: <área origen> → <sede destino> / <área destino>"`.

`security invoker` + `set search_path = public` — mismo patrón que los otros RPCs (`crear_bien_con_auditoria`, `actualizar_bien_con_auditoria`).

#### RLS sobre `transferencias`
- Se habilita RLS y se crea policy `authenticated_can_read_transferencias` (SELECT, rol `authenticated`, `using (true)`). Igual que lo hecho antes para `movimiento_bienes`.
- Las escrituras no necesitan policy extra porque ocurren a través del RPC `security invoker` con los permisos del usuario autenticado.

### Migraciones añadidas

| Archivo | Contenido |
|---------|-----------|
| `supabase/migrations/20260418220000_transferencias_rpc.sql` | `enable row level security` + policy de SELECT en `transferencias`, RPC `crear_transferencia` con 7 parámetros, `grant execute` a `authenticated` |

### Cambios en frontend

| Archivo | Cambio |
|---------|--------|
| `app/(dashboard)/transferencias/page.tsx` | Reemplaza el stub "Módulo en construcción" por la página real con query anidada y `TransferenciasTable` |
| `app/(dashboard)/transferencias/transferencias-table.tsx` | **Nuevo** — tabla con orden, búsqueda, paginación, columnas origen → destino |
| `app/(dashboard)/transferencias/nueva/page.tsx` | **Nuevo** — carga bienes activos, sedes, áreas y perfiles; soporta `?bien=<id>` |
| `app/(dashboard)/transferencias/transferencia-form.tsx` | **Nuevo** — form con toggle lista/texto, opción Desconocido, validación de destino ≠ origen en vivo |
| `app/(dashboard)/transferencias/actions.ts` | **Nuevo** — server action `crearTransferencia` que llama al RPC y revalida `/transferencias`, `/bienes`, `/inicio` |
| `lib/validations/transferencia.ts` | **Nuevo** — schemas Zod (TS + FormData con `z.coerce`) con campos `id_bien`, `sede_destino`, `area_destino`, `responsable_destino` (uuid opcional), `responsable_destino_texto` (opcional), `motivo` |

### Observaciones técnicas

#### Joins duplicados a la misma tabla en Supabase

La tabla `transferencias` referencia `sedes` dos veces (`sede_origen` y `sede_destino`) y `profiles` tres veces (`responsable_origen`, `responsable_destino`, `usuario_registro`). Para embeberlas en una sola query hay que usar aliasing explícito por nombre de FK:

```ts
supabase.from("transferencias").select(`
  id_transferencia,
  motivo,
  sede_origen_rel:sedes!transferencias_sede_origen_fkey ( nombre_sede ),
  sede_destino_rel:sedes!transferencias_sede_destino_fkey ( nombre_sede ),
  responsable_origen_rel:profiles!transferencias_responsable_origen_fkey ( nombre, apellido ),
  ...
`)
```

Sin el nombre de la FK, Supabase no puede desambiguar qué relación embeber y devuelve error `PGRST201`.

#### Sentinel `__desconocido__` en el Select de responsable

shadcn/ui `Select` requiere un `value` string para cada item. Para "Desconocido" se usa el sentinel `"__desconocido__"`: al detectarlo, el handler guarda `responsable_destino_texto = "Desconocido"` y `responsable_destino = ""`. Al reconstruir el valor del Select en los `useMemo`, si el texto es exactamente `"Desconocido"` se muestra el sentinel de vuelta — así el dropdown refleja bien el estado.

---

## 2026-04-18 — Imágenes de bienes, panel de control y mejoras de tablas

### Funcionalidades

#### 📸 Subida de imágenes de bienes
- Al crear o editar un bien se puede subir una foto (JPG, PNG, WEBP, máx. 5 MB).
- En la lista `/bienes` aparece una miniatura 40×40 en cada fila (o ícono placeholder si no hay imagen).
- La subida va directo del navegador a Supabase Storage, evitando el límite de 4.5 MB de Server Actions en Vercel.
- Nombre del archivo generado con `crypto.randomUUID()` para evitar colisiones.

#### 🗂️ Modal de detalle de un bien
- Al hacer clic en una fila de la tabla de bienes se abre un modal con:
  - Imagen grande (contenedor de 256 px, `object-contain`)
  - Código, nombre, fecha de registro, estado
  - Cantidad, valor unitario, valor total
  - Sede, área, responsable, placa, serial, observaciones
  - Botón **Editar** que lleva al formulario
- El ícono del ojo en la fila conserva la ruta directa a edición (`stopPropagation` sobre el clic).

#### 📊 Panel de control (`/inicio`)
- **Timeline de actividad reciente** — lee las últimas 10 entradas de `movimiento_bienes`:
  - Ícono + color según `tipo_movimiento` (REGISTRO, MODIFICACION, TRANSFERENCIA, BAJA)
  - Detalle del movimiento, usuario responsable, código del bien y fecha relativa ("hace 2 h", "ayer") con `Intl.RelativeTimeFormat` (sin dependencias).
- **Gráfico de bienes activos por sede** — barras horizontales con [recharts](https://recharts.org/). Ordenado descendente.
- Layout de 2 columnas en `lg+`, apilado en mobile.

#### 🔢 Columnas ordenables en todas las tablas
- `/bienes` — Código, Nombre, Sede, Área, Responsable, Estado, Valor Total.
- `/sedes` — #, Nombre, Abreviatura, Ciudad, Dirección, Creación.
- `/areas` — #, Nombre, Estado, Fecha de Creación.
- Componente reutilizable `components/ui/sortable-header.tsx` — Button + `ArrowUpDown` + `column.toggleSorting`.

### Cambios técnicos en base de datos

#### Tabla `bienes`
- Campo `imagen_url` (ya existía en el esquema) ahora **se escribe** desde los RPCs y **se lee** en la lista, detalle y edición.

#### RPCs `crear_bien_con_auditoria` / `actualizar_bien_con_auditoria`
- Nuevo parámetro `p_imagen_url text default null`.
- En el `insert`/`update` sobre `bienes` se aplica `nullif(trim(p_imagen_url), '')` para normalizar strings vacíos como NULL.
- `grant execute` actualizado con la nueva firma (14 / 15 parámetros respectivamente).

#### Supabase Storage
- Nuevo bucket **`bienes`** (público).
- Policies sobre `storage.objects` restringidas al bucket `bienes`:
  - `bienes_public_read` — SELECT para cualquiera.
  - `bienes_authenticated_insert` — INSERT solo autenticados.
  - `bienes_authenticated_update` — UPDATE solo autenticados.
  - `bienes_authenticated_delete` — DELETE solo autenticados.

#### RLS sobre `movimiento_bienes`
- Se habilita RLS y se crea policy `authenticated_can_read_movimiento_bienes` (SELECT, rol `authenticated`, `using (true)`).
- Antes la tabla quedaba opaca al frontend: los RPCs insertaban correctamente (son `security invoker` y corren en el mismo `with check` que el caller), pero las queries desde `/inicio` no devolvían nada.

### Migraciones añadidas

| Archivo | Contenido |
|---------|-----------|
| `supabase/migrations/20260418200000_bienes_imagen_storage.sql` | Bucket `bienes`, 4 policies de storage, `create or replace` de los dos RPCs con `p_imagen_url` |
| `supabase/migrations/20260418210000_movimiento_bienes_read_policy.sql` | `enable row level security` + policy de SELECT en `movimiento_bienes` |

### Cambios en frontend

| Archivo | Cambio |
|---------|--------|
| `app/(dashboard)/bienes/bien-form.tsx` | Sección "Imagen" con preview, validación cliente, subida a Storage desde el navegador |
| `app/(dashboard)/bienes/bienes-table.tsx` | Columna de miniatura, fila clickeable, headers ordenables, integración del modal de detalle |
| `app/(dashboard)/bienes/bien-detail-dialog.tsx` | **Nuevo** — modal con imagen grande y campos del bien |
| `app/(dashboard)/bienes/actions.ts` | Propagación de `imagen_url` a los RPCs |
| `app/(dashboard)/bienes/page.tsx` | Añade `imagen_url`, `serial`, `observaciones` a la query de la lista |
| `app/(dashboard)/bienes/[id]/page.tsx` | Añade `imagen_url` a la query de edición |
| `app/(dashboard)/inicio/page.tsx` | Layout de 2 columnas, quita el placeholder |
| `app/(dashboard)/inicio/actividad-reciente.tsx` | **Nuevo** — timeline con fechas relativas |
| `app/(dashboard)/inicio/bienes-por-sede.tsx` | **Nuevo** — server component con agregación por sede |
| `app/(dashboard)/inicio/bienes-por-sede-chart.tsx` | **Nuevo** — chart cliente con recharts |
| `app/(dashboard)/sedes/sedes-table.tsx` | Añade `getSortedRowModel` + headers con `SortableHeader` |
| `app/(dashboard)/areas/areas-table.tsx` | Igual que sedes |
| `components/ui/sortable-header.tsx` | **Nuevo** — header reutilizable con botón de sort |
| `lib/validations/bien.ts` | Campo `imagen_url` opcional en los Zod schemas (create y update, ambos para TS y para FormData) |

### Dependencias

- **`recharts`** agregada (`npm install recharts`) para los gráficos del dashboard.

### Observaciones técnicas

#### Lectura de relaciones FK embebidas en Supabase

En versiones recientes de `@supabase/supabase-js`, al embeber una relación *belongs-to* (por ejemplo `bienes → sedes`), la respuesta llega como **objeto único** y no como array. El código previo leía `sedes?.[0]?.nombre_sede`, lo que siempre devolvía `undefined` y por eso las columnas Sede, Área y Responsable salían vacías.

La solución aplicada en la tabla de bienes y en el modal de detalle: un helper `unwrap()` que acepta objeto o array y devuelve el valor único. Esto deja el código tolerante a cambios futuros de shape:

```ts
function unwrap<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}
```

#### Mantenimiento del proyecto Supabase (plan gratuito)

El proyecto de Supabase se pausa automáticamente tras ~7 días sin actividad en plan gratuito. Se instaló un keep-alive con `pg_cron` que inserta en una tabla `public.keepalive` cada lunes a las 09:00 UTC.

> Nota: en casos observados, la actividad puramente interna de Postgres no siempre basta para que Supabase considere el proyecto "activo". Si vuelve a pausarse, la alternativa robusta es un cron externo (GitHub Actions o Vercel Cron) que haga `fetch` al endpoint REST de Supabase.

---

## Estado actual del proyecto

### Módulos completos
- Autenticación (login, registro, recuperación de contraseña)
- **Bienes** — CRUD + imagen + modal de detalle
- **Sedes** — CRUD
- **Áreas** — CRUD
- **Panel de control** — KPIs + actividad reciente + gráfico por sede

### Módulos pendientes (stubs "Módulo en construcción")
- `/bajas` — dar de baja activos (tabla `bajas` ya definida en esquema)
- `/transferencias` — mover activos entre sedes/áreas (tabla `transferencias` ya definida)
- `/historial` — visualizador del log `movimiento_bienes`
- `/reportes` — analíticas por sede, área, tipo, costo
- `/usuarios` — gestión de usuarios y roles (ADMINISTRADOR / ESTANDAR / CONSULTOR)

### Otras brechas conocidas
- Control de acceso por rol (RBAC) definido en AGENTS.md pero sin guards en las páginas.
- Hooks personalizados de React Query (`use-bienes`, etc.) mencionados en AGENTS.md pero aún no creados.

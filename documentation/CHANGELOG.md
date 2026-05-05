# Changelog

Cambios relevantes del proyecto SYSTEMACT, ordenados del más reciente al más antiguo.

---

## 2026-05-05 — SEO básico y metadatos públicos

### Funcionalidad

- Se mejora la metadata global del sitio:
  - título con template (`%s | SYSTEMACT`);
  - descripción en español;
  - keywords relevantes;
  - autor, creator y publisher como Conviventia;
  - canonical de la portada;
  - favicon/apple icon usando el logo existente.
- Se configura Open Graph y Twitter Card con las imágenes existentes `opengraph-image.png` y `twitter-image.png`.
- La portada `/` incluye metadata específica y JSON-LD tipo `SoftwareApplication`.
- Se añade `robots.txt` y `sitemap.xml`.
- Se marca `noindex, nofollow` para rutas de autenticación y panel interno.
- El proxy excluye `robots.txt` y `sitemap.xml` para que sean públicos y no redirijan al login.

### Verificación

- ✅ `npm run lint`
- ✅ `npm run build`
- ✅ `npm run test:e2e` — 6 tests pasan, incluyendo smoke test de metadata SEO

---

## 2026-05-05 — Portada pública minimalista

### Funcionalidad

- Se reemplaza la raíz vacía por una portada pública en `/`.
- Incluye logo de Conviventia, nombre SYSTEMACT, botones **Iniciar sesión** y **Registrarse**.
- El diseño es sobrio y minimalista: fondo blanco, tipografía limpia, acciones claras y una fila discreta con módulos clave (Bienes, Transferencias, Reportes).
- `/` queda como ruta pública; las rutas protegidas siguen redirigiendo a `/auth/login` cuando no hay sesión.
- Se revisan y traducen los módulos públicos de autenticación: login, registro, recuperación de contraseña, actualización de contraseña, errores de confirmación y botones auxiliares.
- El atributo raíz queda como `lang="es"` para alinear accesibilidad e idioma con la UI.

### Cambios técnicos

| Archivo | Cambio |
|---------|--------|
| `app/page.tsx` | Nueva portada pública |
| `lib/supabase/proxy.ts` | `/` deja de redirigir automáticamente |
| `proxy.ts` | El matcher excluye todo `/_next/*` para no interferir con assets, HMR e internals de Next |
| `components/login-form.tsx` | El botón de login espera hidratación para evitar submit HTML nativo en E2E |
| `tests/e2e/auth.spec.ts` | Smoke test de la portada pública |
| `tests/e2e/authenticated.spec.ts` | Flujos autenticados serializados con espera de hidratación |
| `eslint.config.mjs` | Ignora reportes generados por Playwright |

### Verificación

- ✅ `npm run lint`
- ✅ `npm run build`
- ✅ `npm run test:unit`
- ✅ `npm run test:e2e` — 5 tests pasan

---

## 2026-05-05 — Suite base de pruebas automatizadas (semana 11)

### Funcionalidades

- Se añade **Vitest** para pruebas unitarias de reglas pequeñas pero críticas:
  - Validaciones Zod de bienes, transferencias, bajas y categorías.
  - Helpers de Excel (`createWorkbook`, `styleHeader`, `workbookToBuffer`, `xlsxResponseHeaders`, `timestampSuffix`, `unwrap`).
- Se añade **Playwright** para pruebas E2E:
  - Redirección de rutas protegidas al login cuando no hay sesión.
  - Protección de descargas Excel sin sesión.
  - Flujos autenticados opcionales con `E2E_USER_EMAIL` y `E2E_USER_PASSWORD` leídos desde `.env.local` o variables de entorno:
    - Navegación principal visible.
    - Descarga del inventario general en Excel.

### Scripts añadidos

| Script | Propósito |
|--------|-----------|
| `npm run test` | Vitest en modo watch |
| `npm run test:unit` | Unitarias en modo CI |
| `npm run test:e2e` | Playwright headless |
| `npm run test:e2e:ui` | Playwright UI |
| `npm run check` | `lint` + `build` + `test:unit` |

### Cambios añadidos

| Archivo | Cambio |
|---------|--------|
| `vitest.config.ts` | Config de Vitest con alias `@/*` |
| `playwright.config.ts` | Config E2E con web server local en `127.0.0.1:3000` y carga de `.env.local` |
| `tests/unit/validations.test.ts` | Pruebas de validaciones de negocio |
| `tests/unit/excel.test.ts` | Pruebas de helpers de Excel |
| `tests/e2e/auth.spec.ts` | Smoke tests sin sesión |
| `tests/e2e/authenticated.spec.ts` | Flujos autenticados opcionales |

### Verificación

- ✅ `npm run lint`
- ✅ `npm run build`
- ✅ `npm run test:unit` — 11 tests pasan
- ✅ `npm run test:e2e` — 4 tests pasan con credenciales E2E locales en `.env.local`

### Seguridad de credenciales E2E

Las variables `E2E_USER_EMAIL` y `E2E_USER_PASSWORD` no se versionan. Deben vivir en `.env.local` o en secretos del entorno de CI. El archivo `.env.local` está ignorado por Git.

### Pendiente de semana 11

La suite automatizada cubre una base técnica inicial. Sigue pendiente la **validación funcional con usuarios reales** y registro de resultados/ajustes de usabilidad con el equipo de Conviventia.

---

## 2026-05-04 — Exportación a Excel (cierre del entregable de Reportes)

### Funcionalidades

#### 📥 Exportación a Excel desde 3 puntos del sistema

- **`/reportes`** — botón "Exportar a Excel" cuando hay persona seleccionada. Descarga `inventario-<apellido>-<nombre>-<timestamp>.xlsx` con encabezado de la persona (cédula, cargo, sede, área, fecha) + tabla de bienes asignados con totales.
- **`/bienes`** — botón "Exportar" en el header. Descarga `bienes-<timestamp>.xlsx` con todos los bienes del inventario operativo (excluye `DE BAJA`). Incluye auto-filtros y panel congelado en el header para navegación rápida.
- **`/historial`** — botón "Exportar a Excel" cuando hay bien seleccionado. Descarga `historial-<código>-<timestamp>.xlsx` con **3 hojas**:
  1. **Información del bien** (campos en formato vertical).
  2. **Baja** (solo si el bien fue dado de baja — motivo, fecha, descripción, autor).
  3. **Movimientos** (timeline cronológico con auto-filtros).

### Diseño técnico

#### Library: `exceljs`

Se eligió [`exceljs`](https://github.com/exceljs/exceljs) sobre `xlsx` (SheetJS) por soporte nativo de:
- **Formato de moneda colombiana** (`"$"#,##0;[Red]-"$"#,##0`) sin decimales.
- **Estilos por celda**: encabezados con fondo `slate-200`, totales con fondo `slate-100`, bordes inferiores.
- **Auto-filtros y freeze panes** para tablas grandes (`/bienes` con 500+ filas sigue siendo navegable).
- **Múltiples hojas por workbook** (necesario para el historial: info + baja + movimientos en un solo archivo).

#### Route Handlers en lugar de Server Actions

Las descargas se hacen con **Route Handlers** (`app/api/export/*/route.ts`), no con Server Actions, por dos razones:

1. **UX directa**: el botón es un `<a href="/api/export/...">` que el navegador maneja como descarga nativa (con barra de progreso, ubicación elegida por el usuario, etc.). Sin Server Action, sin estado de loading, sin Blob/base64 intermedio.
2. **Sin límite de payload**: Server Actions en Vercel tienen límite de 4.5 MB. Aunque hoy los exports son pequeños (~50 KB), un export de inventario completo de Conviventia podría crecer.

Cada handler:
- Valida sesión con `supabase.auth.getUser()` (RLS se aplica naturalmente).
- Lee parámetros de query (`?persona=<uuid>`, `?bien=<id>`).
- Ejecuta queries con joins para resolver nombres de sede, área, responsable, tipo.
- Construye el workbook con el helper `lib/export/excel.ts`.
- Devuelve el buffer con `Content-Disposition: attachment; filename="..."`.

#### Helper compartido `lib/export/excel.ts`

Centraliza:
- `createWorkbook()` — instancia con metadata del proyecto.
- `HEADER_STYLE` y `TOTAL_STYLE` — estilos reutilizables.
- `COP_FORMAT` — formato de moneda colombiana.
- `xlsxResponseHeaders(filename)` — headers HTTP correctos con sanitización ASCII del nombre.
- `timestampSuffix()` — sufijo `yyyymmdd-hhmm` para nombres de archivo únicos.
- `unwrap<T>()` — helper para relaciones FK de Supabase (objeto vs array).

### Cambios añadidos

| Archivo | Cambio |
|---------|--------|
| `package.json` | Añade dependencia `exceljs` |
| `lib/export/excel.ts` | **Nuevo** — helpers de estilo, headers HTTP, timestamps |
| `app/api/export/inventario-persona/route.ts` | **Nuevo** — Excel del reporte por persona |
| `app/api/export/bienes/route.ts` | **Nuevo** — Excel del listado completo de bienes |
| `app/api/export/historial/route.ts` | **Nuevo** — Excel con 3 hojas (info + baja + movimientos) |
| `app/(dashboard)/reportes/page.tsx` | Añade botón "Exportar a Excel" cuando hay persona seleccionada |
| `app/(dashboard)/bienes/page.tsx` | Añade botón "Exportar" en el header |
| `app/(dashboard)/historial/page.tsx` | Añade botón "Exportar a Excel" cuando hay bien seleccionado |

### Sin cambios en BD

Toda la lógica vive en código TypeScript del lado del servidor. Ninguna migración.

### Cierre completo del cronograma 1-10

Con esto los entregables 1-10 del plan original están **totalmente cubiertos**:
- ✅ Reportes con exportación a Excel (semana 10).
- ✅ Filtros avanzados (semana 7).
- ✅ Categorías (semana 3-4).
- ✅ Bajas (semana 8-9).
- ✅ Transferencias (semana 8-9).
- ✅ Bienes (semana 5-6).
- ✅ Roles y RBAC (semana 3-4).

El siguiente bloque es **semana 11 — Pruebas funcionales y ajustes de usabilidad** (validación con usuarios reales) y **semana 12 — Documentación y cierre** (manual técnico, manual de usuario, presentación final).

---

## 2026-05-04 — Filtros avanzados + módulo de Categorías (cierre de deudas semanas 3-4 y 7)

### Funcionalidades

#### 🔍 Filtros estructurados en `/bienes`

Hasta hoy `/bienes` solo tenía búsqueda global por texto. Se añade una **barra de filtros** con 4 selectores combinables:

- **Sede** — todas las sedes registradas.
- **Área** — solo áreas activas.
- **Tipo de bien** — todas las categorías (`caracteristicas`).
- **Estado** — Activo o Inactivo (los `DE BAJA` siguen filtrados a nivel de query).

Los filtros se combinan con AND. Un contador "Limpiar (N)" aparece cuando hay filtros activos para resetear todo de un click. La búsqueda global sigue funcionando encima de los filtros.

#### 🏷️ Módulo `/categorias` — CRUD de tipos de bien

Cierra el entregable pendiente de las semanas 3-4 del plan (que decía "CRUD de categorías"). La tabla subyacente es `caracteristicas` (los tipos con prefijo para los códigos automáticos), pero la UI la llama "Categorías" porque es el término que pide el plan.

- Lista con búsqueda global, orden por columnas y paginación de 15 filas.
- Columna **"Bienes"** que muestra cuántos bienes están registrados con esa categoría (count agregado vía Supabase relación).
- Botón **"Nueva categoría"** (solo ADMIN) abre dialog con:
  - Código (prefijo) — input mayúsculas con regex `/^[A-Z0-9]{2,8}$/`.
  - Descripción — texto libre, 3-120 caracteres.
  - Observaciones — textarea opcional, máx. 500 caracteres.
- Botón "Editar" por fila (ícono de lápiz, solo ADMIN) reusa el mismo dialog.
- **No hay borrado**: hay FK desde `bienes.id_caracteristica`. Si se necesita "ocultar" una categoría a futuro, se agrega un campo `activo`.

### Diseño técnico

#### Filtros como `useMemo` sobre el dataset cliente

La data de `/bienes` se carga completa en server (sin paginación a nivel BD). Los filtros se aplican en cliente con `useMemo`, así no hay round-trips por cada cambio de selector. Para el volumen esperado (~500-2000 bienes activos), es más rápido y simple que filtros server-side.

#### Sentinel `__all__` en los Selects

shadcn/ui `Select` requiere un `value` string para cada item; "todas las sedes" no puede ser `""` ni `null`. Se usa un sentinel `"__all__"` que el componente trata como "sin filtro".

#### Ruta `/categorias` apunta a tabla `caracteristicas`

Decisión de naming:
- **DB** mantiene `caracteristicas` (no se renombra para no romper FK ni RPCs).
- **UI** usa "Categorías" (alineado con el plan original y el lenguaje de Conviventia).
- Mapeo en server actions: `crearCategoria` hace insert en `caracteristicas`.

### Cambios en frontend

| Archivo | Cambio |
|---------|--------|
| `lib/constants.ts` | Añade ítem "Categorías" al sidebar (`Tag` icon) |
| `lib/validations/categoria.ts` | **Nuevo** — schemas Zod (TS + FormData) con regex de código, longitudes |
| `app/(dashboard)/categorias/page.tsx` | **Reemplaza el stub previo (no existía aún)** — server component con count agregado |
| `app/(dashboard)/categorias/categorias-table.tsx` | **Nuevo** — tabla con badge de código, contador de bienes, sortable |
| `app/(dashboard)/categorias/categoria-dialog.tsx` | **Nuevo** — modal de crear/editar con auto-uppercase del código |
| `app/(dashboard)/categorias/actions.ts` | **Nuevo** — `crearCategoria` / `actualizarCategoria` con guard ADMIN, manejo de duplicados (`23505`) |
| `app/(dashboard)/bienes/page.tsx` | Carga sedes, áreas y categorías en paralelo + bienes con FKs incluidas (`id_sede`, `id_area`, `id_caracteristica`, joins de `caracteristicas`) |
| `app/(dashboard)/bienes/bienes-table.tsx` | Estado de 4 filtros + memo de filtrado + barra de filtros con icono `Filter` y botón "Limpiar (N)" |

### Sin cambios en BD

La tabla `caracteristicas` ya existía con todos los campos necesarios (`codigo`, `descripcion`, `observaciones`). El CRUD escribe directo a la tabla con las RLS existentes (`caracteristicas_insert` y `caracteristicas_update` ya restringen a ADMIN/ESTANDAR; el server action restringe a ADMIN).

### Cierre de deudas del cronograma

Con esto quedan cubiertas las dos deudas que arrastrábamos del plan:

- ✅ **Semana 3-4** — CRUD de categorías (faltaba la UI).
- ✅ **Semana 7** — Filtros estructurados en consultas (la búsqueda global existía, faltaban los filtros).

El cronograma 1-10 está totalmente cerrado. Sigue **semana 11 — Pruebas y ajustes finales** (validación con usuarios reales) y **semana 12 — Documentación y cierre**.

---

## 2026-05-04 — Reportes e historial (semana 10 del plan)

### Funcionalidades

#### 📊 `/reportes` — Inventario por persona

- Selector de persona (todos los perfiles activos, ordenados por nombre).
- Encabezado con datos del responsable: cédula, cargo, área, sede, número de bienes asignados, cantidad total.
- Tabla con todos los bienes activos asignados a esa persona:
  - Columnas: código, nombre, sede, área, placa/serial, estado, cantidad, valor unitario, valor total.
  - Filtra automáticamente bienes en estado `DE BAJA` (no aparecen en el reporte).
  - Footer con totales agregados (cantidad total + valor total en COP).
- Selección reactiva por query string (`?persona=<uuid>`) — al cambiar el selector, la URL se actualiza y la tabla se rehidrata.
- Soporte de impresión: clases `print:` ocultan navegación y selector al imprimir, y muestran un footer "Generado por SYSTEMACT · Conviventia · <fecha>". Para exportar a PDF, el usuario imprime con Ctrl+P / Cmd+P y elige "Guardar como PDF".

#### 📜 `/historial` — Trazabilidad por bien

- Selector de bien (todos los bienes, mostrando código + nombre, con sufijo de estado si no es ACTIVO).
- Panel de información actual: código, nombre, estado (badge coloreado), sede, área, responsable, cantidad, valor unitario, valor total, placa, serial.
- Si el bien está en estado `DE BAJA`: alerta roja con motivo, fecha y descripción de la baja.
- **Timeline cronológico** de movimientos (`movimiento_bienes`):
  - Línea vertical con íconos coloreados por tipo: REGISTRO (azul), MODIFICACIÓN (ámbar), TRANSFERENCIA (púrpura), BAJA (rojo).
  - Cada evento: tipo + fecha completa + detalle + usuario que lo registró.
  - Orden cronológico ascendente (del más antiguo al más reciente).
- Bloque de observaciones del bien si existen.
- Mismo soporte de impresión que `/reportes`.

### Diseño técnico

#### Por qué Server Components + searchParams

Ambas páginas usan el patrón **Server Component con searchParams** en lugar de fetch en cliente:

- La selección persiste en URL (`/reportes?persona=<uuid>`, `/historial?bien=<id>`) — compartible, marcable, atrás/adelante del navegador funcionan.
- No hace falta estado cliente ni React Query — el fetch ocurre en server, lo que renderiza Next.js es HTML ya con datos.
- `Suspense` con `key={selección}` re-monta el contenido al cambiar la selección, mostrando el skeleton mientras carga.
- El selector cliente (`PersonaSelector`, `BienSelector`) solo hace `router.push()` con el nuevo query — es muy delgado.

#### Reutilización de componentes existentes

El timeline reusa el mismo sistema de íconos y colores que [actividad-reciente.tsx](app/(dashboard)/inicio/actividad-reciente.tsx). En el futuro, si se quiere extraer a `components/shared/movimientos-timeline.tsx`, ya están alineados visualmente.

### Cambios en frontend

| Archivo | Cambio |
|---------|--------|
| `app/(dashboard)/reportes/page.tsx` | **Reemplaza el stub** — server component con selector + tabla por persona |
| `app/(dashboard)/reportes/persona-selector.tsx` | **Nuevo** — selector cliente que actualiza el query string |
| `app/(dashboard)/historial/page.tsx` | **Reemplaza el stub** — server component con info del bien + timeline + alerta de baja |
| `app/(dashboard)/historial/bien-selector.tsx` | **Nuevo** — selector cliente con código + nombre + estado |

### Sin cambios en BD

Toda la data ya estaba disponible: `movimiento_bienes` se llena automáticamente desde los RPCs de `crear_bien_con_auditoria`, `actualizar_bien_con_auditoria`, `crear_transferencia` y `crear_baja`. Las dos páginas son consultas con `select` + joins. Cero migraciones.

### Cierre del entregable de la semana 10

Con esto queda completo el bloque "Reportes de inventario por persona y de movimientos. Ambos reportes funcionales" del plan original. El siguiente bloque del cronograma es **semana 11 — Pruebas y ajustes finales** (pruebas funcionales, correcciones de errores, ajustes de usabilidad) y **semana 12 — Documentación y cierre del proyecto** (manual técnico, manual de usuario, presentación final).

### Pendiente del plan que sigue sin implementar

- **Categorías** (semana 3-4) — no tiene CRUD de UI; el equivalente más cercano es `caracteristicas` que ya carga desde el seed.
- **Filtros avanzados** (semana 7) — hoy hay búsqueda global y orden por columna; faltan filtros estructurados por sede / área / estado / rango de valor.

---

## 2026-05-04 — Módulo de Bajas (semana 8-9 del plan)

### Funcionalidades

#### 📦 Dar de baja un bien

- Página `/bajas/nueva` (solo ADMIN) con formulario de baja:
  - Selector de bien (solo bienes en estado `ACTIVO`).
  - Panel "información actual" del bien (sede, área, responsable, cantidad, valor) en modo lectura.
  - Select de motivo (los 7 tipos del CHECK: `DAÑO IRREPARABLE`, `OBSOLESCENCIA`, `ROBO`, `PERDIDA`, `DONACION`, `VENTA`, `OTRO`).
  - Textarea de descripción opcional (máx. 500 caracteres).
  - Banner de advertencia: "Esta acción es irreversible".
  - **Confirmación doble** antes de submit — modal con código del bien, motivo y mensaje "Esta acción no puede deshacerse".
  - Acepta query param `?bien=<id>` para preseleccionar desde el modal de detalle.

#### 📜 Historial `/bajas`

- Tabla histórica con columnas: Fecha, Bien (código + nombre), Motivo (badge con color por tipo), Descripción (con tooltip si excede), Quién registró.
- Búsqueda global, orden por fecha/bien/motivo, paginación de 15 filas.
- Misma estética que `/transferencias`.

#### 🔗 Integración con `/bienes`

- Modal de detalle de bien: nuevo botón **"Dar de baja"** (rojo, destructive) visible solo si rol = ADMIN y `estado = 'ACTIVO'`. Navega a `/bajas/nueva?bien=<id>`.
- Listado `/bienes` ahora **excluye** bienes en estado `DE BAJA` por defecto. Esos viven solo en `/bajas`. ACTIVO + INACTIVO siguen visibles.

### Cambios en base de datos

#### Nuevo RPC `crear_baja(p_id_bien, p_motivo, p_descripcion, p_usuario_registro)`

`security invoker` + `set search_path = public`. Validaciones por orden:

1. `perform require_rol_admin()` — solo admin activo.
2. `p_usuario_registro = auth.uid()` — el caller no puede falsificar el autor de la baja. Si no coincide, `raise exception` con código `42501`.
3. Motivo válido contra el array de los 7 tipos (mensaje claro antes que el CHECK constraint).
4. `select … for update` sobre el bien.
5. Bien debe existir y estar `ACTIVO`.
6. No puede haber ya una baja registrada para ese mismo `id_bien` (no doble baja).

Efectos transaccionales:
- `insert into bajas` con motivo, descripción, usuario_registro.
- `update bienes set estado = 'DE BAJA', updated_at = now()`.
- `insert into movimiento_bienes` con `tipo_movimiento = 'BAJA'` y detalle formateado: `"Baja de <código> (<nombre>): <motivo>"`.

### Por qué `usuario_registro` no es editable

Se evaluó si el formulario debería permitir escoger al "autor" de la baja. La decisión fue **no**: el RPC fuerza `p_usuario_registro = auth.uid()` y el server action no expone el campo. Razones:

- **No repudio**: si el autor se puede escoger, la auditoría se vuelve cosmética.
- **Consistencia**: `crear_bien_con_auditoria` y `crear_transferencia` ya usan el mismo patrón.
- **Cumplimiento**: como ONG, Conviventia es auditada por entes externos (DIAN, Cámara de Comercio, donantes); el log debe ser firme.

### Cambios en frontend

| Archivo | Cambio |
|---------|--------|
| `lib/validations/baja.ts` | **Nuevo** — schemas Zod (TS + FormData con `z.coerce`) usando `MOTIVOS_BAJA` |
| `app/(dashboard)/bajas/page.tsx` | **Reemplaza el stub** — guard de auth, query con joins, header con botón "Nueva Baja" condicional |
| `app/(dashboard)/bajas/bajas-table.tsx` | **Nuevo** — tabla con badge de motivo coloreado por tipo |
| `app/(dashboard)/bajas/nueva/page.tsx` | **Nuevo** — `requireRol(ADMIN_ONLY)`, carga bienes activos |
| `app/(dashboard)/bajas/baja-form.tsx` | **Nuevo** — form con info-card del bien, select de motivo, textarea, banner de advertencia, dialog de confirmación |
| `app/(dashboard)/bajas/actions.ts` | **Nuevo** — server action `crearBaja` con validación ADMIN + Zod |
| `app/(dashboard)/bienes/bien-detail-dialog.tsx` | Nuevo prop `canDarDeBaja`; botón "Dar de baja" rojo cuando rol=ADMIN y estado=ACTIVO |
| `app/(dashboard)/bienes/bienes-table.tsx` | Propaga `canDarDeBaja` al modal de detalle |
| `app/(dashboard)/bienes/page.tsx` | Lee rol, calcula `canDarDeBaja`; query filtra `.neq("estado", "DE BAJA")` |

### Migración añadida

| Archivo | Contenido |
|---------|-----------|
| `supabase/migrations/_archive/20260504100000_crear_baja_rpc.sql` | RPC `crear_baja` con todas las validaciones |

El baseline `00000000000000_initial_schema.sql` ya incluye `crear_baja` para que cualquier clone limpio lo tenga sin necesidad de aplicar la migración archivada.

### Cierre del entregable de la semana 8-9

Con esto queda completo el bloque "Transferencias y bajas" del plan original. El siguiente entregable es **semana 10 — Reportes** (inventario por persona, inventario por bien con historial de movimientos).

---

## 2026-05-03 — Control de acceso por rol (RBAC) + módulo `/usuarios` + esquema reproducible

### Funcionalidades

#### 🔐 Modelo de tres roles aplicado de punta a punta

Se materializó el modelo de roles que ya existía en el esquema (`profiles.rol`) pero estaba sin guards. Tres roles:

| Rol             | Lectura | Escritura inventario | Transferencias | Bajas | Sedes/Áreas | Usuarios |
|-----------------|---------|----------------------|----------------|-------|-------------|----------|
| `ADMINISTRADOR` | Todo    | ✓                    | ✓              | ✓     | ✓           | ✓        |
| `ESTANDAR`      | Todo    | ✓                    | ✓              | ✗     | ✗           | ✗        |
| `CONSULTOR`     | Todo    | ✗                    | ✗              | ✗     | ✗           | ✗        |

Tres capas de defensa coordinadas:
1. **RLS** sobre cada tabla — frontera de la BD.
2. **RPCs `security invoker`** que llaman `require_rol_escritura()` o `require_rol_admin()` antes de tocar datos.
3. **Server actions** y **guards de página** (`requireRol`) en Next.js — defensa en profundidad y mejor UX.

#### 👥 Módulo `/usuarios`

- Página con tabla de todos los usuarios (nombre, email, cédula, sede, rol, estado, fecha de registro).
- Búsqueda global, orden por columna, paginación de 15 filas (mismo patrón que las otras tablas).
- Por fila, dropdown de acciones:
  - **Cambiar rol**: selector de los 3 roles, marca el actual, deshabilita la opción ya seleccionada.
  - **Activar / Desactivar**: bloqueado para uno mismo (no puedes desactivarte) y para el último admin activo del sistema (validado en BD).
- Email viene de `auth.users` vía RPC `listar_usuarios_admin` (security definer + validación de admin al inicio + EXECUTE revocado de `public`/`anon`).

#### 🎛️ UI condicional según rol

- Sidebar: ítem "Usuarios" solo para ADMIN; "Bajas" solo para ADMIN. "Transferencias" y "Reportes" abiertos a los 3 roles (lectura).
- En `/bienes`: botón "Nuevo Bien" oculto para CONSULTOR. Ícono de editar por fila también.
- En `/transferencias`: botón "Nueva Transferencia" oculto para CONSULTOR.
- En `/sedes` y `/areas`: botón de crear y dialog de editar ocultos para no-ADMIN. El toggle de estado de área se renderiza como badge plano (sin botón) para no-ADMIN.
- Modal de detalle de bien: botón "Editar" oculto para CONSULTOR; "Cerrar" siempre visible.

### Cambios en base de datos

#### Helpers de rol
- `current_user_rol() returns text` — invoker, lo usa el frontend.
- `require_rol_escritura()` — lanza excepción si el caller no es ADMIN/ESTANDAR activo.
- `require_rol_admin()` — lanza excepción si no es ADMIN activo.

#### RPCs nuevos
- `actualizar_rol_usuario(p_id uuid, p_nuevo_rol text)` — solo admin; protege que no quede el sistema sin admins activos.
- `set_usuario_activo(p_id uuid, p_activo boolean)` — solo admin; misma protección de "último admin".
- `listar_usuarios_admin()` — security definer (necesita `auth.users.email`); valida admin antes de devolver datos; EXECUTE revocado de `public`/`anon`.

#### RPCs existentes con validación de rol
`crear_bien_con_auditoria`, `actualizar_bien_con_auditoria` y `crear_transferencia` ahora hacen `perform require_rol_escritura()` antes de cualquier `insert`/`update`. Firmas idénticas — el frontend no cambia.

#### RLS sobre `profiles`
Se abre la lectura de `profiles` a usuarios autenticados (necesario para el módulo `/usuarios` y para resolver responsables en otras pantallas). Las escrituras siguen restringidas: cada usuario edita su propio perfil; cualquier perfil se edita siendo admin.

#### Lectura de `bienes` abierta a CONSULTOR
La policy original `bienes_select` filtraba CONSULTOR a "solo bienes donde es responsable" — eso bloqueaba el caso de uso "consultor ve el inventario completo en modo lectura", que es el que pide el plan original. Se simplifica a `using (true)` para todos los autenticados; las escrituras siguen restringidas por `bienes_update` y los RPCs.

### 📦 Esquema reproducible (open source ready)

Hasta ahora el esquema base (tablas, funciones base, triggers, RLS) había sido creado manualmente desde Supabase Studio — no existía un archivo SQL que cualquier persona pudiera correr para levantar el backend desde cero.

#### Migración baseline
- `supabase/migrations/00000000000000_initial_schema.sql` — **un solo archivo idempotente** que crea todo el esquema: 9 tablas con FKs y CHECKs, 14 funciones (helpers + RPCs), 25 políticas RLS, 1 bucket de Storage con 4 policies, 3 triggers (incluyendo `auth.users → profiles`).
- Las 10 migraciones incrementales anteriores se mueven a `supabase/migrations/_archive/` con un README que explica qué hacía cada una. No se ejecutan en `supabase db reset` — su contenido ya está consolidado en el baseline.

#### Datos de ejemplo
- `supabase/seed.sql` — sedes (4), áreas (6) y características (9 tipos de bien con prefijos para códigos automáticos). Idempotente con `on conflict do nothing`. Se carga automáticamente con `supabase db reset` y manualmente con `psql -f` para proyectos en cloud.

#### Bootstrap del primer admin
`handle_new_user` ahora crea perfiles con rol `CONSULTOR` por defecto (antes era `ADMINISTRADOR`, lo cual era un agujero para un proyecto open source). El primer admin se promueve manualmente con un `update profiles set rol = 'ADMINISTRADOR'` después de registrarse desde la app — está documentado en `supabase/README.md`.

#### Setup local
- `supabase/config.toml` — configuración del Supabase CLI: puertos, schemas expuestos, auth, storage, seed paths.
- `supabase/README.md` — instrucciones paso a paso para levantar el backend en local (Docker) o en cloud, crear el primer admin y hacer cambios al esquema.

### Cambios en frontend

| Archivo | Cambio |
|---------|--------|
| `lib/auth/require-rol.ts` | **Nuevo** — `getAuthContext()` y `requireRol(roles)` para server components; constantes `ADMIN_ONLY`, `WRITE_ROLES` |
| `lib/constants.ts` | "Transferencias" y "Reportes" cambiados de `WRITE_ROLES` a `ALL_ROLES` para que CONSULTOR los vea en el sidebar |
| `app/(dashboard)/usuarios/page.tsx` | **Reemplaza el stub** — guard ADMIN, llama a `listar_usuarios_admin` |
| `app/(dashboard)/usuarios/usuarios-table.tsx` | **Nuevo** — tabla con dropdown de cambiar rol y activar/desactivar |
| `app/(dashboard)/usuarios/actions.ts` | **Nuevo** — server actions `cambiarRolUsuario` y `toggleUsuarioActivo` |
| `app/(dashboard)/bienes/page.tsx` | Lee rol, condiciona "Nuevo Bien", pasa `canWrite` a la tabla |
| `app/(dashboard)/bienes/bienes-table.tsx` | Filtra columna "acciones" si no `canWrite`; pasa `canWrite` al modal de detalle |
| `app/(dashboard)/bienes/bien-detail-dialog.tsx` | Botón "Editar" condicional |
| `app/(dashboard)/bienes/nuevo/page.tsx` | Guard `requireRol(WRITE_ROLES)` |
| `app/(dashboard)/bienes/[id]/page.tsx` | Guard `requireRol(WRITE_ROLES)` |
| `app/(dashboard)/transferencias/page.tsx` | Botón "Nueva Transferencia" condicional |
| `app/(dashboard)/transferencias/nueva/page.tsx` | Guard `requireRol(WRITE_ROLES)` |
| `app/(dashboard)/sedes/page.tsx` | `SedeDialog` (botón crear) condicional |
| `app/(dashboard)/sedes/sedes-table.tsx` | Filtra columna "acciones" si no `canManage` |
| `app/(dashboard)/sedes/actions.ts` | Validación ADMIN al inicio de `crearSede` y `actualizarSede` |
| `app/(dashboard)/areas/page.tsx` | `AreaDialog` (botón crear) condicional |
| `app/(dashboard)/areas/areas-table.tsx` | `EstadoToggle` muestra solo badge si no `canManage`; columna "acciones" filtrada |
| `app/(dashboard)/areas/actions.ts` | Validación ADMIN en `crearArea`, `actualizarArea`, `toggleEstadoArea` |

### Observaciones técnicas

#### Por qué tres capas de control
RLS sola es suficiente para bloquear escrituras maliciosas pero deja al frontend con dos problemas:
1. UX confusa — botones que existen pero al hacer click muestran "permiso denegado".
2. Server actions que escriben directo (sin RPC) no pasan por `require_rol_*`, dependen solo de RLS.

Por eso se añade validación en server actions (mensajes de error claros) y guards de página (no se renderizan controles que el rol no puede usar). Las tres capas se complementan: RLS protege, RPCs validan al ejecutar, frontend evita confusión.

#### Última-admin-activo
Tanto `actualizar_rol_usuario` como `set_usuario_activo` cuentan los admins activos restantes antes de aplicar el cambio. Si la operación dejaría el sistema sin ningún admin activo, se aborta con `raise exception`. Esto previene un escenario fácil de provocar accidentalmente: un solo admin se baja a sí mismo a CONSULTOR y queda imposible volver a promover a alguien.

#### Bootstrap seguro por defecto
`handle_new_user` quedó en `CONSULTOR` por default. La consecuencia: cualquier persona puede registrarse pero entra en modo lectura — no puede modificar inventario ni configuración. Un admin existente la promueve después.

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
- **Transferencias** — registro de movimientos entre sedes/áreas/responsables con auditoría
- **Bajas** — RPC `crear_baja` + form con confirmación doble + historial con badges por motivo
- **Reportes** — inventario por persona con totales, soporte de impresión y **exportación a Excel**
- **Historial** — timeline de movimientos por bien + alerta de baja + **exportación a Excel (3 hojas)**
- **Categorías** — CRUD de tipos de bien con prefijos para códigos automáticos
- **Filtros avanzados** en `/bienes` — sede, área, tipo, estado, combinables con la búsqueda global
- **Exportación a Excel** desde `/bienes`, `/reportes` y `/historial` (formato COP, auto-filtros, freeze panes)
- **Panel de control** — KPIs + actividad reciente + gráfico por sede
- **Usuarios** — gestión de roles, activación/desactivación, último-admin protegido
- **Control de acceso por rol** — RLS + RPCs `require_rol_*` + guards de página + UI condicional

### Sin módulos pendientes según el cronograma 1-10

Las semanas 1-10 del plan están cubiertas. Siguen las semanas 11 (pruebas) y 12 (documentación).

### Pendientes del plan original
- **Pruebas funcionales y ajustes de usabilidad** (semana 11).
- **Manual técnico, manual de usuario, presentación final** (semana 12).

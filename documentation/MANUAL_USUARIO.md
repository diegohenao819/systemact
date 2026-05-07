# Manual de Usuario — SYSTEMACT

Sistema de gestión de inventario de activos físicos para **Conviventia**.

| | |
|---|---|
| Versión | 1.0 |
| Fecha | Mayo 2026 |
| Audiencia | Usuarios finales (administradores, personal estándar y consultores) |
| Soporte | Área de TICs · Conviventia |

---

## 1. Bienvenida

SYSTEMACT es la herramienta interna de Conviventia para llevar un control claro y trazable de los **activos físicos** de la organización (equipos, mobiliario, dispositivos, etc.). Reemplaza el sistema legacy en PHP/MySQL por una aplicación moderna, rápida y accesible desde cualquier navegador.

Con SYSTEMACT puedes:

- **Registrar** un bien nuevo con su sede, área, responsable, valor y foto.
- **Transferir** un bien entre sedes, áreas o responsables, dejando huella de cada cambio.
- **Dar de baja** un bien que ya no está en uso (con descripción y motivo).
- **Consultar** el historial completo de cualquier bien.
- **Exportar** reportes en Excel para presentar o auditar.
- **Administrar** roles y accesos (solo administradores).

Este manual está pensado para usuarios finales: no requiere conocimientos técnicos. Si eres del equipo de TI o desarrollo, complementa con el `Manual Técnico`.

---

## 2. Acceso al sistema

### 2.1. Abrir la aplicación

Abre tu navegador (Chrome, Edge o Firefox) y visita la URL que te haya compartido el área de TICs (típicamente `https://systemact.conviventia.org` o similar). Verás la portada pública:

> **[CAPTURA 1 — Portada / Login]**
> *Esta es la captura que ya enviaste donde aparece el botón **Iniciar sesión** y **Registrarse** y los tres íconos de Bienes / Transferencias / Reportes.*

### 2.2. Crear tu cuenta

Si es la primera vez:

1. Haz clic en **Registrarse** (o **Crear cuenta**).
2. Llena el formulario: nombre, apellido, correo electrónico y contraseña.
3. Recibirás un correo de confirmación; haz clic en el enlace para activar la cuenta.
4. Inicia sesión con tu correo y contraseña.

Por defecto las cuentas nuevas tienen rol **CONSULTOR** (solo lectura). Si necesitas más permisos, pídele a un administrador que te promueva.

### 2.3. Iniciar sesión

1. Haz clic en **Iniciar sesión**.
2. Escribe tu correo y contraseña.
3. Haz clic en **Entrar**.

Si olvidaste tu contraseña, usa el enlace **¿Olvidaste tu contraseña?** y sigue el correo de recuperación.

### 2.4. Cerrar sesión

En la esquina superior derecha verás tus iniciales (por ejemplo "DH"). Haz clic ahí y elige **Cerrar sesión**. Por seguridad, cierra sesión cuando termines, sobre todo en computadores compartidos.

---

## 3. Roles y permisos

SYSTEMACT tiene tres roles. El rol determina lo que puedes ver y hacer:

| Rol | Qué puede hacer |
|---|---|
| **Administrador** | Todo: crear/editar/dar de baja bienes, gestionar catálogos, gestionar usuarios y ver reportes. |
| **Estándar** | Crear, editar y transferir bienes. **No** puede dar de baja ni gestionar usuarios. |
| **Consultor** | Solo consulta: ver listas, detalle, historial y reportes. No puede modificar nada. |

Tu rol aparece como una etiqueta en la esquina superior derecha junto a tu avatar (por ejemplo: **ADMINISTRADOR**, **ESTÁNDAR** o **CONSULTOR**).

---

## 4. Recorrido por la pantalla principal

Una vez dentro, verás la pantalla de **Inicio** con tu panel de control:

> **[CAPTURA 2 — Panel de Control]**
> *Captura que ya enviaste con los KPIs de Bienes Activos / Sedes / Áreas Activas / Transferencias, el gráfico "Bienes activos por sede" y la columna de Actividad reciente.*

La pantalla está organizada en tres zonas:

- **Barra lateral izquierda**: menú de navegación. Está agrupado en *General*, *Inventario*, *Operaciones* y *Administración*.
- **Encabezado superior**: bienvenida con tu nombre, indicador de rol, cambio de tema (claro/oscuro) y tu avatar.
- **Área principal**: el contenido de la sección que estés viendo.

### 4.1. Panel de control (Inicio)

Es la primera pantalla al entrar. Te muestra:

- **KPIs** (cuatro tarjetas arriba): cantidad de bienes activos, sedes, áreas activas y transferencias del mes.
- **Bienes activos por sede**: gráfico de barras horizontal que ayuda a ver dónde están concentrados los activos.
- **Actividad reciente**: las últimas operaciones registradas (altas, modificaciones, transferencias y bajas) con quién las hizo y cuándo.

Es una buena idea revisar este panel al iniciar el día: te da una foto rápida del estado del inventario.

---

## 5. Gestión de bienes

El módulo **Bienes** es el corazón del sistema. Aquí registras y consultas todos los activos.

> **[CAPTURA 3 — Listado de Bienes]**
> *Captura que ya enviaste con la tabla de bienes (COMP-2026-001, MESA-2026-001), filtros por sede/área/tipo y los botones **Exportar** y **Nuevo Bien**.*

### 5.1. Buscar y filtrar

- **Búsqueda libre**: escribe en el cuadro de búsqueda arriba (busca por código, nombre, sede o responsable).
- **Filtros**: usa los selectores de **Todas las sedes**, **Todas las áreas**, **Todos los tipos** y **Estado** (Activo / Inactivo / De baja) para acotar.
- **Ordenar**: haz clic en los íconos de flechas junto a cada columna (Código, Nombre, Sede, Área, Responsable, Estado, Valor Total).

### 5.2. Ver el detalle de un bien

Haz clic en el ícono de "ojo" 👁 al final de la fila, o sobre el código del bien. Se abrirá una pantalla con:

- Datos generales (código, nombre, tipo, placa, serial, valor unitario y total).
- Foto del bien (si tiene).
- Sede, área y responsable actuales.
- **Línea de tiempo** con todos los movimientos (registro, modificaciones, transferencias y baja si aplica).

### 5.3. Registrar un bien nuevo

Solo **Administrador** y **Estándar** pueden registrar bienes nuevos.

1. Haz clic en **+ Nuevo Bien** (esquina superior derecha del listado).
2. Llena el formulario:

   - **Tipo de bien** (Computador, Mobiliario, Impresora, etc.). El código se genera automáticamente con el prefijo del tipo más año y correlativo (ej. `COMP-2026-001`).
   - **Nombre** descriptivo (ej. "Portátil Lenovo ThinkPad").
   - **Cantidad** y **Valor unitario** (el valor total lo calcula el sistema).
   - **Sede** y **Área**.
   - **Responsable** (selecciónalo de la lista o escribe texto libre si no está registrado).
   - **Placa** y **serial** (opcionales pero recomendados).
   - **Foto** (opcional, máximo 5 MB, JPG/PNG/WebP).
   - **Observaciones** (opcional).

3. Haz clic en **Guardar**. Verás una notificación verde de confirmación.

> **[CAPTURA 4 — Formulario de Nuevo Bien]**
> *Pega aquí una captura del formulario completo de **Nuevo Bien** para que el lector vea el orden de los campos.*

### 5.4. Editar un bien

1. En el listado, haz clic en el bien que quieras editar.
2. Haz clic en **Editar** (en la pantalla de detalle).
3. Modifica los campos necesarios.
4. **Guardar**.

Toda edición queda registrada en el historial del bien con fecha, hora y usuario.

### 5.5. Exportar a Excel

Desde el listado de Bienes, haz clic en **Exportar**. Se descargará un archivo `.xlsx` con todos los bienes activos (excluye los dados de baja). El archivo incluye totales y queda listo para imprimir o auditar.

---

## 6. Catálogos: sedes, áreas y categorías

Los catálogos son las listas de referencia del sistema. Solo **Administradores** pueden modificarlos.

### 6.1. Sedes

Sedes físicas de Conviventia. Para crear una nueva: barra lateral → **Sedes** → **+ Nueva Sede** → escribe el nombre y guarda.

### 6.2. Áreas

Áreas organizacionales (GAF, Focos, Tecnología, Talento Humano, Comunicaciones, Dirección, etc.). Mismo flujo que sedes.

### 6.3. Categorías (tipos de bien)

Tipos de bien con su prefijo (`COMP`, `PORT`, `MON`, `IMP`, `MOB`, `VID`, `TEL`, `RED`, `OTRO`). El prefijo es lo que aparece al inicio de cada código de bien (`COMP-2026-001`).

> **Tip**: piensa bien antes de crear una categoría nueva. El prefijo no se puede cambiar después porque ya quedó en códigos existentes.

---

## 7. Transferencias

Una **transferencia** es el cambio de ubicación o responsable de un bien (cambio de sede, área o persona responsable). El sistema deja trazabilidad de cada cambio para que siempre se sepa dónde está cada activo.

### 7.1. Ver transferencias

Barra lateral → **Transferencias**. Verás la lista cronológica con: fecha, código del bien, sede/área de origen, sede/área de destino y responsable que recibe.

### 7.2. Registrar una transferencia

Solo **Administrador** y **Estándar** pueden hacerlo. El bien debe estar en estado **ACTIVO**.

1. **Transferencias** → **+ Nueva Transferencia**.
2. Selecciona el bien (puedes buscarlo por código o nombre).
3. Indica la nueva **sede**, **área** y/o **responsable**.
4. (Opcional) escribe un comentario o motivo.
5. **Guardar**.

> El sistema rechaza transferencias a la misma combinación sede + área + responsable (no tiene sentido transferir un bien al mismo lugar).

> **[CAPTURA 5 — Transferencias]**
> *Pega aquí una captura del módulo de Transferencias (listado o el formulario de nueva transferencia).*

---

## 8. Bajas

Una **baja** es la salida definitiva de un bien del inventario activo (obsolescencia, pérdida, daño irreparable, donación, etc.). Solo **Administradores** pueden hacerlas. La acción no se puede deshacer.

### 8.1. Cómo dar de baja un bien

1. Barra lateral → **Bajas** → **+ Nueva Baja**.
2. Selecciona el bien.
3. Elige el **motivo** de la baja (Obsolescencia, Pérdida, Daño, Donación, Otro).
4. Escribe una **descripción** que justifique la baja.
5. Confirma — el sistema te pide confirmar dos veces porque la operación es irreversible.

Tras la baja, el bien queda con estado **DE BAJA**. Sigue visible en historial, listados con filtro y reportes históricos, pero ya no aparece en operaciones activas ni en exportaciones por defecto.

---

## 9. Historial y trazabilidad

Cada bien tiene un **historial completo** con todos los movimientos: registro, modificaciones, transferencias y baja (si aplica).

### 9.1. Ver el historial

Hay dos formas:

- Desde el detalle del bien (sección **Línea de tiempo**).
- Barra lateral → **Historial** → busca por código o por bien específico.

### 9.2. Exportar el historial

En la pantalla de historial de un bien, haz clic en **Exportar Excel**. Se descarga un archivo con tres hojas:

- **Información del bien**: datos actuales del activo.
- **Baja** (si aplica): motivo, descripción, fecha y usuario que la registró.
- **Movimientos**: timeline completo en orden cronológico.

Es el reporte ideal para entregar al área contable o al responsable cuando se hace una transferencia importante.

---

## 10. Reportes

> **[CAPTURA 6 — Reportes (Inventario por persona)]**
> *Captura que ya enviaste con el ejemplo de Kevin Sotelo y los dos bienes asignados (COMP-2026-001 y MESA-2026-001) más los totales.*

### 10.1. Inventario por persona

Barra lateral → **Reportes**. Selecciona una persona del menú desplegable: el sistema lista todos los bienes activos asignados a ella, con cantidad y valor total. Útil para:

- Hacer entregas de inventario a un colaborador.
- Auditar qué tiene asignado alguien que cambia de área o sale de la organización.
- Confirmar el valor total bajo responsabilidad de cada persona.

### 10.2. Exportar a Excel

Haz clic en **Exportar a Excel** (esquina superior derecha del reporte). El archivo incluye datos de la persona, los bienes asignados con todo el detalle, y la fila de totales.

### 10.3. Exportar a PDF

SYSTEMACT no genera PDF directamente, pero puedes usar la función **Imprimir** del navegador (`Ctrl+P` en Windows / `Cmd+P` en Mac) y seleccionar **Guardar como PDF** como destino. La pantalla está optimizada para imprimirse limpia.

---

## 11. Administración de usuarios (solo administradores)

> **[CAPTURA 7 — Usuarios]**
> *Captura que ya enviaste con el listado de usuarios (Diego, Kevin, Alejandro) con sus roles y estados.*

### 11.1. Listar usuarios

Barra lateral → **Usuarios** (solo aparece si tu rol es Administrador). Verás la tabla con: nombre, correo, cédula, sede, **rol**, **estado** (Activo / Inactivo) y fecha de registro.

### 11.2. Cambiar el rol de un usuario

1. Haz clic en el botón **⋮** al final de la fila.
2. Elige **Cambiar rol**.
3. Selecciona el nuevo rol (Administrador / Estándar / Consultor).
4. Confirma.

> El sistema **no permite** dejar la organización sin administradores activos. Si intentas degradar al último administrador, recibirás un error claro.

### 11.3. Activar / desactivar un usuario

Cuando alguien deja la organización, **desactívalo** (no lo elimines). Esto preserva el historial de operaciones que hizo.

1. **⋮** → **Desactivar usuario**.
2. Confirma.

El usuario ya no podrá iniciar sesión, pero sus registros pasados siguen visibles. Para reactivar, el mismo flujo elige **Activar**.

### 11.4. Promover al primer administrador

Cuando se instala SYSTEMACT por primera vez, el área de TI debe promover al primer administrador desde la base de datos (ver Manual Técnico, sección 5.7). De ahí en adelante, ese administrador puede promover a los demás desde esta misma pantalla.

---

## 12. Tips, buenas prácticas y preguntas frecuentes

### 12.1. Buenas prácticas

- **Foto + serial + placa**: cuando registres un bien, agrega los tres si los tienes. Hace mucho más fácil identificarlo después.
- **Nombre descriptivo**: en lugar de "Portátil", escribe "Portátil Lenovo ThinkPad T14 — sala de juntas".
- **Transferencia, no edición**: cuando un bien cambia de sede, área o responsable, usa **Transferencia**, no editar el bien. Las transferencias dejan rastro; las ediciones de campo lo borran.
- **Baja con descripción honesta**: el motivo y descripción de la baja son la única defensa cuando alguien pregunte "¿qué pasó con el equipo X?".
- **Auditoría trimestral**: como Administrador, exporta el listado de bienes una vez al trimestre y haz cruce físico con una muestra.

### 12.2. Preguntas frecuentes

**¿Por qué no veo la sección Bajas / Usuarios?**
Tu rol no tiene permisos para esos módulos. Pídele a un Administrador que te eleve si tu trabajo lo necesita.

**Quise modificar la cantidad de un bien y no me dejó.**
La cantidad y el valor unitario se pueden editar, pero el **valor total** lo calcula el sistema (cantidad × valor unitario), no es editable.

**Subí una foto y se rechazó.**
Las imágenes deben ser JPG, PNG o WebP, y pesar menos de 5 MB. Reduce el tamaño con cualquier herramienta de compresión y vuelve a subirla.

**Me equivoqué al dar de baja un bien.**
La baja es irreversible desde la UI. Comunícate con el área de TICs: ellos pueden revertir manualmente desde la base de datos si la operación es muy reciente.

**El sistema dice "No autenticado" o me saca al login.**
Tu sesión expiró. Vuelve a iniciar sesión. Si pasa muy seguido, revisa que tu navegador acepte cookies del dominio.

**¿Puedo trabajar desde el celular?**
Sí. SYSTEMACT es responsivo. La barra lateral se convierte en un menú desplegable con el ícono ☰ arriba a la izquierda.

**No me llega el correo de confirmación.**
Revisa la carpeta de spam / no deseados. Si no llega en 10 minutos, contacta al área de TICs para reenviar.

---

## 13. Soporte y contacto

Para reportar errores, solicitar permisos o pedir ayuda:

- **Equipo de TICs · Conviventia**
- Reportar incidencias: incluye captura de pantalla, qué intentabas hacer y el mensaje de error exacto si lo hubo.
- Errores críticos (no puedes acceder, datos perdidos): márcalos como urgentes.

---

## 14. Glosario rápido

| Término | Significado |
|---|---|
| **Activo / Bien** | Cualquier objeto físico de Conviventia registrado en el inventario. |
| **Código** | Identificador único del bien, generado automáticamente (ej. `COMP-2026-001`). |
| **Sede** | Ubicación física (Bogotá, Medellín, Cali, Barranquilla, etc.). |
| **Área** | Unidad organizacional (GAF, Focos, Tecnología, etc.). |
| **Responsable** | Persona que tiene asignado un bien específico. |
| **Transferencia** | Cambio de sede, área o responsable de un bien. |
| **Baja** | Salida definitiva del inventario (irreversible). |
| **Historial** | Línea de tiempo con todos los eventos de un bien. |
| **Rol** | Conjunto de permisos del usuario (Administrador, Estándar, Consultor). |

---

*Documento mantenido en `documentation/MANUAL_USUARIO.md`. Si encuentras algo desactualizado o confuso, por favor reporta al equipo de TICs.*

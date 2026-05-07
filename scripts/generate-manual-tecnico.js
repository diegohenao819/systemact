const fs = require("fs");
const path = require("path");
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  Header,
  Footer,
  AlignmentType,
  PageOrientation,
  LevelFormat,
  HeadingLevel,
  BorderStyle,
  WidthType,
  ShadingType,
  PageNumber,
  PageBreak,
  TabStopType,
  TabStopPosition,
  TableOfContents,
} = require(path.join(
  "C:\\Users\\diego\\AppData\\Roaming\\npm\\node_modules",
  "docx"
));

const NAVY = "1F2937";
const GRAY = "6B7280";
const LIGHT = "E5E7EB";
const ACCENT = "111827";
const HEADER_BG = "F3F4F6";

const cellBorder = { style: BorderStyle.SINGLE, size: 4, color: LIGHT };
const cellBorders = {
  top: cellBorder,
  bottom: cellBorder,
  left: cellBorder,
  right: cellBorder,
};

function p(text, opts = {}) {
  return new Paragraph({
    spacing: { after: opts.after ?? 120, line: 300 },
    alignment: opts.alignment,
    children: [
      new TextRun({
        text,
        bold: opts.bold,
        italics: opts.italics,
        color: opts.color,
        size: opts.size,
      }),
    ],
  });
}

function h(level, text, anchor) {
  const map = {
    1: HeadingLevel.HEADING_1,
    2: HeadingLevel.HEADING_2,
    3: HeadingLevel.HEADING_3,
  };
  return new Paragraph({
    heading: map[level],
    spacing:
      level === 1
        ? { before: 480, after: 200 }
        : level === 2
        ? { before: 320, after: 160 }
        : { before: 240, after: 120 },
    children: [new TextRun({ text })],
  });
}

function bullet(text, level = 0) {
  return new Paragraph({
    numbering: { reference: "bullets", level },
    spacing: { after: 80, line: 300 },
    children: [new TextRun({ text })],
  });
}

function bulletRich(runs, level = 0) {
  return new Paragraph({
    numbering: { reference: "bullets", level },
    spacing: { after: 80, line: 300 },
    children: runs,
  });
}

function numbered(text) {
  return new Paragraph({
    numbering: { reference: "numbers", level: 0 },
    spacing: { after: 80, line: 300 },
    children: [new TextRun({ text })],
  });
}

function code(lines) {
  return lines.map(
    (line) =>
      new Paragraph({
        spacing: { after: 0, line: 260 },
        shading: { type: ShadingType.CLEAR, fill: "F9FAFB" },
        indent: { left: 240 },
        children: [
          new TextRun({
            text: line || " ",
            font: "Consolas",
            size: 18,
            color: ACCENT,
          }),
        ],
      })
  );
}

function makeCell(text, opts = {}) {
  const widthDxa = opts.width;
  return new TableCell({
    borders: cellBorders,
    width: { size: widthDxa, type: WidthType.DXA },
    shading: opts.header
      ? { fill: HEADER_BG, type: ShadingType.CLEAR }
      : undefined,
    margins: { top: 100, bottom: 100, left: 140, right: 140 },
    children: [
      new Paragraph({
        spacing: { after: 0, line: 280 },
        children: [
          new TextRun({
            text,
            bold: opts.header || opts.bold,
            size: 20,
            color: ACCENT,
          }),
        ],
      }),
    ],
  });
}

function table(columnWidths, headerRow, rows) {
  const total = columnWidths.reduce((a, b) => a + b, 0);
  return new Table({
    width: { size: total, type: WidthType.DXA },
    columnWidths,
    rows: [
      new TableRow({
        tableHeader: true,
        children: headerRow.map((t, i) =>
          makeCell(t, { width: columnWidths[i], header: true })
        ),
      }),
      ...rows.map(
        (row) =>
          new TableRow({
            children: row.map((t, i) =>
              makeCell(t, { width: columnWidths[i] })
            ),
          })
      ),
    ],
  });
}

function spacer(after = 200) {
  return new Paragraph({ spacing: { after }, children: [new TextRun("")] });
}

// ──────────────────────────────────────────────────────────────────
// PAGE GEOMETRY (A4)
// ──────────────────────────────────────────────────────────────────
const PAGE_WIDTH = 11906;
const PAGE_HEIGHT = 16838;
const MARGIN = 1440;
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN; // 9026

// ──────────────────────────────────────────────────────────────────
// COVER PAGE
// ──────────────────────────────────────────────────────────────────
const cover = [
  new Paragraph({ spacing: { before: 2400, after: 0 }, children: [new TextRun("")] }),
  new Paragraph({
    spacing: { after: 120 },
    children: [
      new TextRun({
        text: "MANUAL TÉCNICO",
        bold: true,
        size: 56,
        color: ACCENT,
      }),
    ],
  }),
  new Paragraph({
    spacing: { after: 400 },
    children: [
      new TextRun({ text: "SYSTEMACT", size: 36, color: GRAY }),
    ],
  }),
  new Paragraph({
    spacing: { after: 1200 },
    border: {
      bottom: {
        style: BorderStyle.SINGLE,
        size: 8,
        color: ACCENT,
        space: 1,
      },
    },
    children: [new TextRun("")],
  }),
  new Paragraph({
    spacing: { after: 200 },
    children: [
      new TextRun({
        text: "Sistema de gestión de inventario de activos físicos",
        size: 26,
        color: NAVY,
      }),
    ],
  }),
  new Paragraph({
    spacing: { after: 1600 },
    children: [
      new TextRun({
        text: "Conviventia",
        italics: true,
        size: 22,
        color: GRAY,
      }),
    ],
  }),
  table(
    [3000, 6026],
    ["", ""],
    [
      ["Versión", "1.0"],
      ["Fecha", "Mayo de 2026"],
      ["Autor", "Diego Alejandro Henao Henao"],
      ["Stack", "Next.js 15 · Supabase · TypeScript"],
      ["Despliegue", "Vercel + Supabase Cloud"],
    ]
  ),
  new Paragraph({ children: [new PageBreak()] }),
];

// Replace cover header (we don't want a header row visually): rebuild without header row.
// Simpler: rebuild cover meta table without a stylized header row.
function metaTable() {
  const widths = [3000, 6026];
  const data = [
    ["Versión", "1.0"],
    ["Fecha", "Mayo de 2026"],
    ["Autor", "Diego Alejandro Henao Henao"],
    ["Stack", "Next.js 15 · Supabase · TypeScript"],
    ["Despliegue", "Vercel + Supabase Cloud"],
  ];
  return new Table({
    width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA },
    columnWidths: widths,
    rows: data.map(
      (row) =>
        new TableRow({
          children: [
            makeCell(row[0], { width: widths[0], bold: true }),
            makeCell(row[1], { width: widths[1] }),
          ],
        })
    ),
  });
}

// Rebuild cover:
const coverFinal = [
  new Paragraph({ spacing: { before: 2400, after: 0 }, children: [new TextRun("")] }),
  new Paragraph({
    spacing: { after: 120 },
    children: [
      new TextRun({
        text: "MANUAL TÉCNICO",
        bold: true,
        size: 56,
        color: ACCENT,
      }),
    ],
  }),
  new Paragraph({
    spacing: { after: 400 },
    children: [new TextRun({ text: "SYSTEMACT", size: 36, color: GRAY })],
  }),
  new Paragraph({
    spacing: { after: 1200 },
    border: {
      bottom: {
        style: BorderStyle.SINGLE,
        size: 8,
        color: ACCENT,
        space: 1,
      },
    },
    children: [new TextRun("")],
  }),
  new Paragraph({
    spacing: { after: 160 },
    children: [
      new TextRun({
        text: "Sistema de gestión de inventario de activos físicos",
        size: 26,
        color: NAVY,
      }),
    ],
  }),
  new Paragraph({
    spacing: { after: 1600 },
    children: [
      new TextRun({
        text: "Conviventia",
        italics: true,
        size: 22,
        color: GRAY,
      }),
    ],
  }),
  metaTable(),
  new Paragraph({ children: [new PageBreak()] }),
];

// ──────────────────────────────────────────────────────────────────
// TABLE OF CONTENTS
// ──────────────────────────────────────────────────────────────────
const toc = [
  h(1, "Tabla de contenido"),
  new Paragraph({
    spacing: { after: 200 },
    children: [
      new TextRun({
        text: "Esta tabla se actualiza al abrir el documento en Word (clic derecho → Actualizar campos).",
        italics: true,
        size: 18,
        color: GRAY,
      }),
    ],
  }),
  new TableOfContents("Contenido", {
    hyperlink: true,
    headingStyleRange: "1-3",
  }),
  new Paragraph({ children: [new PageBreak()] }),
];

// ──────────────────────────────────────────────────────────────────
// SECTION 1 — Introducción
// ──────────────────────────────────────────────────────────────────
const sec1 = [
  h(1, "1. Introducción"),
  p(
    "SYSTEMACT es una aplicación web interna que permite a Conviventia registrar, transferir, dar de baja y auditar los activos físicos de la organización. Reemplaza un sistema legacy en PHP/MySQL por un stack moderno basado en Next.js y Supabase."
  ),
  h(2, "1.1. Alcance"),
  p(
    "Este documento cubre la información técnica necesaria para instalar, configurar, mantener y extender el sistema. No es un manual de uso final — para eso ver el Manual de Usuario."
  ),
  h(2, "1.2. Audiencia"),
  p(
    "Personal técnico de Conviventia y futuros desarrolladores que reciban el sistema."
  ),
];

// ──────────────────────────────────────────────────────────────────
// SECTION 2 — Stack
// ──────────────────────────────────────────────────────────────────
const sec2 = [
  h(1, "2. Stack tecnológico"),
  table(
    [2200, 5026, 1800],
    ["Capa", "Tecnología", "Versión"],
    [
      ["Framework", "Next.js (App Router)", "15+"],
      ["Lenguaje", "TypeScript (strict)", "5+"],
      ["Runtime", "Node.js", "20+"],
      ["UI", "React", "19"],
      ["Estilos", "Tailwind CSS + shadcn/ui", "3.4 / latest"],
      ["Iconos", "lucide-react", "—"],
      ["Formularios", "React Hook Form + Zod", "7 / 4"],
      ["Tablas", "TanStack Table", "8"],
      ["Gráficos", "Recharts", "3"],
      ["Notificaciones", "Sonner", "2"],
      ["Exportación", "ExcelJS", "4"],
      ["Backend", "Supabase (BaaS)", "latest"],
      ["Base de datos", "PostgreSQL", "15"],
      ["Autenticación", "Supabase Auth (JWT en cookies)", "—"],
      ["Almacenamiento", "Supabase Storage", "—"],
      ["Pruebas", "Vitest + Playwright", "4 / 1"],
      ["Hosting", "Vercel + Supabase Cloud", "—"],
    ]
  ),
  spacer(200),
  h(2, "2.1. Justificación"),
  bullet(
    "Next.js 15 con Server Components y Server Actions elimina la necesidad de mantener una API REST separada para mutaciones."
  ),
  bullet(
    "Supabase unifica Postgres, Auth y Storage; la lógica crítica vive en RPCs PL/pgSQL."
  ),
  bullet(
    "TypeScript estricto + Zod garantiza tipado en cliente, servidor y validación de entrada."
  ),
];

// ──────────────────────────────────────────────────────────────────
// SECTION 3 — Arquitectura
// ──────────────────────────────────────────────────────────────────
const sec3 = [
  h(1, "3. Arquitectura general"),
  p(
    "El sistema se compone de un frontend Next.js desplegado en Vercel y un backend Supabase (PostgreSQL + Auth + Storage). El cliente se comunica con la BD a través del SDK oficial de Supabase, y todas las mutaciones críticas pasan por Server Actions que invocan RPCs PL/pgSQL."
  ),
  h(2, "3.1. Capas de seguridad"),
  numbered(
    "RLS (Row-Level Security) en cada tabla — frontera de la base de datos."
  ),
  numbered(
    "RPCs security invoker que invocan require_rol_escritura() o require_rol_admin() antes de mutar datos."
  ),
  numbered(
    "Guards de página (requireRol) y validaciones en Server Actions — defensa en profundidad."
  ),
  h(2, "3.2. Flujo típico de una mutación"),
  ...code([
    "Usuario → Form (cliente, valida con Zod)",
    "       → Server Action (re-valida con Zod, obtiene user)",
    "       → RPC PL/pgSQL (require_rol_*, lock, insert + log)",
    "       → revalidatePath()",
    "       → toast Sonner",
  ]),
];

// ──────────────────────────────────────────────────────────────────
// SECTION 4 — Estructura
// ──────────────────────────────────────────────────────────────────
const sec4 = [
  h(1, "4. Estructura del repositorio"),
  ...code([
    "systemact/",
    "├── app/",
    "│   ├── (dashboard)/         Rutas protegidas",
    "│   │   ├── inicio/          Panel KPIs y timeline",
    "│   │   ├── bienes/          CRUD de bienes",
    "│   │   ├── sedes/  areas/  categorias/",
    "│   │   ├── transferencias/",
    "│   │   ├── bajas/           (admin only)",
    "│   │   ├── historial/       Timeline por bien",
    "│   │   ├── reportes/        Inventario por persona",
    "│   │   ├── usuarios/        (admin only)",
    "│   │   └── layout.tsx",
    "│   ├── api/export/          Route Handlers .xlsx",
    "│   ├── auth/                Login, sign-up, recuperación",
    "│   └── page.tsx             Portada pública",
    "├── components/              ui/, layout/, *-form.tsx",
    "├── lib/",
    "│   ├── auth/require-rol.ts  Guards de rol",
    "│   ├── export/excel.ts      Helpers ExcelJS",
    "│   ├── supabase/            Clients (server, client, proxy)",
    "│   ├── validations/         Esquemas Zod",
    "│   ├── constants.ts         ROLES, ESTADOS_BIEN, NAV_GROUPS",
    "│   └── utils.ts",
    "├── supabase/",
    "│   ├── migrations/          1 baseline + _archive/",
    "│   ├── seed.sql",
    "│   └── config.toml",
    "├── tests/                   Playwright E2E",
    "├── proxy.ts                 Middleware Next.js",
    "└── documentation/",
    "    ├── CODE_GUIDE.md",
    "    ├── CHANGELOG.md",
    "    └── MANUAL_TECNICO.md",
  ]),
];

// ──────────────────────────────────────────────────────────────────
// SECTION 5 — Instalación
// ──────────────────────────────────────────────────────────────────
const sec5 = [
  h(1, "5. Instalación desde cero"),
  h(2, "5.1. Pre-requisitos"),
  bullet("Node.js ≥ 20 y npm ≥ 10"),
  bullet("Git"),
  bullet("Supabase CLI (npm install -g supabase o scoop install supabase)"),
  bullet("Docker Desktop (solo para Supabase local)"),
  bullet("Cuenta en supabase.com (para Supabase Cloud)"),

  h(2, "5.2. Clonar el repositorio"),
  ...code([
    "git clone https://github.com/<organizacion>/systemact.git",
    "cd systemact",
  ]),

  h(2, "5.3. Instalar dependencias"),
  ...code(["npm install"]),

  h(2, "5.4. Variables de entorno"),
  p("Copiar la plantilla y completarla con las credenciales de Supabase:"),
  ...code(["cp .env.example .env.local"]),
  spacer(120),
  p("Contenido de .env.local:"),
  ...code([
    "NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>",
    "",
    "# Opcional para pruebas E2E autenticadas",
    "E2E_USER_EMAIL=usuario@dominio.com",
    "E2E_USER_PASSWORD=contraseña",
  ]),
  spacer(120),
  p(
    "Las credenciales se obtienen en Supabase Dashboard → Settings → API. Nunca versionar .env.local: ya está en .gitignore.",
    { italics: true, color: GRAY, size: 20 }
  ),

  h(2, "5.5. Crear el esquema de la base de datos"),
  p("Opción A — proyecto local con Docker (desarrollo):", { bold: true }),
  ...code([
    "supabase start          # Postgres, Auth, Studio en local",
    "supabase db reset       # aplica migración + seed",
  ]),
  spacer(120),
  p("Studio disponible en http://127.0.0.1:54323"),
  spacer(120),
  p("Opción B — proyecto en Supabase Cloud (producción):", { bold: true }),
  ...code([
    "supabase login",
    "supabase link --project-ref <project-ref>",
    "supabase db push        # aplica migración baseline",
    'psql "$DATABASE_URL" -f supabase/seed.sql',
  ]),
  spacer(120),
  p(
    "Esto crea 9 tablas, 14 funciones/RPCs, 25 políticas RLS, 1 bucket de Storage con 4 policies y 3 triggers."
  ),

  h(2, "5.6. Levantar el frontend"),
  ...code(["npm run dev"]),
  spacer(120),
  p("App disponible en http://localhost:3000"),

  h(2, "5.7. Crear el primer administrador"),
  p(
    "Por defecto, todo nuevo usuario se registra con rol CONSULTOR (solo lectura). Para promover el primer admin:"
  ),
  numbered("Registrarse desde la app en /auth/sign-up."),
  numbered(
    "En Supabase Studio (SQL Editor) o vía psql ejecutar:"
  ),
  ...code([
    "update public.profiles",
    "set rol = 'ADMINISTRADOR'",
    "where id = (select id from auth.users",
    "            where email = 'tu-correo@dominio.com');",
  ]),
  numbered(
    "Cerrar sesión y volver a entrar. El módulo /usuarios ya estará visible."
  ),
];

// ──────────────────────────────────────────────────────────────────
// SECTION 6 — Base de datos
// ──────────────────────────────────────────────────────────────────
const sec6 = [
  h(1, "6. Base de datos"),
  h(2, "6.1. Modelo de datos"),
  table(
    [2400, 6626],
    ["Tabla", "Función"],
    [
      ["profiles", "Extiende auth.users con datos de la persona y rol."],
      ["sedes", "Catálogo de sedes físicas."],
      ["areas", "Catálogo de áreas organizacionales."],
      ["caracteristicas", "Tipos de bien con prefijo (genera el código automático)."],
      ["bienes", "Entidad principal — los activos físicos."],
      ["transferencias", "Snapshot de cada cambio de ubicación."],
      ["bajas", "Registro irreversible de salidas de inventario."],
      ["movimiento_bienes", "Log de auditoría por bien."],
      ["keepalive", "Tabla utilitaria contra hibernación de Supabase."],
    ]
  ),
  spacer(200),

  h(2, "6.2. Reglas clave del modelo"),
  bullet(
    "Código de bien generado por generar_codigo_bien(prefijo) con formato PREFIJO-AÑO-NNN (ej. COMP-2026-001)."
  ),
  bullet(
    "bienes.valor_total es columna GENERATED (cantidad × valor_unitario); nunca se envía desde el cliente."
  ),
  bullet(
    "bienes.estado ∈ { ACTIVO, INACTIVO, DE BAJA }. Un bien nunca se borra físicamente; las bajas son soft delete."
  ),
  bullet(
    "responsable_texto se usa cuando el responsable no existe en profiles (texto libre)."
  ),
  bullet(
    "transferencias.area_origen y area_destino son text (no FK) para preservar historial legible aunque se renombre un área."
  ),

  h(2, "6.3. Funciones y RPCs principales"),
  table(
    [3000, 1800, 4226],
    ["Función", "Tipo", "Propósito"],
    [
      ["handle_new_user", "trigger", "Crea profiles automáticamente al registrar usuario."],
      ["handle_updated_at", "trigger", "Mantiene updated_at en bienes y profiles."],
      ["generar_codigo_bien", "helper", "Calcula correlativo por prefijo y año."],
      ["get_my_rol / get_my_sede", "helper", "Evita recursividad en políticas RLS."],
      ["current_user_rol", "helper", "Permite al cliente consultar su propio rol."],
      ["require_rol_escritura", "guard", "Excepción si el caller no es ADMIN/ESTANDAR activo."],
      ["require_rol_admin", "guard", "Excepción si el caller no es ADMIN activo."],
      ["crear_bien_con_auditoria", "RPC", "Inserta bien + log de auditoría."],
      ["actualizar_bien_con_auditoria", "RPC", "Modifica bien + log."],
      ["crear_transferencia", "RPC", "Cambio de ubicación atómico (lock + log)."],
      ["actualizar_rol_usuario", "RPC", "Cambia rol; protege último admin activo."],
      ["set_usuario_activo", "RPC", "Activa/desactiva; protege último admin activo."],
      ["listar_usuarios_admin", "RPC", "Lista usuarios con email de auth.users."],
    ]
  ),
  spacer(200),

  h(2, "6.4. Roles y permisos"),
  table(
    [2200, 1400, 1800, 1226, 1000, 1400],
    ["Rol", "Lectura", "Escritura inv.", "Transfer.", "Bajas", "Catálogos / Usuarios"],
    [
      ["ADMINISTRADOR", "Todo", "Sí", "Sí", "Sí", "Sí"],
      ["ESTANDAR", "Todo", "Sí", "Sí", "No", "No"],
      ["CONSULTOR", "Todo", "No", "No", "No", "No"],
    ]
  ),
  spacer(200),

  h(2, "6.5. Seed inicial"),
  p("supabase/seed.sql es idempotente y carga:"),
  bullet("4 sedes (Bogotá, Medellín, Cali, Barranquilla)."),
  bullet(
    "6 áreas (GAF, Focos, Tecnología, Talento Humano, Comunicaciones, Dirección)."
  ),
  bullet(
    "9 tipos de bien con prefijos: COMP, PORT, MON, IMP, MOB, VID, TEL, RED, OTRO."
  ),
  p(
    "No crea usuarios. Editar el seed antes del primer db reset si se requieren otros catálogos.",
    { italics: true, color: GRAY, size: 20 }
  ),

  h(2, "6.6. Almacenamiento (Storage)"),
  p("Bucket bienes — público, máximo 5 MB, formatos image/jpeg | png | webp:"),
  bullet("SELECT abierto para mostrar imágenes con URL pública."),
  bullet("INSERT/UPDATE/DELETE solo authenticated."),
  bullet(
    "Las imágenes se suben directamente desde el cliente (evita el límite de 4.5 MB de Server Actions en Vercel)."
  ),
  bullet("Nombre de archivo: {crypto.randomUUID()}.{ext} en raíz del bucket."),
];

// ──────────────────────────────────────────────────────────────────
// SECTION 7 — Módulos
// ──────────────────────────────────────────────────────────────────
const sec7 = [
  h(1, "7. Módulos funcionales"),
  table(
    [2400, 4126, 2500],
    ["Ruta", "Módulo", "Acceso"],
    [
      ["/", "Portada pública", "público"],
      ["/auth/*", "Autenticación", "público"],
      ["/inicio", "Panel con KPIs, timeline y gráfico por sede", "todos"],
      [
        "/bienes",
        "Listado, alta, edición, detalle y filtros",
        "lectura: todos · escritura: ADMIN/ESTANDAR",
      ],
      [
        "/sedes /areas /categorias",
        "CRUD de catálogos",
        "lectura: todos · escritura: ADMIN",
      ],
      [
        "/transferencias",
        "Cambios de ubicación entre sedes/áreas/responsables",
        "lectura: todos · escritura: ADMIN/ESTANDAR",
      ],
      ["/bajas", "Salida de inventario con confirmación doble", "ADMIN"],
      ["/historial", "Timeline cronológico por bien", "todos"],
      ["/reportes", "Inventario por persona", "todos"],
      ["/usuarios", "Gestión de roles y activación", "ADMIN"],
      ["/api/export/*", "Descarga de archivos .xlsx", "según ruta"],
    ]
  ),
  spacer(200),

  h(2, "7.1. Reglas de negocio destacadas"),
  bullet(
    "Transferencias: solo bienes ACTIVO. No se permite transferir a la misma combinación sede + área + responsable."
  ),
  bullet(
    "Bajas: solo bienes ACTIVO, solo ADMINISTRADOR. Transacción atómica que cambia el estado, registra en bajas e inserta en movimiento_bienes."
  ),
  bullet(
    "Auditoría: cada operación (REGISTRO, MODIFICACION, TRANSFERENCIA, BAJA) deja un registro escrito por el RPC correspondiente."
  ),
  bullet(
    "Último admin activo: las RPCs actualizar_rol_usuario y set_usuario_activo validan que la operación no deje el sistema sin administradores."
  ),
];

// ──────────────────────────────────────────────────────────────────
// SECTION 8 — Auth
// ──────────────────────────────────────────────────────────────────
const sec8 = [
  h(1, "8. Autenticación y autorización"),
  h(2, "8.1. Flujo de auth"),
  numbered("Login con email/password vía supabase.auth.signInWithPassword()."),
  numbered(
    "Supabase emite un JWT y lo guarda en cookies HTTP-only (gestionado por @supabase/ssr)."
  ),
  numbered(
    "proxy.ts (middleware de Next.js) refresca la sesión en cada request a rutas no públicas."
  ),
  numbered(
    "El rol se obtiene de profiles.rol cuando se necesita (en el layout del dashboard, en getAuthContext, o en RPCs vía get_my_rol())."
  ),

  h(2, "8.2. Guard de página (server component)"),
  ...code([
    'import { requireRol, ADMIN_ONLY } from "@/lib/auth/require-rol";',
    "",
    "export default async function BajasPage() {",
    "  const ctx = await requireRol(ADMIN_ONLY);",
    '  // si no es ADMIN, requireRol ya hizo redirect("/inicio")',
    "}",
  ]),

  h(2, "8.3. UI condicional por rol"),
  ...code([
    "const ctx = await getAuthContext();",
    "const canWrite =",
    "  ctx.rol === ROLES.ADMINISTRADOR ||",
    "  ctx.rol === ROLES.ESTANDAR;",
  ]),
];

// ──────────────────────────────────────────────────────────────────
// SECTION 9 — API
// ──────────────────────────────────────────────────────────────────
const sec9 = [
  h(1, "9. API y endpoints"),
  p(
    "El proyecto no expone una API REST pública. Las mutaciones internas se hacen vía Server Actions. Los únicos endpoints HTTP propios son Route Handlers de descarga:"
  ),
  table(
    [1400, 4626, 3000],
    ["Método", "Endpoint", "Devuelve"],
    [
      ["GET", "/api/export/bienes", ".xlsx con todos los bienes (filtros vía query string)."],
      ["GET", "/api/export/inventario-persona", ".xlsx con inventario por responsable."],
      ["GET", "/api/export/historial?id_bien=N", ".xlsx con la trazabilidad de un bien."],
    ]
  ),
  spacer(200),
  p(
    "Todos exigen sesión activa; sin sesión devuelven redirect a /auth/login. El consumo del cliente con la base de datos pasa siempre por @supabase/ssr y @supabase/supabase-js."
  ),
];

// ──────────────────────────────────────────────────────────────────
// SECTION 10 — Despliegue
// ──────────────────────────────────────────────────────────────────
const sec10 = [
  h(1, "10. Despliegue"),
  h(2, "10.1. Frontend en Vercel"),
  numbered("Conectar el repo a un proyecto de Vercel."),
  numbered(
    "Configurar variables de entorno (Project Settings → Environment Variables): NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
  ),
  numbered("Build command: next build (default)."),
  numbered("Cada push a master dispara un deploy automático."),

  h(2, "10.2. Backend en Supabase Cloud"),
  numbered("Crear proyecto en supabase.com."),
  numbered("supabase link --project-ref <ref>."),
  numbered("supabase db push para aplicar la migración baseline."),
  numbered('Cargar el seed con psql "$DATABASE_URL" -f supabase/seed.sql.'),
  numbered("El bucket bienes queda configurado por la migración."),

  h(2, "10.3. Migraciones futuras"),
  ...code([
    "supabase migration new <nombre_descriptivo>",
    "# editar el SQL generado",
    "supabase db reset           # aplicar en local",
    "supabase db push            # aplicar en remoto",
  ]),
  spacer(120),
  p(
    "La carpeta supabase/migrations/_archive/ no se vuelve a ejecutar — es solo memoria histórica.",
    { italics: true, color: GRAY, size: 20 }
  ),
];

// ──────────────────────────────────────────────────────────────────
// SECTION 11 — Pruebas
// ──────────────────────────────────────────────────────────────────
const sec11 = [
  h(1, "11. Pruebas"),
  ...code([
    "npm run lint        # ESLint",
    "npm run build       # build + type-check",
    "npm run test:unit   # Vitest (validaciones, helpers)",
    "npm run test:e2e    # Playwright (flujos base)",
    "npm run check       # lint + build + test:unit",
  ]),
  spacer(120),
  p(
    "Los E2E autenticados leen E2E_USER_EMAIL y E2E_USER_PASSWORD de .env.local. Sin esas variables, Playwright solo valida que las rutas protegidas y las descargas redirijan al login."
  ),
];

// ──────────────────────────────────────────────────────────────────
// SECTION 12 — Convenciones
// ──────────────────────────────────────────────────────────────────
const sec12 = [
  h(1, "12. Convenciones de código"),
  table(
    [2800, 2800, 3426],
    ["Elemento", "Convención", "Ejemplo"],
    [
      ["Archivos / carpetas", "kebab-case", "bien-form.tsx"],
      ["Componentes React", "PascalCase", "BienForm"],
      ["Hooks", "camelCase con use", "useBienes"],
      ["Variables / funciones", "camelCase", "valorTotal"],
      ["Tipos / interfaces", "PascalCase", "CreateBienInput"],
      ["Constantes", "UPPER_SNAKE_CASE", "ESTADOS_BIEN"],
      ["Tablas BD", "snake_case plural", "bienes"],
      ["Columnas BD", "snake_case", "valor_unitario"],
      ["Rutas URL", "kebab-case", "/bienes/nuevo"],
    ]
  ),
  spacer(200),
  h(2, "12.1. Reglas duras"),
  bullet("TypeScript strict. Prohibido any (preferir unknown)."),
  bullet(
    "Server Components por defecto. \"use client\" solo cuando se requiera interactividad."
  ),
  bullet(
    "Una mutación que toca más de una tabla pasa por un RPC PL/pgSQL (security invoker)."
  ),
  bullet("Nunca eliminar registros físicamente: soft delete cambiando estado."),
  bullet("No hardcodear strings de roles: usar ROLES.* de lib/constants.ts."),
  bullet("Inglés para código, español para UI."),
];

// ──────────────────────────────────────────────────────────────────
// SECTION 13 — Mantenimiento
// ──────────────────────────────────────────────────────────────────
const sec13 = [
  h(1, "13. Mantenimiento"),
  h(2, "13.1. Tareas periódicas"),
  bullet(
    "Backups: Supabase Cloud genera backups diarios automáticos. Descargar respaldo manual antes de migraciones grandes."
  ),
  bullet(
    "Actualización de dependencias: revisar npm outdated mensualmente. Mayor riesgo: next, @supabase/*, react."
  ),
  bullet(
    "Auditoría de roles: revisar trimestralmente la lista de ADMINISTRADOR y desactivar usuarios que ya no estén en la organización."
  ),
  bullet(
    "Consumo de Storage: monitorear el bucket bienes desde el dashboard de Supabase."
  ),
  bullet("Logs: revisar logs de Supabase y Vercel ante reportes de error."),

  h(2, "13.2. Puntos de extensión"),
  table(
    [3200, 5826],
    ["Necesidad", "Dónde tocar"],
    [
      [
        "Nuevo módulo",
        "app/(dashboard)/<nuevo>/ + entry en NAV_GROUPS (lib/constants.ts).",
      ],
      ["Nueva validación", "lib/validations/<entidad>.ts (Zod)."],
      [
        "Nueva regla de BD",
        "Nueva migración en supabase/migrations/ + RPC si modifica datos.",
      ],
      [
        "Nuevo reporte Excel",
        "app/api/export/<reporte>/route.ts + helper en lib/export/excel.ts.",
      ],
      [
        "Nuevo rol",
        "CHECK constraint en profiles.rol, RPCs require_rol_*, ROLES en constants.ts y políticas RLS.",
      ],
    ]
  ),
  spacer(200),

  h(2, "13.3. Recuperación ante desastres"),
  numbered("Recrear proyecto Supabase y ejecutar la migración baseline."),
  numbered(
    "Restaurar el respaldo más reciente desde el dashboard de Supabase."
  ),
  numbered(
    "Verificar el bucket bienes: las imágenes están vinculadas por URL pública; si se restaura el dump, las URLs siguen siendo válidas."
  ),
  numbered("Revisar variables de entorno en Vercel."),
  numbered("Volver a desplegar el frontend."),
];

// ──────────────────────────────────────────────────────────────────
// SECTION 14 — Referencias
// ──────────────────────────────────────────────────────────────────
const sec14 = [
  h(1, "14. Referencias internas"),
  bullet("README.md — guía rápida de arranque."),
  bullet(
    "AGENTS.md — guía exhaustiva de arquitectura y convenciones para colaboradores."
  ),
  bullet(
    "documentation/CODE_GUIDE.md — recorrido del código para nuevos colaboradores."
  ),
  bullet(
    "supabase/README.md — setup detallado de la BD y modelo de roles."
  ),
  bullet("documentation/CHANGELOG.md — historial de cambios."),
  spacer(400),
  new Paragraph({
    border: {
      top: {
        style: BorderStyle.SINGLE,
        size: 4,
        color: LIGHT,
        space: 8,
      },
    },
    spacing: { before: 400, after: 0 },
    children: [
      new TextRun({
        text:
          "Documento mantenido en documentation/MANUAL_TECNICO.md. Actualizar al introducir cambios estructurales.",
        italics: true,
        size: 18,
        color: GRAY,
      }),
    ],
  }),
];

// ──────────────────────────────────────────────────────────────────
// HEADER / FOOTER
// ──────────────────────────────────────────────────────────────────
const docHeader = new Header({
  children: [
    new Paragraph({
      tabStops: [
        { type: TabStopType.RIGHT, position: TabStopPosition.MAX },
      ],
      border: {
        bottom: {
          style: BorderStyle.SINGLE,
          size: 4,
          color: LIGHT,
          space: 4,
        },
      },
      spacing: { after: 0 },
      children: [
        new TextRun({
          text: "SYSTEMACT — Manual técnico",
          size: 18,
          color: GRAY,
        }),
        new TextRun({ text: "\tConviventia", size: 18, color: GRAY }),
      ],
    }),
  ],
});

const docFooter = new Footer({
  children: [
    new Paragraph({
      tabStops: [
        { type: TabStopType.RIGHT, position: TabStopPosition.MAX },
      ],
      border: {
        top: {
          style: BorderStyle.SINGLE,
          size: 4,
          color: LIGHT,
          space: 4,
        },
      },
      spacing: { before: 0 },
      children: [
        new TextRun({ text: "v1.0 · Mayo 2026", size: 18, color: GRAY }),
        new TextRun({ text: "\tPágina ", size: 18, color: GRAY }),
        new TextRun({ children: [PageNumber.CURRENT], size: 18, color: GRAY }),
      ],
    }),
  ],
});

// ──────────────────────────────────────────────────────────────────
// DOCUMENT
// ──────────────────────────────────────────────────────────────────
const doc = new Document({
  creator: "Diego Alejandro Henao Henao",
  title: "Manual Técnico — SYSTEMACT",
  description: "Manual técnico del sistema de inventario SYSTEMACT — Conviventia",
  styles: {
    default: {
      document: { run: { font: "Calibri", size: 22 } }, // 11pt
    },
    paragraphStyles: [
      {
        id: "Heading1",
        name: "Heading 1",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { size: 36, bold: true, font: "Calibri", color: ACCENT },
        paragraph: {
          spacing: { before: 480, after: 200 },
          outlineLevel: 0,
          border: {
            bottom: {
              style: BorderStyle.SINGLE,
              size: 4,
              color: LIGHT,
              space: 6,
            },
          },
        },
      },
      {
        id: "Heading2",
        name: "Heading 2",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { size: 26, bold: true, font: "Calibri", color: ACCENT },
        paragraph: {
          spacing: { before: 320, after: 140 },
          outlineLevel: 1,
        },
      },
      {
        id: "Heading3",
        name: "Heading 3",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { size: 22, bold: true, font: "Calibri", color: NAVY },
        paragraph: {
          spacing: { before: 240, after: 120 },
          outlineLevel: 2,
        },
      },
    ],
  },
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [
          {
            level: 0,
            format: LevelFormat.BULLET,
            text: "•",
            alignment: AlignmentType.LEFT,
            style: {
              paragraph: { indent: { left: 540, hanging: 280 } },
            },
          },
          {
            level: 1,
            format: LevelFormat.BULLET,
            text: "◦",
            alignment: AlignmentType.LEFT,
            style: {
              paragraph: { indent: { left: 1080, hanging: 280 } },
            },
          },
        ],
      },
      {
        reference: "numbers",
        levels: [
          {
            level: 0,
            format: LevelFormat.DECIMAL,
            text: "%1.",
            alignment: AlignmentType.LEFT,
            style: {
              paragraph: { indent: { left: 540, hanging: 280 } },
            },
          },
        ],
      },
    ],
  },
  sections: [
    {
      properties: {
        page: {
          size: {
            width: PAGE_WIDTH,
            height: PAGE_HEIGHT,
            orientation: PageOrientation.PORTRAIT,
          },
          margin: {
            top: MARGIN,
            right: MARGIN,
            bottom: MARGIN,
            left: MARGIN,
          },
        },
      },
      headers: { default: docHeader },
      footers: { default: docFooter },
      children: [
        ...coverFinal,
        ...toc,
        ...sec1,
        ...sec2,
        ...sec3,
        ...sec4,
        ...sec5,
        ...sec6,
        ...sec7,
        ...sec8,
        ...sec9,
        ...sec10,
        ...sec11,
        ...sec12,
        ...sec13,
        ...sec14,
      ],
    },
  ],
});

const outPath = path.join(
  "C:\\git\\systemact\\documentation",
  "Manual_Tecnico_SYSTEMACT.docx"
);

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync(outPath, buffer);
  console.log("OK →", outPath);
});

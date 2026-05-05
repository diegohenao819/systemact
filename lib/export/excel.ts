import ExcelJS from "exceljs";

// ─── Constantes de estilo ────────────────────────────────────────────────

const COLOR_PRIMARY = "FF0F172A"; // slate-900
const COLOR_HEADER_BG = "FFE2E8F0"; // slate-200
const COLOR_TOTAL_BG = "FFF1F5F9"; // slate-100
const COLOR_BORDER = "FFCBD5E1"; // slate-300

export const HEADER_STYLE: Partial<ExcelJS.Style> = {
  font: { bold: true, color: { argb: COLOR_PRIMARY }, size: 11 },
  fill: {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: COLOR_HEADER_BG },
  },
  alignment: { vertical: "middle", horizontal: "left" },
  border: {
    bottom: { style: "thin", color: { argb: COLOR_BORDER } },
  },
};

export const TOTAL_STYLE: Partial<ExcelJS.Style> = {
  font: { bold: true, color: { argb: COLOR_PRIMARY } },
  fill: {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: COLOR_TOTAL_BG },
  },
};

// Formato de moneda colombiana sin decimales
export const COP_FORMAT = '"$"#,##0;[Red]-"$"#,##0';

// ─── Helpers ─────────────────────────────────────────────────────────────

/**
 * Crea un workbook con metadata estándar del proyecto.
 */
export function createWorkbook(): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  wb.creator = "SYSTEMACT";
  wb.lastModifiedBy = "SYSTEMACT";
  wb.created = new Date();
  wb.modified = new Date();
  return wb;
}

/**
 * Aplica el estilo de encabezado a la primera fila de la hoja.
 */
export function styleHeader(ws: ExcelJS.Worksheet, rowNumber = 1) {
  const row = ws.getRow(rowNumber);
  row.eachCell((cell) => {
    cell.style = HEADER_STYLE;
  });
  row.height = 22;
}

/**
 * Convierte el workbook a Buffer para servirlo desde un Route Handler.
 */
export async function workbookToBuffer(
  wb: ExcelJS.Workbook,
): Promise<ArrayBuffer> {
  const buffer = await wb.xlsx.writeBuffer();
  return buffer as ArrayBuffer;
}

/**
 * Genera los headers HTTP estándar para descargar un archivo .xlsx
 */
export function xlsxResponseHeaders(filename: string): HeadersInit {
  // Sanitiza el nombre: solo ASCII para evitar problemas en navegadores
  const safe = filename.replace(/[^\x20-\x7E]/g, "_");
  return {
    "Content-Type":
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "Content-Disposition": `attachment; filename="${safe}"`,
    "Cache-Control": "no-store",
  };
}

/**
 * Sufijo de fecha para nombres de archivo (yyyymmdd-hhmm).
 */
export function timestampSuffix(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
}

/**
 * Format helper: nombres del responsable a partir de profile relacional.
 */
export function unwrap<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

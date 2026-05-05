import { afterEach, describe, expect, it, vi } from "vitest";
import {
  COP_FORMAT,
  createWorkbook,
  styleHeader,
  timestampSuffix,
  unwrap,
  workbookToBuffer,
  xlsxResponseHeaders,
} from "@/lib/export/excel";

describe("helpers de Excel", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("crea workbooks con metadata de SYSTEMACT", () => {
    const wb = createWorkbook();

    expect(wb.creator).toBe("SYSTEMACT");
    expect(wb.lastModifiedBy).toBe("SYSTEMACT");
  });

  it("aplica estilo de encabezado y conserva formato COP sin decimales", () => {
    const wb = createWorkbook();
    const ws = wb.addWorksheet("Inventario");
    ws.addRow(["Codigo", "Valor"]);

    styleHeader(ws);
    ws.getCell("B2").numFmt = COP_FORMAT;

    expect(ws.getRow(1).height).toBe(22);
    expect(ws.getCell("A1").font?.bold).toBe(true);
    expect(ws.getCell("B2").numFmt).toBe('"$"#,##0;[Red]-"$"#,##0');
  });

  it("genera buffers xlsx reales", async () => {
    const wb = createWorkbook();
    wb.addWorksheet("Hoja").addRow(["ok"]);

    const buffer = await workbookToBuffer(wb);

    expect(buffer.byteLength).toBeGreaterThan(1000);
  });

  it("sanitiza nombres no ASCII en headers de descarga", () => {
    const headers = xlsxResponseHeaders("historial-CÓDIGO-ñ.xlsx");

    expect(headers["Content-Type"]).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    expect(headers["Content-Disposition"]).toBe(
      'attachment; filename="historial-C_DIGO-_.xlsx"',
    );
    expect(headers["Cache-Control"]).toBe("no-store");
  });

  it("genera sufijos de fecha estables para nombres de archivo", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 5, 9, 7));

    expect(timestampSuffix()).toBe("20260505-0907");
  });

  it("normaliza relaciones embebidas de Supabase", () => {
    const value = { nombre: "Bogota" };

    expect(unwrap(value)).toEqual(value);
    expect(unwrap([value])).toEqual(value);
    expect(unwrap([])).toBeNull();
    expect(unwrap(null)).toBeNull();
  });
});

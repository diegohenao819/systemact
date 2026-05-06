import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createWorkbook,
  styleHeader,
  workbookToBuffer,
  xlsxResponseHeaders,
  timestampSuffix,
  COP_FORMAT,
  TOTAL_STYLE,
  unwrap,
} from "@/lib/export/excel";

interface BienRow {
  id_bien: number;
  codigo_generado: string;
  nombre: string;
  estado: string;
  cantidad: number;
  valor_unitario: number;
  valor_total: number;
  placa: string | null;
  serial: string | null;
  observaciones: string | null;
  responsable_texto: string | null;
  fecha_registro: string | null;
  sedes: { nombre_sede: string } | { nombre_sede: string }[] | null;
  areas: { nombre_area: string } | { nombre_area: string }[] | null;
  caracteristicas:
    | { codigo: string; descripcion: string }
    | { codigo: string; descripcion: string }[]
    | null;
  profiles:
    | { nombre: string; apellido: string }
    | { nombre: string; apellido: string }[]
    | null;
}

/**
 * Exporta el inventario activo a Excel.
 *
 * Es un Route Handler de solo lectura porque debe devolver un archivo binario.
 * La autenticación se valida con el usuario actual y la consulta queda sujeta a
 * las políticas RLS de Supabase.
 */
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("bienes")
    .select(
      `
      id_bien,
      codigo_generado,
      nombre,
      estado,
      cantidad,
      valor_unitario,
      valor_total,
      placa,
      serial,
      observaciones,
      responsable_texto,
      fecha_registro,
      sedes ( nombre_sede ),
      areas ( nombre_area ),
      caracteristicas ( codigo, descripcion ),
      profiles:id_responsable ( nombre, apellido )
    `,
    )
    .neq("estado", "DE BAJA")
    .order("codigo_generado");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const bienes = (data ?? []) as BienRow[];

  const wb = createWorkbook();
  const ws = wb.addWorksheet("Bienes", {
    properties: { defaultColWidth: 18 },
  });

  ws.mergeCells("A1:M1");
  ws.getCell("A1").value = "INVENTARIO DE BIENES — SYSTEMACT";
  ws.getCell("A1").font = { bold: true, size: 14 };
  ws.getCell("A1").alignment = { horizontal: "center" };
  ws.getRow(1).height = 24;

  ws.getCell("A2").value = "Generado:";
  ws.getCell("A2").font = { bold: true };
  ws.getCell("B2").value = new Date();
  ws.getCell("B2").numFmt = "yyyy-mm-dd hh:mm";

  ws.getCell("D2").value = "Total registros:";
  ws.getCell("D2").font = { bold: true };
  ws.getCell("E2").value = bienes.length;

  const headerRowNum = 4;
  ws.getRow(headerRowNum).values = [
    "Código",
    "Nombre",
    "Tipo",
    "Sede",
    "Área",
    "Responsable",
    "Placa",
    "Serial",
    "Estado",
    "Cant.",
    "V. unitario",
    "V. total",
    "Fecha registro",
  ];
  styleHeader(ws, headerRowNum);

  ws.columns = [
    { key: "codigo", width: 16 },
    { key: "nombre", width: 32 },
    { key: "tipo", width: 24 },
    { key: "sede", width: 22 },
    { key: "area", width: 22 },
    { key: "responsable", width: 26 },
    { key: "placa", width: 14 },
    { key: "serial", width: 16 },
    { key: "estado", width: 12 },
    { key: "cant", width: 8 },
    { key: "vunit", width: 16 },
    { key: "vtotal", width: 16 },
    { key: "fecha", width: 14 },
  ];

  let totalCant = 0;
  let totalValor = 0;

  bienes.forEach((b, idx) => {
    const sede = unwrap(b.sedes)?.nombre_sede ?? "—";
    const area = unwrap(b.areas)?.nombre_area ?? "—";
    const tipo = unwrap(b.caracteristicas);
    const tipoLabel = tipo ? `${tipo.codigo} — ${tipo.descripcion}` : "—";
    const profile = unwrap(b.profiles);
    const responsable = profile
      ? `${profile.nombre} ${profile.apellido}`.trim()
      : b.responsable_texto ?? "—";
    const valorTotal = Number(b.valor_total ?? 0);

    const row = ws.getRow(headerRowNum + 1 + idx);
    row.values = [
      b.codigo_generado,
      b.nombre,
      tipoLabel,
      sede,
      area,
      responsable,
      b.placa ?? "",
      b.serial ?? "",
      b.estado,
      b.cantidad,
      Number(b.valor_unitario),
      valorTotal,
      b.fecha_registro ? new Date(b.fecha_registro) : null,
    ];

    row.getCell(11).numFmt = COP_FORMAT;
    row.getCell(12).numFmt = COP_FORMAT;
    if (b.fecha_registro) {
      row.getCell(13).numFmt = "yyyy-mm-dd";
    }

    totalCant += b.cantidad ?? 0;
    totalValor += valorTotal;
  });

  if (bienes.length > 0) {
    const totalRow = ws.getRow(headerRowNum + 1 + bienes.length);
    totalRow.getCell(1).value = "TOTAL";
    totalRow.getCell(10).value = totalCant;
    totalRow.getCell(12).value = totalValor;
    totalRow.getCell(12).numFmt = COP_FORMAT;
    [1, 10, 12].forEach((col) => {
      totalRow.getCell(col).style = TOTAL_STYLE;
    });
  }

  // Auto-filtro en los headers
  ws.autoFilter = {
    from: { row: headerRowNum, column: 1 },
    to: { row: headerRowNum, column: 13 },
  };

  // Freeze panes para que el header quede fijo al hacer scroll
  ws.views = [{ state: "frozen", ySplit: headerRowNum }];

  const buffer = await workbookToBuffer(wb);
  const filename = `bienes-${timestampSuffix()}.xlsx`;

  return new NextResponse(buffer, {
    status: 200,
    headers: xlsxResponseHeaders(filename),
  });
}

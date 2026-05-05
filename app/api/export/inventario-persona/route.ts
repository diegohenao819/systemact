import { NextRequest, NextResponse } from "next/server";
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

interface BienAsignado {
  id_bien: number;
  codigo_generado: string;
  nombre: string;
  estado: string;
  cantidad: number;
  valor_unitario: number;
  valor_total: number;
  placa: string | null;
  serial: string | null;
  fecha_registro: string | null;
  sedes: { nombre_sede: string } | { nombre_sede: string }[] | null;
  areas: { nombre_area: string } | { nombre_area: string }[] | null;
  caracteristicas:
    | { codigo: string; descripcion: string }
    | { codigo: string; descripcion: string }[]
    | null;
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();

  // 1. Auth: requiere sesión
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // 2. Validar parámetro
  const personaId = req.nextUrl.searchParams.get("persona");
  if (!personaId) {
    return NextResponse.json(
      { error: "Parámetro 'persona' es requerido" },
      { status: 400 },
    );
  }

  // 3. Cargar persona y sus bienes en paralelo
  const [{ data: persona }, { data: bienes }] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "nombre, apellido, cedula, cargo, area, sedes ( nombre_sede )",
      )
      .eq("id", personaId)
      .maybeSingle(),
    supabase
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
        fecha_registro,
        sedes ( nombre_sede ),
        areas ( nombre_area ),
        caracteristicas ( codigo, descripcion )
      `,
      )
      .eq("id_responsable", personaId)
      .neq("estado", "DE BAJA")
      .order("codigo_generado"),
  ]);

  if (!persona) {
    return NextResponse.json(
      { error: "Persona no encontrada" },
      { status: 404 },
    );
  }

  const bienesData = (bienes ?? []) as BienAsignado[];
  const sedePersona = unwrap(
    (persona.sedes ?? null) as
      | { nombre_sede: string }
      | { nombre_sede: string }[]
      | null,
  )?.nombre_sede;

  // 4. Construir el workbook
  const wb = createWorkbook();
  const ws = wb.addWorksheet("Inventario por persona", {
    properties: { defaultColWidth: 18 },
  });

  // ── Encabezado del reporte
  ws.mergeCells("A1:I1");
  ws.getCell("A1").value = "REPORTE DE INVENTARIO POR PERSONA";
  ws.getCell("A1").font = { bold: true, size: 14 };
  ws.getCell("A1").alignment = { horizontal: "center" };
  ws.getRow(1).height = 24;

  ws.getCell("A2").value = "Responsable:";
  ws.getCell("A2").font = { bold: true };
  ws.getCell("B2").value = `${persona.nombre} ${persona.apellido}`;

  if (persona.cedula) {
    ws.getCell("A3").value = "Cédula:";
    ws.getCell("A3").font = { bold: true };
    ws.getCell("B3").value = persona.cedula;
  }
  if (persona.cargo) {
    ws.getCell("A4").value = "Cargo:";
    ws.getCell("A4").font = { bold: true };
    ws.getCell("B4").value = persona.cargo;
  }
  if (sedePersona || persona.area) {
    ws.getCell("D2").value = "Sede:";
    ws.getCell("D2").font = { bold: true };
    ws.getCell("E2").value = sedePersona ?? "—";
    ws.getCell("D3").value = "Área:";
    ws.getCell("D3").font = { bold: true };
    ws.getCell("E3").value = persona.area ?? "—";
  }

  ws.getCell("G2").value = "Fecha de generación:";
  ws.getCell("G2").font = { bold: true };
  ws.getCell("H2").value = new Date();
  ws.getCell("H2").numFmt = "yyyy-mm-dd hh:mm";

  // ── Tabla
  const headerRowNum = 6;
  ws.getRow(headerRowNum).values = [
    "Código",
    "Nombre",
    "Tipo",
    "Sede",
    "Área",
    "Placa",
    "Serial",
    "Estado",
    "Cant.",
    "V. unitario",
    "V. total",
  ];
  styleHeader(ws, headerRowNum);

  ws.columns = [
    { key: "codigo", width: 16 },
    { key: "nombre", width: 32 },
    { key: "tipo", width: 22 },
    { key: "sede", width: 22 },
    { key: "area", width: 22 },
    { key: "placa", width: 14 },
    { key: "serial", width: 16 },
    { key: "estado", width: 12 },
    { key: "cant", width: 8 },
    { key: "vunit", width: 16 },
    { key: "vtotal", width: 16 },
  ];

  let totalCant = 0;
  let totalValor = 0;

  bienesData.forEach((b, idx) => {
    const sede = unwrap(b.sedes)?.nombre_sede ?? "—";
    const area = unwrap(b.areas)?.nombre_area ?? "—";
    const tipo = unwrap(b.caracteristicas);
    const tipoLabel = tipo ? `${tipo.codigo} — ${tipo.descripcion}` : "—";
    const valorTotal = Number(b.valor_total ?? 0);

    const row = ws.getRow(headerRowNum + 1 + idx);
    row.values = [
      b.codigo_generado,
      b.nombre,
      tipoLabel,
      sede,
      area,
      b.placa ?? "",
      b.serial ?? "",
      b.estado,
      b.cantidad,
      Number(b.valor_unitario),
      valorTotal,
    ];

    row.getCell(10).numFmt = COP_FORMAT;
    row.getCell(11).numFmt = COP_FORMAT;

    totalCant += b.cantidad ?? 0;
    totalValor += valorTotal;
  });

  // Fila de totales
  if (bienesData.length > 0) {
    const totalRowNum = headerRowNum + 1 + bienesData.length;
    const totalRow = ws.getRow(totalRowNum);
    totalRow.getCell(1).value = "TOTAL";
    totalRow.getCell(9).value = totalCant;
    totalRow.getCell(11).value = totalValor;
    totalRow.getCell(11).numFmt = COP_FORMAT;
    [1, 9, 11].forEach((col) => {
      totalRow.getCell(col).style = TOTAL_STYLE;
    });
  } else {
    const empty = ws.getRow(headerRowNum + 1);
    empty.getCell(1).value = "Esta persona no tiene bienes asignados.";
    ws.mergeCells(empty.number, 1, empty.number, 11);
    empty.alignment = { horizontal: "center" };
    empty.font = { italic: true, color: { argb: "FF94A3B8" } };
  }

  // 5. Servir archivo
  const buffer = await workbookToBuffer(wb);
  const filename = `inventario-${persona.apellido}-${persona.nombre}-${timestampSuffix()}.xlsx`;

  return new NextResponse(buffer, {
    status: 200,
    headers: xlsxResponseHeaders(filename),
  });
}

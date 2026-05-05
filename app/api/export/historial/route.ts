import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createWorkbook,
  styleHeader,
  workbookToBuffer,
  xlsxResponseHeaders,
  timestampSuffix,
  COP_FORMAT,
  unwrap,
} from "@/lib/export/excel";

interface BienDetalle {
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

interface Movimiento {
  id_movimiento: number;
  tipo_movimiento: string;
  detalle: string | null;
  created_at: string;
  profiles:
    | { nombre: string; apellido: string }
    | { nombre: string; apellido: string }[]
    | null;
}

interface BajaInfo {
  motivo: string;
  descripcion: string | null;
  created_at: string;
  profiles:
    | { nombre: string; apellido: string }
    | { nombre: string; apellido: string }[]
    | null;
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const bienParam = req.nextUrl.searchParams.get("bien");
  const bienId = bienParam ? Number(bienParam) : null;
  if (!bienId || Number.isNaN(bienId)) {
    return NextResponse.json(
      { error: "Parámetro 'bien' es requerido" },
      { status: 400 },
    );
  }

  const [{ data: bien }, { data: movimientos }, { data: baja }] =
    await Promise.all([
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
          observaciones,
          responsable_texto,
          fecha_registro,
          sedes ( nombre_sede ),
          areas ( nombre_area ),
          caracteristicas ( codigo, descripcion ),
          profiles:id_responsable ( nombre, apellido )
        `,
        )
        .eq("id_bien", bienId)
        .maybeSingle(),
      supabase
        .from("movimiento_bienes")
        .select(
          `
          id_movimiento,
          tipo_movimiento,
          detalle,
          created_at,
          profiles:usuario_responsable ( nombre, apellido )
        `,
        )
        .eq("id_bien", bienId)
        .order("created_at", { ascending: true }),
      supabase
        .from("bajas")
        .select(
          `
          motivo,
          descripcion,
          created_at,
          profiles:usuario_registro ( nombre, apellido )
        `,
        )
        .eq("id_bien", bienId)
        .maybeSingle(),
    ]);

  if (!bien) {
    return NextResponse.json({ error: "Bien no encontrado" }, { status: 404 });
  }

  const bienData = bien as BienDetalle;
  const movs = (movimientos ?? []) as Movimiento[];
  const bajaData = baja as BajaInfo | null;

  const wb = createWorkbook();

  // ─── Hoja 1: Información del bien ──────────────────────────────────────
  const ws1 = wb.addWorksheet("Información del bien");
  ws1.columns = [
    { key: "campo", width: 24 },
    { key: "valor", width: 50 },
  ];

  ws1.mergeCells("A1:B1");
  ws1.getCell("A1").value = "HISTORIAL DEL BIEN";
  ws1.getCell("A1").font = { bold: true, size: 14 };
  ws1.getCell("A1").alignment = { horizontal: "center" };
  ws1.getRow(1).height = 24;

  const sede = unwrap(bienData.sedes)?.nombre_sede ?? "—";
  const area = unwrap(bienData.areas)?.nombre_area ?? "—";
  const tipo = unwrap(bienData.caracteristicas);
  const tipoLabel = tipo ? `${tipo.codigo} — ${tipo.descripcion}` : "—";
  const profile = unwrap(bienData.profiles);
  const responsable = profile
    ? `${profile.nombre} ${profile.apellido}`
    : bienData.responsable_texto ?? "—";

  const filas: [string, string | number | Date | null, string?][] = [
    ["Código", bienData.codigo_generado],
    ["Nombre", bienData.nombre],
    ["Tipo", tipoLabel],
    ["Estado", bienData.estado],
    ["Sede", sede],
    ["Área", area],
    ["Responsable", responsable],
    ["Cantidad", bienData.cantidad],
    ["Valor unitario", Number(bienData.valor_unitario), COP_FORMAT],
    ["Valor total", Number(bienData.valor_total ?? 0), COP_FORMAT],
    ["Placa", bienData.placa ?? "—"],
    ["Serial", bienData.serial ?? "—"],
    [
      "Fecha de registro",
      bienData.fecha_registro ? new Date(bienData.fecha_registro) : "—",
      "yyyy-mm-dd",
    ],
    ["Observaciones", bienData.observaciones ?? "—"],
  ];

  filas.forEach(([campo, valor, fmt], idx) => {
    const row = ws1.getRow(3 + idx);
    row.getCell(1).value = campo;
    row.getCell(1).font = { bold: true };
    row.getCell(2).value = valor;
    if (fmt) row.getCell(2).numFmt = fmt;
  });

  // ─── Hoja 2: Información de la baja (si aplica) ─────────────────────────
  if (bajaData) {
    const ws2 = wb.addWorksheet("Baja");
    ws2.columns = [
      { key: "campo", width: 24 },
      { key: "valor", width: 80 },
    ];

    ws2.mergeCells("A1:B1");
    ws2.getCell("A1").value = "INFORMACIÓN DE LA BAJA";
    ws2.getCell("A1").font = { bold: true, size: 14, color: { argb: "FF991B1B" } };
    ws2.getCell("A1").alignment = { horizontal: "center" };
    ws2.getRow(1).height = 24;

    const u = unwrap(bajaData.profiles);
    const usuarioBaja = u ? `${u.nombre} ${u.apellido}` : "—";

    const bajaFilas: [string, string | Date][] = [
      ["Motivo", bajaData.motivo],
      ["Fecha", new Date(bajaData.created_at)],
      ["Registró", usuarioBaja],
      ["Descripción", bajaData.descripcion ?? "—"],
    ];

    bajaFilas.forEach(([campo, valor], idx) => {
      const row = ws2.getRow(3 + idx);
      row.getCell(1).value = campo;
      row.getCell(1).font = { bold: true };
      row.getCell(2).value = valor;
      if (valor instanceof Date) {
        row.getCell(2).numFmt = "yyyy-mm-dd hh:mm";
      }
    });
  }

  // ─── Hoja 3: Movimientos ────────────────────────────────────────────────
  const ws3 = wb.addWorksheet("Movimientos");
  ws3.columns = [
    { key: "fecha", width: 18 },
    { key: "tipo", width: 16 },
    { key: "detalle", width: 60 },
    { key: "usuario", width: 26 },
  ];

  ws3.mergeCells("A1:D1");
  ws3.getCell("A1").value = `MOVIMIENTOS DE ${bienData.codigo_generado}`;
  ws3.getCell("A1").font = { bold: true, size: 14 };
  ws3.getCell("A1").alignment = { horizontal: "center" };
  ws3.getRow(1).height = 24;

  const headerRowNum = 3;
  ws3.getRow(headerRowNum).values = ["Fecha", "Tipo", "Detalle", "Registró"];
  styleHeader(ws3, headerRowNum);

  movs.forEach((mov, idx) => {
    const u = unwrap(mov.profiles);
    const usuario = u ? `${u.nombre} ${u.apellido}` : "Sistema";
    const row = ws3.getRow(headerRowNum + 1 + idx);
    row.values = [
      new Date(mov.created_at),
      mov.tipo_movimiento,
      mov.detalle ?? "",
      usuario,
    ];
    row.getCell(1).numFmt = "yyyy-mm-dd hh:mm";
  });

  if (movs.length === 0) {
    const empty = ws3.getRow(headerRowNum + 1);
    empty.getCell(1).value = "No hay movimientos registrados.";
    ws3.mergeCells(empty.number, 1, empty.number, 4);
    empty.alignment = { horizontal: "center" };
    empty.font = { italic: true, color: { argb: "FF94A3B8" } };
  } else {
    ws3.autoFilter = {
      from: { row: headerRowNum, column: 1 },
      to: { row: headerRowNum, column: 4 },
    };
    ws3.views = [{ state: "frozen", ySplit: headerRowNum }];
  }

  const buffer = await workbookToBuffer(wb);
  const filename = `historial-${bienData.codigo_generado}-${timestampSuffix()}.xlsx`;

  return new NextResponse(buffer, {
    status: 200,
    headers: xlsxResponseHeaders(filename),
  });
}

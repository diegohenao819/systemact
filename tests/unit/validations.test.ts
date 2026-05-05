import { describe, expect, it } from "vitest";
import { createBajaActionSchema } from "@/lib/validations/baja";
import { createBienActionSchema } from "@/lib/validations/bien";
import { createCategoriaActionSchema } from "@/lib/validations/categoria";
import { createTransferenciaActionSchema } from "@/lib/validations/transferencia";

describe("validaciones de bienes", () => {
  const baseBien = {
    nombre: "Portatil administrativo",
    id_caracteristica: "2",
    id_sede: "1",
    id_area: "3",
    id_responsable: "",
    responsable_texto: "Responsable externo",
    serial: "SN-001",
    placa: "PL-001",
    cantidad: "2",
    valor_unitario: "1500000",
    estado: "ACTIVO",
    observaciones: "",
    imagen_url: "https://example.com/bien.webp",
  };

  it("convierte FormData string a tipos numericos seguros", () => {
    const parsed = createBienActionSchema.parse(baseBien);

    expect(parsed.id_caracteristica).toBe(2);
    expect(parsed.id_sede).toBe(1);
    expect(parsed.id_area).toBe(3);
    expect(parsed.cantidad).toBe(2);
    expect(parsed.valor_unitario).toBe(1_500_000);
  });

  it("rechaza valores negativos y estados no permitidos al crear bienes", () => {
    expect(
      createBienActionSchema.safeParse({
        ...baseBien,
        valor_unitario: "-1",
      }).success,
    ).toBe(false);

    expect(
      createBienActionSchema.safeParse({
        ...baseBien,
        estado: "DE BAJA",
      }).success,
    ).toBe(false);
  });
});

describe("validaciones de transferencias", () => {
  it("exige bien, sede, area y motivo suficientemente descriptivo", () => {
    expect(
      createTransferenciaActionSchema.safeParse({
        id_bien: "10",
        sede_destino: "2",
        area_destino: "4",
        responsable_destino: "",
        responsable_destino_texto: "Desconocido",
        motivo: "Reubicacion por cambio de oficina",
      }).success,
    ).toBe(true);

    expect(
      createTransferenciaActionSchema.safeParse({
        id_bien: "0",
        sede_destino: "2",
        area_destino: "4",
        responsable_destino: "",
        responsable_destino_texto: "",
        motivo: "ok",
      }).success,
    ).toBe(false);
  });
});

describe("validaciones de bajas", () => {
  it("solo acepta motivos tipificados y limita la descripcion", () => {
    expect(
      createBajaActionSchema.safeParse({
        id_bien: "5",
        motivo: "OBSOLESCENCIA",
        descripcion: "Equipo fuera de vida util",
      }).success,
    ).toBe(true);

    expect(
      createBajaActionSchema.safeParse({
        id_bien: "5",
        motivo: "MOTIVO INVENTADO",
        descripcion: "",
      }).success,
    ).toBe(false);

    expect(
      createBajaActionSchema.safeParse({
        id_bien: "5",
        motivo: "OTRO",
        descripcion: "x".repeat(501),
      }).success,
    ).toBe(false);
  });
});

describe("validaciones de categorias", () => {
  it("requiere prefijos en mayusculas, alfanumericos y de longitud controlada", () => {
    expect(
      createCategoriaActionSchema.safeParse({
        codigo: "PORT1",
        descripcion: "Portatiles",
        observaciones: "",
      }).success,
    ).toBe(true);

    expect(
      createCategoriaActionSchema.safeParse({
        codigo: "port",
        descripcion: "Portatiles",
        observaciones: "",
      }).success,
    ).toBe(false);

    expect(
      createCategoriaActionSchema.safeParse({
        codigo: "PORTATILES",
        descripcion: "Portatiles",
        observaciones: "",
      }).success,
    ).toBe(false);
  });
});

"use client";

import { useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import Link from "next/link";
import { Search, ChevronLeft, ChevronRight, ArrowUpDown, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface BienRow {
  id_bien: number;
  codigo_generado: string;
  nombre: string;
  estado: string;
  cantidad: number;
  valor_unitario: number;
  valor_total: number;
  placa: string | null;
  created_at: string;
  sedes: { nombre_sede: string } | null;
  areas: { nombre_area: string } | null;
  profiles: { nombre: string; apellido: string } | null;
}

const formatCOP = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(value);

const estadoColors: Record<string, string> = {
  ACTIVO: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  INACTIVO: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  "DE BAJA": "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const columns: ColumnDef<BienRow>[] = [
  {
    accessorKey: "codigo_generado",
    header: "Código",
    cell: ({ row }) => (
      <span className="font-mono text-sm font-semibold">
        {row.getValue("codigo_generado")}
      </span>
    ),
    size: 140,
  },
  {
    accessorKey: "nombre",
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Nombre
        <ArrowUpDown className="ml-2 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => (
      <div>
        <span className="font-medium">{row.getValue("nombre")}</span>
        {row.original.placa && (
          <span className="block text-xs text-muted-foreground">
            Placa: {row.original.placa}
          </span>
        )}
      </div>
    ),
  },
  {
    id: "sede",
    header: "Sede",
    accessorFn: (row) => row.sedes?.nombre_sede ?? "",
    cell: ({ row }) => (
      <span className="text-sm">
        {row.original.sedes?.nombre_sede ?? "—"}
      </span>
    ),
  },
  {
    id: "area",
    header: "Área",
    accessorFn: (row) => row.areas?.nombre_area ?? "",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.areas?.nombre_area ?? "—"}
      </span>
    ),
  },
  {
    id: "responsable",
    header: "Responsable",
    accessorFn: (row) =>
      row.profiles
        ? `${row.profiles.nombre} ${row.profiles.apellido}`
        : "",
    cell: ({ row }) =>
      row.original.profiles ? (
        <span className="text-sm">
          {row.original.profiles.nombre} {row.original.profiles.apellido}
        </span>
      ) : (
        <span className="text-sm text-muted-foreground">—</span>
      ),
  },
  {
    accessorKey: "estado",
    header: "Estado",
    cell: ({ row }) => {
      const estado = row.getValue("estado") as string;
      return (
        <Badge
          variant="outline"
          className={`text-[10px] font-semibold ${estadoColors[estado] ?? ""}`}
        >
          {estado}
        </Badge>
      );
    },
    size: 100,
  },
  {
    accessorKey: "valor_total",
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Valor Total
        <ArrowUpDown className="ml-2 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="text-sm font-medium">
        {formatCOP(row.getValue("valor_total"))}
      </span>
    ),
    size: 140,
  },
  {
    id: "acciones",
    header: "",
    cell: ({ row }) => (
      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
        <Link href={`/bienes/${row.original.id_bien}`}>
          <Eye className="h-4 w-4" />
        </Link>
      </Button>
    ),
    size: 50,
  },
];

interface BienesTableProps {
  data: BienRow[];
}

export function BienesTable({ data }: BienesTableProps) {
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: { globalFilter, sorting },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    initialState: {
      pagination: { pageSize: 15 },
    },
  });

  // Sumar valor total de los bienes filtrados
  const totalValor = table
    .getFilteredRowModel()
    .rows.reduce((sum, row) => sum + (row.original.valor_total ?? 0), 0);

  return (
    <div className="space-y-4">
      {/* Buscador */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por código, nombre, sede, responsable..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Tabla */}
      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  No se encontraron bienes.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Footer: paginación + resumen */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground space-y-1">
          <p>
            {table.getFilteredRowModel().rows.length} bien(es) —{" "}
            <span className="font-semibold text-foreground">
              {formatCOP(totalValor)}
            </span>{" "}
            valor total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {table.getState().pagination.pageIndex + 1} de{" "}
            {table.getPageCount()}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

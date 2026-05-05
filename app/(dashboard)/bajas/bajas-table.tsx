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
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SortableHeader } from "@/components/ui/sortable-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ProfileRel = { nombre: string; apellido: string };
type BienRel = { id_bien: number; codigo_generado: string; nombre: string };

interface BajaRow {
  id_baja: number;
  motivo: string;
  descripcion: string | null;
  created_at: string;
  bienes: BienRel | BienRel[] | null;
  usuario_registro_rel: ProfileRel | ProfileRel[] | null;
}

function unwrap<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

const formatFecha = (iso: string) =>
  new Date(iso).toLocaleDateString("es-CO", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const motivoStyles: Record<string, string> = {
  "DAÑO IRREPARABLE":
    "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-800",
  OBSOLESCENCIA:
    "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700",
  ROBO: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 border-orange-200 dark:border-orange-800",
  PERDIDA:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  DONACION:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  VENTA:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  OTRO: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-800",
};

const columns: ColumnDef<BajaRow>[] = [
  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <SortableHeader column={column}>Fecha</SortableHeader>
    ),
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground whitespace-nowrap">
        {formatFecha(row.getValue("created_at"))}
      </span>
    ),
    size: 160,
  },
  {
    id: "bien",
    header: ({ column }) => (
      <SortableHeader column={column}>Bien</SortableHeader>
    ),
    accessorFn: (row) => {
      const bien = unwrap(row.bienes);
      return bien ? `${bien.codigo_generado} ${bien.nombre}` : "";
    },
    cell: ({ row }) => {
      const bien = unwrap(row.original.bienes);
      if (!bien) return <span className="text-muted-foreground">—</span>;
      return (
        <div>
          <span className="font-mono text-xs font-semibold">
            {bien.codigo_generado}
          </span>
          <span className="block text-sm">{bien.nombre}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "motivo",
    header: ({ column }) => (
      <SortableHeader column={column}>Motivo</SortableHeader>
    ),
    cell: ({ row }) => {
      const motivo = row.getValue("motivo") as string;
      return (
        <Badge
          variant="outline"
          className={motivoStyles[motivo] ?? motivoStyles.OTRO}
        >
          {motivo}
        </Badge>
      );
    },
  },
  {
    accessorKey: "descripcion",
    header: "Descripción",
    cell: ({ row }) => {
      const desc = row.getValue("descripcion") as string | null;
      if (!desc)
        return <span className="text-muted-foreground text-sm">—</span>;
      return (
        <span className="text-sm line-clamp-2 max-w-md" title={desc}>
          {desc}
        </span>
      );
    },
    enableSorting: false,
  },
  {
    id: "usuario",
    header: "Registró",
    cell: ({ row }) => {
      const u = unwrap(row.original.usuario_registro_rel);
      if (!u) return <span className="text-muted-foreground">—</span>;
      return (
        <span className="text-sm text-muted-foreground">
          {u.nombre} {u.apellido}
        </span>
      );
    },
    enableSorting: false,
    size: 140,
  },
];

interface BajasTableProps {
  data: BajaRow[];
}

export function BajasTable({ data }: BajasTableProps) {
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([
    { id: "created_at", desc: true },
  ]);

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

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por bien, motivo, descripción..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="pl-9"
        />
      </div>

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
                          header.getContext(),
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
                        cell.getContext(),
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
                  No se han registrado bajas.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} baja(s)
        </p>
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
            {Math.max(table.getPageCount(), 1)}
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

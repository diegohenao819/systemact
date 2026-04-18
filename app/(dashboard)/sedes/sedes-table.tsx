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
import { SedeDialog } from "./sede-dialog";

interface Sede {
  id_sede: number;
  nombre_sede: string;
  abreviatura: string | null;
  ciudad: string | null;
  direccion: string | null;
  created_at: string;
}

const columns: ColumnDef<Sede>[] = [
  {
    accessorKey: "id_sede",
    header: ({ column }) => (
      <SortableHeader column={column}>#</SortableHeader>
    ),
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm">
        {row.getValue("id_sede")}
      </span>
    ),
    size: 60,
  },
  {
    accessorKey: "nombre_sede",
    header: ({ column }) => (
      <SortableHeader column={column}>Nombre de la Sede</SortableHeader>
    ),
    cell: ({ row }) => (
      <span className="font-medium">{row.getValue("nombre_sede")}</span>
    ),
  },
  {
    accessorKey: "abreviatura",
    header: ({ column }) => (
      <SortableHeader column={column}>Abreviatura</SortableHeader>
    ),
    cell: ({ row }) => {
      const value = row.getValue("abreviatura") as string | null;
      return value ? (
        <Badge variant="outline" className="font-mono text-xs">
          {value}
        </Badge>
      ) : (
        <span className="text-muted-foreground text-sm">—</span>
      );
    },
    size: 120,
  },
  {
    accessorKey: "ciudad",
    header: ({ column }) => (
      <SortableHeader column={column}>Ciudad</SortableHeader>
    ),
    cell: ({ row }) => {
      const value = row.getValue("ciudad") as string | null;
      return (
        <span className={value ? "" : "text-muted-foreground text-sm"}>
          {value || "—"}
        </span>
      );
    },
  },
  {
    accessorKey: "direccion",
    header: ({ column }) => (
      <SortableHeader column={column}>Dirección</SortableHeader>
    ),
    cell: ({ row }) => {
      const value = row.getValue("direccion") as string | null;
      return (
        <span
          className={`text-sm ${value ? "text-muted-foreground" : "text-muted-foreground/50"}`}
        >
          {value || "—"}
        </span>
      );
    },
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <SortableHeader column={column}>Creación</SortableHeader>
    ),
    cell: ({ row }) => {
      const date = new Date(row.getValue("created_at"));
      return (
        <span className="text-sm text-muted-foreground">
          {date.toLocaleDateString("es-CO", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </span>
      );
    },
    size: 130,
  },
  {
    id: "acciones",
    header: "",
    cell: ({ row }) => <SedeDialog sede={row.original} />,
    size: 50,
    enableSorting: false,
  },
];

interface SedesTableProps {
  data: Sede[];
}

export function SedesTable({ data }: SedesTableProps) {
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
      pagination: { pageSize: 10 },
    },
  });

  return (
    <div className="space-y-4">
      {/* Buscador */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar sede..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Tabla */}
      <div className="rounded-lg border bg-card">
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
                  No se encontraron sedes.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginación */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} sede(s) en total
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

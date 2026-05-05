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
import { Search, ChevronLeft, ChevronRight, Tag } from "lucide-react";
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
import { CategoriaDialog } from "./categoria-dialog";

interface Categoria {
  id_caracteristica: number;
  codigo: string;
  descripcion: string;
  observaciones: string | null;
  created_at: string;
  bienes_count?: number;
}

const buildColumns = (canManage: boolean): ColumnDef<Categoria>[] => [
  {
    accessorKey: "codigo",
    header: ({ column }) => (
      <SortableHeader column={column}>Código</SortableHeader>
    ),
    cell: ({ row }) => (
      <Badge variant="outline" className="font-mono text-xs">
        {row.getValue("codigo")}
      </Badge>
    ),
    size: 110,
  },
  {
    accessorKey: "descripcion",
    header: ({ column }) => (
      <SortableHeader column={column}>Descripción</SortableHeader>
    ),
    cell: ({ row }) => (
      <span className="font-medium">{row.getValue("descripcion")}</span>
    ),
  },
  {
    id: "bienes_count",
    accessorFn: (row) => row.bienes_count ?? 0,
    header: ({ column }) => (
      <SortableHeader column={column}>Bienes</SortableHeader>
    ),
    cell: ({ row }) => {
      const count = row.original.bienes_count ?? 0;
      return (
        <span className="text-sm text-muted-foreground">
          {count} {count === 1 ? "bien" : "bienes"}
        </span>
      );
    },
    size: 110,
  },
  {
    accessorKey: "observaciones",
    header: "Observaciones",
    cell: ({ row }) => {
      const value = row.getValue("observaciones") as string | null;
      if (!value) return <span className="text-muted-foreground text-sm">—</span>;
      return (
        <span className="text-sm line-clamp-1 max-w-md" title={value}>
          {value}
        </span>
      );
    },
    enableSorting: false,
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <SortableHeader column={column}>Creación</SortableHeader>
    ),
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {new Date(row.getValue("created_at")).toLocaleDateString("es-CO", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })}
      </span>
    ),
    size: 130,
  },
  ...(canManage
    ? [
        {
          id: "acciones",
          header: "",
          cell: ({ row }) => <CategoriaDialog categoria={row.original} />,
          size: 50,
          enableSorting: false,
        } as ColumnDef<Categoria>,
      ]
    : []),
];

interface CategoriasTableProps {
  data: Categoria[];
  canManage?: boolean;
}

export function CategoriasTable({
  data,
  canManage = false,
}: CategoriasTableProps) {
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = buildColumns(canManage);

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
          placeholder="Buscar por código o descripción..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="pl-9"
        />
      </div>

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
                  <Tag className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                  No hay categorías registradas.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} categoría(s)
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

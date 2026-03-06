"use client";

import { useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import { toast } from "sonner";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
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
import { AreaDialog } from "./area-dialog";
import { toggleEstadoArea } from "./actions";

interface Area {
  id_area: number;
  nombre_area: string;
  estado: string;
  created_at: string;
}

function EstadoToggle({ area }: { area: Area }) {
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    const nuevoEstado = area.estado === "ACTIVO" ? "INACTIVO" : "ACTIVO";
    const result = await toggleEstadoArea(area.id_area, nuevoEstado);
    setLoading(false);

    if (result.success) {
      toast.success(`Área ${nuevoEstado === "ACTIVO" ? "activada" : "desactivada"}`);
    } else {
      toast.error(result.error ?? "Error al cambiar estado");
    }
  };

  return (
    <button onClick={handleToggle} disabled={loading} className="cursor-pointer">
      <Badge variant={area.estado === "ACTIVO" ? "default" : "secondary"}>
        {loading ? "..." : area.estado}
      </Badge>
    </button>
  );
}

const columns: ColumnDef<Area>[] = [
  {
    accessorKey: "id_area",
    header: () => <span className="text-muted-foreground">#</span>,
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm">
        {row.getValue("id_area")}
      </span>
    ),
    size: 60,
  },
  {
    accessorKey: "nombre_area",
    header: "Nombre del Área",
    cell: ({ row }) => (
      <span className="font-medium">{row.getValue("nombre_area")}</span>
    ),
  },
  {
    accessorKey: "estado",
    header: "Estado",
    cell: ({ row }) => <EstadoToggle area={row.original} />,
    size: 100,
  },
  {
    accessorKey: "created_at",
    header: "Fecha de Creación",
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
  },
  {
    id: "acciones",
    header: "",
    cell: ({ row }) => <AreaDialog area={row.original} />,
    size: 50,
  },
];

interface AreasTableProps {
  data: Area[];
}

export function AreasTable({ data }: AreasTableProps) {
  const [globalFilter, setGlobalFilter] = useState("");

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
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
          placeholder="Buscar área..."
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
                  No se encontraron áreas.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginación */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} área(s) en total
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

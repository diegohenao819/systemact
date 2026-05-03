"use client";

import { useState, useTransition } from "react";
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
import {
  Search,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  ShieldCheck,
  Shield,
  Eye,
  UserCheck,
  UserX,
  Loader2,
} from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type Rol } from "@/lib/constants";
import { cambiarRolUsuario, toggleUsuarioActivo } from "./actions";

interface Usuario {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  cedula: string | null;
  cargo: string | null;
  rol: Rol;
  id_sede: number | null;
  nombre_sede: string | null;
  area: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

const ROL_STYLES: Record<Rol, { label: string; className: string; icon: typeof ShieldCheck }> = {
  ADMINISTRADOR: {
    label: "Administrador",
    className:
      "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-800",
    icon: ShieldCheck,
  },
  ESTANDAR: {
    label: "Estándar",
    className:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    icon: Shield,
  },
  CONSULTOR: {
    label: "Consultor",
    className:
      "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700",
    icon: Eye,
  },
};

interface UsuariosTableProps {
  data: Usuario[];
  currentUserId: string;
}

export function UsuariosTable({ data, currentUserId }: UsuariosTableProps) {
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    kind: "ok" | "err";
    msg: string;
  } | null>(null);
  const [, startTransition] = useTransition();

  const handleCambiarRol = (id: string, rol: Rol) => {
    setPendingId(id);
    setFeedback(null);
    startTransition(async () => {
      const res = await cambiarRolUsuario(id, rol);
      setPendingId(null);
      if (res.success) {
        setFeedback({ kind: "ok", msg: "Rol actualizado" });
      } else {
        setFeedback({
          kind: "err",
          msg: res.error ?? "No se pudo actualizar el rol",
        });
      }
    });
  };

  const handleToggleActivo = (id: string, activo: boolean) => {
    setPendingId(id);
    setFeedback(null);
    startTransition(async () => {
      const res = await toggleUsuarioActivo(id, activo);
      setPendingId(null);
      if (res.success) {
        setFeedback({
          kind: "ok",
          msg: activo ? "Usuario activado" : "Usuario desactivado",
        });
      } else {
        setFeedback({
          kind: "err",
          msg: res.error ?? "No se pudo cambiar el estado",
        });
      }
    });
  };

  const columns: ColumnDef<Usuario>[] = [
    {
      accessorKey: "nombre",
      header: ({ column }) => (
        <SortableHeader column={column}>Nombre</SortableHeader>
      ),
      cell: ({ row }) => {
        const u = row.original;
        const isSelf = u.id === currentUserId;
        return (
          <div className="flex items-center gap-2">
            <span className="font-medium">
              {u.nombre} {u.apellido}
            </span>
            {isSelf && (
              <Badge variant="outline" className="text-xs">
                Tú
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "email",
      header: ({ column }) => (
        <SortableHeader column={column}>Email</SortableHeader>
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.email}
        </span>
      ),
    },
    {
      accessorKey: "cedula",
      header: "Cédula",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground font-mono">
          {row.original.cedula ?? "—"}
        </span>
      ),
    },
    {
      accessorKey: "nombre_sede",
      header: ({ column }) => (
        <SortableHeader column={column}>Sede</SortableHeader>
      ),
      cell: ({ row }) => (
        <span className="text-sm">{row.original.nombre_sede ?? "—"}</span>
      ),
    },
    {
      accessorKey: "rol",
      header: ({ column }) => (
        <SortableHeader column={column}>Rol</SortableHeader>
      ),
      cell: ({ row }) => {
        const style = ROL_STYLES[row.original.rol];
        const Icon = style.icon;
        return (
          <Badge variant="outline" className={style.className}>
            <Icon className="h-3 w-3 mr-1" />
            {style.label}
          </Badge>
        );
      },
    },
    {
      accessorKey: "activo",
      header: ({ column }) => (
        <SortableHeader column={column}>Estado</SortableHeader>
      ),
      cell: ({ row }) =>
        row.original.activo ? (
          <Badge
            variant="outline"
            className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
          >
            Activo
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700"
          >
            Inactivo
          </Badge>
        ),
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <SortableHeader column={column}>Registro</SortableHeader>
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {new Date(row.original.created_at).toLocaleDateString("es-CO", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </span>
      ),
      size: 130,
    },
    {
      id: "acciones",
      header: "",
      enableSorting: false,
      size: 50,
      cell: ({ row }) => {
        const u = row.original;
        const isSelf = u.id === currentUserId;
        const busy = pendingId === u.id;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MoreHorizontal className="h-4 w-4" />
                )}
                <span className="sr-only">Acciones</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>Cambiar rol</DropdownMenuLabel>
              {(Object.keys(ROL_STYLES) as Rol[]).map((rol) => {
                const Icon = ROL_STYLES[rol].icon;
                const isCurrent = u.rol === rol;
                return (
                  <DropdownMenuItem
                    key={rol}
                    disabled={isCurrent || busy}
                    onClick={() => handleCambiarRol(u.id, rol)}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {ROL_STYLES[rol].label}
                    {isCurrent && (
                      <span className="ml-auto text-xs text-muted-foreground">
                        actual
                      </span>
                    )}
                  </DropdownMenuItem>
                );
              })}
              <DropdownMenuSeparator />
              {u.activo ? (
                <DropdownMenuItem
                  disabled={isSelf || busy}
                  onClick={() => handleToggleActivo(u.id, false)}
                  className="text-destructive focus:text-destructive"
                >
                  <UserX className="h-4 w-4 mr-2" />
                  Desactivar
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  disabled={busy}
                  onClick={() => handleToggleActivo(u.id, true)}
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  Activar
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar usuario..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-9"
          />
        </div>
        {feedback && (
          <p
            className={`text-sm ${
              feedback.kind === "ok" ? "text-emerald-600" : "text-destructive"
            }`}
          >
            {feedback.msg}
          </p>
        )}
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
                <TableRow
                  key={row.id}
                  className={
                    row.original.activo ? "" : "opacity-60"
                  }
                >
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
                  No se encontraron usuarios.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} usuario(s)
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

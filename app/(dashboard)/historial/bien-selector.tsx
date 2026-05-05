"use client";

import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface BienOption {
  id_bien: number;
  codigo_generado: string;
  nombre: string;
  estado: string;
}

interface BienSelectorProps {
  bienes: BienOption[];
  seleccionado: number | null;
}

export function BienSelector({ bienes, seleccionado }: BienSelectorProps) {
  const router = useRouter();

  return (
    <div className="space-y-2 max-w-xl">
      <Label htmlFor="bien">Selecciona un bien</Label>
      <Select
        value={seleccionado ? String(seleccionado) : undefined}
        onValueChange={(value) => router.push(`/historial?bien=${value}`)}
      >
        <SelectTrigger id="bien">
          <SelectValue placeholder="Buscar por código o nombre…" />
        </SelectTrigger>
        <SelectContent>
          {bienes.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground">
              No hay bienes registrados.
            </div>
          ) : (
            bienes.map((b) => (
              <SelectItem key={b.id_bien} value={String(b.id_bien)}>
                <span className="font-mono text-xs mr-2">
                  {b.codigo_generado}
                </span>
                {b.nombre}
                {b.estado !== "ACTIVO" && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    · {b.estado}
                  </span>
                )}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
}

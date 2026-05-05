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

interface PersonaOption {
  id: string;
  nombre: string;
  apellido: string;
  cargo: string | null;
}

interface PersonaSelectorProps {
  personas: PersonaOption[];
  seleccionada: string | null;
}

export function PersonaSelector({
  personas,
  seleccionada,
}: PersonaSelectorProps) {
  const router = useRouter();

  return (
    <div className="space-y-2 max-w-md">
      <Label htmlFor="persona">Selecciona una persona</Label>
      <Select
        value={seleccionada ?? undefined}
        onValueChange={(value) => router.push(`/reportes?persona=${value}`)}
      >
        <SelectTrigger id="persona">
          <SelectValue placeholder="Selecciona una persona…" />
        </SelectTrigger>
        <SelectContent>
          {personas.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground">
              No hay personas registradas.
            </div>
          ) : (
            personas.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.nombre} {p.apellido}
                {p.cargo && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    · {p.cargo}
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

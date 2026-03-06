"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createAreaSchema, type CreateAreaInput } from "@/lib/validations/area";
import { crearArea, actualizarArea } from "./actions";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Area {
  id_area: number;
  nombre_area: string;
  estado: string;
}

interface AreaDialogProps {
  area?: Area; // Si viene, es edición. Si no, es creación.
}

export function AreaDialog({ area }: AreaDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const isEditing = !!area;

  const form = useForm<CreateAreaInput>({
    resolver: zodResolver(createAreaSchema),
    defaultValues: {
      nombre_area: area?.nombre_area ?? "",
      estado: (area?.estado as "ACTIVO" | "INACTIVO") ?? "ACTIVO",
    },
  });

  const onSubmit = async (data: CreateAreaInput) => {
    setLoading(true);

    const formData = new FormData();
    formData.set("nombre_area", data.nombre_area);
    formData.set("estado", data.estado);

    if (isEditing) {
      formData.set("id_area", String(area.id_area));
    }

    const result = isEditing
      ? await actualizarArea(formData)
      : await crearArea(formData);

    setLoading(false);

    if (result.success) {
      toast.success(isEditing ? "Área actualizada" : "Área creada");
      setOpen(false);
      form.reset();
    } else {
      toast.error(result.error ?? "Ocurrió un error");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => {
      setOpen(v);
      if (v && area) {
        form.reset({
          nombre_area: area.nombre_area,
          estado: area.estado as "ACTIVO" | "INACTIVO",
        });
      }
    }}>
      <DialogTrigger asChild>
        {isEditing ? (
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Área
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Área" : "Nueva Área"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifica los datos del área."
              : "Ingresa el nombre del área organizacional."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nombre_area">Nombre del Área</Label>
            <Input
              id="nombre_area"
              placeholder="Ej: GAF TALENTO HUMANO"
              {...form.register("nombre_area")}
            />
            {form.formState.errors.nombre_area && (
              <p className="text-sm text-destructive">
                {form.formState.errors.nombre_area.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="estado">Estado</Label>
            <Select
              value={form.watch("estado")}
              onValueChange={(val) =>
                form.setValue("estado", val as "ACTIVO" | "INACTIVO")
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVO">Activo</SelectItem>
                <SelectItem value="INACTIVO">Inactivo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading
                ? "Guardando..."
                : isEditing
                  ? "Guardar cambios"
                  : "Crear Área"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

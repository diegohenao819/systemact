"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createSedeSchema, type CreateSedeInput } from "@/lib/validations/sede";
import { crearSede, actualizarSede } from "./actions";
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

interface Sede {
  id_sede: number;
  nombre_sede: string;
  abreviatura: string | null;
  ciudad: string | null;
  direccion: string | null;
}

interface SedeDialogProps {
  sede?: Sede;
}

export function SedeDialog({ sede }: SedeDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const isEditing = !!sede;

  const form = useForm<CreateSedeInput>({
    resolver: zodResolver(createSedeSchema),
    defaultValues: {
      nombre_sede: sede?.nombre_sede ?? "",
      abreviatura: sede?.abreviatura ?? "",
      ciudad: sede?.ciudad ?? "",
      direccion: sede?.direccion ?? "",
    },
  });

  const onSubmit = async (data: CreateSedeInput) => {
    setLoading(true);

    const formData = new FormData();
    formData.set("nombre_sede", data.nombre_sede);
    formData.set("abreviatura", data.abreviatura ?? "");
    formData.set("ciudad", data.ciudad ?? "");
    formData.set("direccion", data.direccion ?? "");

    if (isEditing) {
      formData.set("id_sede", String(sede.id_sede));
    }

    const result = isEditing
      ? await actualizarSede(formData)
      : await crearSede(formData);

    setLoading(false);

    if (result.success) {
      toast.success(isEditing ? "Sede actualizada" : "Sede creada");
      setOpen(false);
      form.reset();
    } else {
      toast.error(result.error ?? "Ocurrió un error");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v && sede) {
          form.reset({
            nombre_sede: sede.nombre_sede,
            abreviatura: sede.abreviatura ?? "",
            ciudad: sede.ciudad ?? "",
            direccion: sede.direccion ?? "",
          });
        }
      }}
    >
      <DialogTrigger asChild>
        {isEditing ? (
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Sede
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Sede" : "Nueva Sede"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifica los datos de la sede."
              : "Ingresa la información de la nueva sede."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="nombre_sede">Nombre de la Sede *</Label>
              <Input
                id="nombre_sede"
                placeholder="Ej: Sede Nacional Bogotá"
                {...form.register("nombre_sede")}
              />
              {form.formState.errors.nombre_sede && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.nombre_sede.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="abreviatura">Abreviatura</Label>
              <Input
                id="abreviatura"
                placeholder="Ej: BOG"
                maxLength={10}
                {...form.register("abreviatura")}
              />
              {form.formState.errors.abreviatura && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.abreviatura.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ciudad">Ciudad</Label>
              <Input
                id="ciudad"
                placeholder="Ej: Bogotá"
                {...form.register("ciudad")}
              />
              {form.formState.errors.ciudad && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.ciudad.message}
                </p>
              )}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="direccion">Dirección</Label>
              <Input
                id="direccion"
                placeholder="Ej: Calle 100 #15-20"
                {...form.register("direccion")}
              />
              {form.formState.errors.direccion && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.direccion.message}
                </p>
              )}
            </div>
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
                  : "Crear Sede"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

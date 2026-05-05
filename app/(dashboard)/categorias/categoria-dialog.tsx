"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createCategoriaSchema,
  type CreateCategoriaInput,
} from "@/lib/validations/categoria";
import { crearCategoria, actualizarCategoria } from "./actions";
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

interface Categoria {
  id_caracteristica: number;
  codigo: string;
  descripcion: string;
  observaciones: string | null;
}

interface CategoriaDialogProps {
  categoria?: Categoria;
}

export function CategoriaDialog({ categoria }: CategoriaDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const isEditing = !!categoria;

  const form = useForm<CreateCategoriaInput>({
    resolver: zodResolver(createCategoriaSchema),
    defaultValues: {
      codigo: categoria?.codigo ?? "",
      descripcion: categoria?.descripcion ?? "",
      observaciones: categoria?.observaciones ?? "",
    },
  });

  const onSubmit = async (data: CreateCategoriaInput) => {
    setLoading(true);

    const fd = new FormData();
    fd.set("codigo", data.codigo.toUpperCase());
    fd.set("descripcion", data.descripcion);
    fd.set("observaciones", data.observaciones ?? "");
    if (isEditing) {
      fd.set("id_caracteristica", String(categoria.id_caracteristica));
    }

    const result = isEditing
      ? await actualizarCategoria(fd)
      : await crearCategoria(fd);

    setLoading(false);

    if (result.success) {
      toast.success(
        isEditing ? "Categoría actualizada" : "Categoría creada",
      );
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
        if (v && categoria) {
          form.reset({
            codigo: categoria.codigo,
            descripcion: categoria.descripcion,
            observaciones: categoria.observaciones ?? "",
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
            Nueva Categoría
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Categoría" : "Nueva Categoría"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifica los datos del tipo de bien."
              : "Define un tipo de bien con su prefijo para los códigos automáticos (ej: COMP-2026-001)."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="codigo">
              Código (prefijo) *
              <span className="text-xs font-normal text-muted-foreground ml-2">
                Mayúsculas, 2-8 caracteres
              </span>
            </Label>
            <Input
              id="codigo"
              placeholder="COMP, PORT, MOB..."
              maxLength={8}
              autoCapitalize="characters"
              className="font-mono uppercase"
              {...form.register("codigo", {
                setValueAs: (v: string) => v?.toUpperCase().trim(),
              })}
            />
            {form.formState.errors.codigo && (
              <p className="text-sm text-destructive">
                {form.formState.errors.codigo.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              El código se usa como prefijo en los códigos automáticos:{" "}
              <code className="font-mono">COMP-2026-001</code>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción *</Label>
            <Input
              id="descripcion"
              placeholder="Ej: Computador de escritorio"
              maxLength={120}
              {...form.register("descripcion")}
            />
            {form.formState.errors.descripcion && (
              <p className="text-sm text-destructive">
                {form.formState.errors.descripcion.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="observaciones">Observaciones (opcional)</Label>
            <textarea
              id="observaciones"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="Notas adicionales sobre este tipo de bien…"
              maxLength={500}
              {...form.register("observaciones")}
            />
            {form.formState.errors.observaciones && (
              <p className="text-sm text-destructive">
                {form.formState.errors.observaciones.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading
                ? "Guardando..."
                : isEditing
                  ? "Guardar cambios"
                  : "Crear categoría"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

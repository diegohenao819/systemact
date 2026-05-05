"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  createBajaSchema,
  type CreateBajaInput,
} from "@/lib/validations/baja";
import { MOTIVOS_BAJA } from "@/lib/constants";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  ArrowLeft,
  Loader2,
  PackageMinus,
  Tag,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { crearBaja } from "./actions";

interface BienOption {
  id_bien: number;
  codigo_generado: string;
  nombre: string;
  cantidad: number;
  valor_unitario: number;
  valor_total: number;
  responsable_texto: string | null;
  sedes: { nombre_sede: string } | { nombre_sede: string }[] | null;
  areas: { nombre_area: string } | { nombre_area: string }[] | null;
  profiles:
    | { nombre: string; apellido: string }
    | { nombre: string; apellido: string }[]
    | null;
}

interface BajaFormProps {
  bienes: BienOption[];
  bienInicialId: number | null;
}

function unwrap<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

const formatCOP = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(value);

export function BajaForm({ bienes, bienInicialId }: BajaFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const form = useForm<CreateBajaInput>({
    resolver: zodResolver(createBajaSchema),
    defaultValues: {
      id_bien: bienInicialId ?? 0,
      motivo: undefined,
      descripcion: "",
    },
  });

  const idBienSeleccionado = form.watch("id_bien");
  const motivoSeleccionado = form.watch("motivo");
  const descripcionActual = form.watch("descripcion");

  const bienActual = useMemo(
    () => bienes.find((b) => b.id_bien === Number(idBienSeleccionado)) ?? null,
    [bienes, idBienSeleccionado],
  );

  const sedeActual = unwrap(bienActual?.sedes)?.nombre_sede ?? null;
  const areaActual = unwrap(bienActual?.areas)?.nombre_area ?? null;
  const profile = unwrap(bienActual?.profiles);
  const responsableActual = profile
    ? `${profile.nombre} ${profile.apellido}`
    : bienActual?.responsable_texto ?? null;

  // Validación de paso 1: si los datos básicos están bien, abre el dialog.
  // El submit real se ejecuta desde el dialog tras la confirmación.
  const handlePrevalidate = form.handleSubmit(() => {
    setConfirmOpen(true);
  });

  const handleConfirmSubmit = async () => {
    const values = form.getValues();
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.set("id_bien", String(values.id_bien));
      fd.set("motivo", values.motivo);
      fd.set("descripcion", values.descripcion ?? "");

      const result = await crearBaja(fd);
      if (!result.success) {
        toast.error(result.error ?? "No se pudo registrar la baja");
        setConfirmOpen(false);
        return;
      }
      toast.success("Baja registrada");
      router.push("/bajas");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/bajas" aria-label="Volver">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-red-100 p-2 dark:bg-red-900/50">
            <PackageMinus className="h-5 w-5 text-red-600 dark:text-red-300" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Nueva baja</h1>
            <p className="text-muted-foreground text-sm">
              Retira un bien del inventario operativo
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handlePrevalidate} className="space-y-6">
        {/* ── Selector de bien ── */}
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="font-semibold text-base">Bien *</h2>
          <div className="space-y-2">
            <Label htmlFor="id_bien">Selecciona el bien a dar de baja</Label>
            <Select
              value={
                idBienSeleccionado ? String(idBienSeleccionado) : undefined
              }
              onValueChange={(v) => form.setValue("id_bien", Number(v))}
            >
              <SelectTrigger id="id_bien">
                <SelectValue placeholder="Buscar por código o nombre…" />
              </SelectTrigger>
              <SelectContent>
                {bienes.length === 0 ? (
                  <div className="p-3 text-sm text-muted-foreground">
                    No hay bienes activos disponibles.
                  </div>
                ) : (
                  bienes.map((b) => (
                    <SelectItem key={b.id_bien} value={String(b.id_bien)}>
                      <span className="font-mono text-xs mr-2">
                        {b.codigo_generado}
                      </span>
                      {b.nombre}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {form.formState.errors.id_bien && (
              <p className="text-sm text-destructive">
                {form.formState.errors.id_bien.message}
              </p>
            )}
          </div>

          {bienActual && (
            <div className="rounded-md border bg-muted/40 p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Sede
                </p>
                <p>{sedeActual ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Área
                </p>
                <p>{areaActual ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Responsable
                </p>
                <p>{responsableActual ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Cantidad
                </p>
                <p>{bienActual.cantidad}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Valor
                </p>
                <p>
                  {formatCOP(bienActual.valor_total ?? 0)}{" "}
                  <span className="text-muted-foreground">
                    ({formatCOP(bienActual.valor_unitario)} c/u)
                  </span>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Motivo ── */}
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="font-semibold text-base flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Motivo *
          </h2>
          <div className="space-y-2">
            <Label htmlFor="motivo">Tipo de baja</Label>
            <Select
              value={motivoSeleccionado}
              onValueChange={(v) =>
                form.setValue(
                  "motivo",
                  v as CreateBajaInput["motivo"],
                )
              }
            >
              <SelectTrigger id="motivo">
                <SelectValue placeholder="Selecciona un motivo…" />
              </SelectTrigger>
              <SelectContent>
                {MOTIVOS_BAJA.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.motivo && (
              <p className="text-sm text-destructive">
                {form.formState.errors.motivo.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="descripcion">
              Descripción (opcional, máx. 500 caracteres)
            </Label>
            <textarea
              id="descripcion"
              className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="Detalla circunstancias, número de acta, persona que autoriza, etc."
              maxLength={500}
              {...form.register("descripcion")}
            />
            <p className="text-xs text-muted-foreground text-right">
              {(descripcionActual ?? "").length}/500
            </p>
            {form.formState.errors.descripcion && (
              <p className="text-sm text-destructive">
                {form.formState.errors.descripcion.message}
              </p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-4 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-300 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-amber-900 dark:text-amber-200">
              Esta acción es irreversible
            </p>
            <p className="text-amber-800 dark:text-amber-300/80 mt-1">
              El bien quedará marcado como <strong>DE BAJA</strong> y ya no
              podrá transferirse ni editarse. El historial completo (incluida
              esta baja) seguirá disponible para consulta.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 justify-end">
          <Button type="button" variant="outline" asChild>
            <Link href="/bajas">Cancelar</Link>
          </Button>
          <Button
            type="submit"
            variant="destructive"
            disabled={submitting || !bienActual || !motivoSeleccionado}
          >
            <PackageMinus className="h-4 w-4 mr-2" />
            Dar de baja
          </Button>
        </div>
      </form>

      {/* ── Confirmación doble ── */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirmar baja
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3 pt-2 text-sm">
                <p>
                  Vas a dar de baja el bien{" "}
                  <span className="font-mono font-semibold">
                    {bienActual?.codigo_generado}
                  </span>{" "}
                  ({bienActual?.nombre}).
                </p>
                <div className="flex items-center gap-2">
                  <span>Motivo:</span>
                  {motivoSeleccionado && (
                    <Badge variant="outline">{motivoSeleccionado}</Badge>
                  )}
                </div>
                <p className="text-destructive font-medium">
                  Esta acción no puede deshacerse.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Registrando…
                </>
              ) : (
                <>
                  <PackageMinus className="h-4 w-4 mr-2" />
                  Confirmar baja
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

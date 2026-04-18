"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createTransferenciaSchema,
  type CreateTransferenciaInput,
} from "@/lib/validations/transferencia";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  PenLine,
  Send,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { crearTransferencia } from "./actions";

const DESCONOCIDO_SENTINEL = "__desconocido__";

interface Sede {
  id_sede: number;
  nombre_sede: string;
}

interface Area {
  id_area: number;
  nombre_area: string;
}

interface Responsable {
  id: string;
  nombre: string;
  apellido: string;
}

interface BienOption {
  id_bien: number;
  codigo_generado: string;
  nombre: string;
  id_sede: number;
  id_area: number | null;
  id_responsable: string | null;
  responsable_texto: string | null;
  sedes: { nombre_sede: string } | { nombre_sede: string }[] | null;
  areas: { nombre_area: string } | { nombre_area: string }[] | null;
  profiles:
    | { nombre: string; apellido: string }
    | { nombre: string; apellido: string }[]
    | null;
}

interface TransferenciaFormProps {
  bienes: BienOption[];
  sedes: Sede[];
  areas: Area[];
  responsables: Responsable[];
  bienInicialId: number | null;
}

function unwrap<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export function TransferenciaForm({
  bienes,
  sedes,
  areas,
  responsables,
  bienInicialId,
}: TransferenciaFormProps) {
  const [loading, setLoading] = useState(false);
  const [modoResponsable, setModoResponsable] = useState<"lista" | "texto">(
    "lista",
  );
  const router = useRouter();

  const form = useForm<CreateTransferenciaInput>({
    resolver: zodResolver(createTransferenciaSchema),
    defaultValues: {
      id_bien: bienInicialId ?? 0,
      sede_destino: 0,
      area_destino: 0,
      responsable_destino: "",
      responsable_destino_texto: "",
      motivo: "",
    },
  });

  const idBien = form.watch("id_bien");
  const sedeDestino = form.watch("sede_destino");
  const areaDestino = form.watch("area_destino");
  const responsableDestino = form.watch("responsable_destino");
  const responsableDestinoTexto = form.watch("responsable_destino_texto");

  const bienSeleccionado = useMemo(
    () => bienes.find((b) => b.id_bien === Number(idBien)),
    [bienes, idBien],
  );

  const origen = useMemo(() => {
    if (!bienSeleccionado) return null;
    const prof = unwrap(bienSeleccionado.profiles);
    return {
      sede: unwrap(bienSeleccionado.sedes)?.nombre_sede ?? "—",
      area: unwrap(bienSeleccionado.areas)?.nombre_area ?? null,
      responsableLabel: prof
        ? `${prof.nombre} ${prof.apellido}`
        : bienSeleccionado.responsable_texto,
      id_sede: bienSeleccionado.id_sede,
      id_area: bienSeleccionado.id_area,
      id_responsable: bienSeleccionado.id_responsable,
      responsable_texto: bienSeleccionado.responsable_texto,
    };
  }, [bienSeleccionado]);

  const destinoIgualAOrigen = useMemo(() => {
    if (!origen) return false;
    if (!sedeDestino || !areaDestino) return false;

    const respDestinoUuid = responsableDestino || null;
    const respDestinoTexto =
      !respDestinoUuid && responsableDestinoTexto
        ? responsableDestinoTexto
        : null;

    const respOrigenUuid = origen.id_responsable || null;
    const respOrigenTexto = respOrigenUuid ? null : origen.responsable_texto;

    return (
      Number(sedeDestino) === origen.id_sede &&
      Number(areaDestino) === (origen.id_area ?? -1) &&
      respDestinoUuid === respOrigenUuid &&
      (respDestinoTexto ?? "") === (respOrigenTexto ?? "")
    );
  }, [
    origen,
    sedeDestino,
    areaDestino,
    responsableDestino,
    responsableDestinoTexto,
  ]);

  const selectValue = useMemo(() => {
    if (responsableDestino) return responsableDestino;
    if (responsableDestinoTexto === "Desconocido") return DESCONOCIDO_SENTINEL;
    return undefined;
  }, [responsableDestino, responsableDestinoTexto]);

  const handleListSelect = (val: string) => {
    if (val === DESCONOCIDO_SENTINEL) {
      form.setValue("responsable_destino", "");
      form.setValue("responsable_destino_texto", "Desconocido");
    } else {
      form.setValue("responsable_destino", val);
      form.setValue("responsable_destino_texto", "");
    }
  };

  const toggleModoResponsable = () => {
    if (modoResponsable === "lista") {
      form.setValue("responsable_destino", "");
      // Si veníamos con "Desconocido" seleccionado, limpiamos para que el
      // usuario empiece el input vacío.
      if (responsableDestinoTexto === "Desconocido") {
        form.setValue("responsable_destino_texto", "");
      }
      setModoResponsable("texto");
    } else {
      form.setValue("responsable_destino_texto", "");
      setModoResponsable("lista");
    }
  };

  const destinoResponsableLabel = (() => {
    if (responsableDestino) {
      const r = responsables.find((rr) => rr.id === responsableDestino);
      return r ? `${r.nombre} ${r.apellido}` : null;
    }
    if (responsableDestinoTexto) return responsableDestinoTexto;
    return null;
  })();

  const onSubmit = async (data: CreateTransferenciaInput) => {
    if (destinoIgualAOrigen) {
      toast.error("El destino debe ser distinto a la ubicación actual");
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.set("id_bien", String(data.id_bien));
    formData.set("sede_destino", String(data.sede_destino));
    formData.set("area_destino", String(data.area_destino));
    formData.set("responsable_destino", data.responsable_destino ?? "");
    formData.set(
      "responsable_destino_texto",
      data.responsable_destino_texto ?? "",
    );
    formData.set("motivo", data.motivo);

    const result = await crearTransferencia(formData);

    setLoading(false);

    if (result.success) {
      toast.success("Transferencia registrada");
      router.push("/transferencias");
    } else {
      toast.error(result.error ?? "Ocurrió un error");
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/transferencias">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Nueva Transferencia
          </h1>
          <p className="text-muted-foreground text-sm">
            Registra el movimiento de un bien entre sedes, áreas o responsables.
          </p>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* ── Bien ── */}
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="font-semibold text-base">Bien a transferir</h2>

          <div className="space-y-2">
            <Label htmlFor="id_bien">Bien *</Label>
            <Select
              value={idBien ? String(idBien) : undefined}
              onValueChange={(val) => form.setValue("id_bien", Number(val))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar bien activo" />
              </SelectTrigger>
              <SelectContent>
                {bienes.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground">
                    No hay bienes activos disponibles.
                  </div>
                ) : (
                  bienes.map((b) => (
                    <SelectItem key={b.id_bien} value={String(b.id_bien)}>
                      {b.codigo_generado} — {b.nombre}
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

          {origen && (
            <div className="rounded-md border bg-muted/30 p-4">
              <div className="flex items-start gap-4 text-sm">
                <div className="flex-1">
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    Ubicación actual
                  </p>
                  <p className="mt-1 font-medium">{origen.sede}</p>
                  {origen.area && (
                    <p className="text-muted-foreground">{origen.area}</p>
                  )}
                  {origen.responsableLabel && (
                    <p className="text-muted-foreground">
                      {origen.responsableLabel}
                    </p>
                  )}
                </div>
                <ArrowRight
                  className="h-4 w-4 mt-5 text-muted-foreground"
                  aria-hidden
                />
                <div className="flex-1">
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    Nueva ubicación
                  </p>
                  <p className="mt-1">
                    {sedeDestino
                      ? sedes.find((s) => s.id_sede === Number(sedeDestino))
                          ?.nombre_sede
                      : "—"}
                  </p>
                  <p className="text-muted-foreground">
                    {areaDestino
                      ? areas.find((a) => a.id_area === Number(areaDestino))
                          ?.nombre_area
                      : "—"}
                  </p>
                  {destinoResponsableLabel && (
                    <p className="text-muted-foreground">
                      {destinoResponsableLabel}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Destino ── */}
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="font-semibold text-base">Destino</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sede_destino">Sede destino *</Label>
              <Select
                value={sedeDestino ? String(sedeDestino) : undefined}
                onValueChange={(val) =>
                  form.setValue("sede_destino", Number(val))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar sede" />
                </SelectTrigger>
                <SelectContent>
                  {sedes.map((s) => (
                    <SelectItem key={s.id_sede} value={String(s.id_sede)}>
                      {s.nombre_sede}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.sede_destino && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.sede_destino.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="area_destino">Área destino *</Label>
              <Select
                value={areaDestino ? String(areaDestino) : undefined}
                onValueChange={(val) =>
                  form.setValue("area_destino", Number(val))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar área" />
                </SelectTrigger>
                <SelectContent>
                  {areas.map((a) => (
                    <SelectItem key={a.id_area} value={String(a.id_area)}>
                      {a.nombre_area}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.area_destino && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.area_destino.message}
                </p>
              )}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <div className="flex items-center justify-between">
                <Label>Responsable destino (opcional)</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1.5 text-muted-foreground"
                  onClick={toggleModoResponsable}
                >
                  {modoResponsable === "lista" ? (
                    <>
                      <PenLine className="h-3 w-3" />
                      Escribir nombre
                    </>
                  ) : (
                    <>
                      <UserRound className="h-3 w-3" />
                      Elegir de la lista
                    </>
                  )}
                </Button>
              </div>

              {modoResponsable === "lista" ? (
                <Select value={selectValue} onValueChange={handleListSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar responsable (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={DESCONOCIDO_SENTINEL}>
                      Desconocido
                    </SelectItem>
                    {responsables.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.nombre} {r.apellido}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  placeholder="Escribir nombre del responsable"
                  {...form.register("responsable_destino_texto")}
                />
              )}

              <p className="text-xs text-muted-foreground">
                {modoResponsable === "lista"
                  ? "Selecciona un usuario del sistema, usa 'Desconocido' o cambia a escritura libre."
                  : "Escribe el nombre de la persona responsable."}
              </p>
            </div>
          </div>

          {destinoIgualAOrigen && (
            <p className="text-sm text-destructive">
              El destino es igual a la ubicación actual. Cambia sede, área o
              responsable.
            </p>
          )}
        </div>

        {/* ── Motivo ── */}
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="font-semibold text-base">Motivo *</h2>
          <textarea
            className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            placeholder="Describe la razón de la transferencia..."
            {...form.register("motivo")}
          />
          {form.formState.errors.motivo && (
            <p className="text-sm text-destructive">
              {form.formState.errors.motivo.message}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 justify-end">
          <Button type="button" variant="outline" asChild>
            <Link href="/transferencias">Cancelar</Link>
          </Button>
          <Button
            type="submit"
            disabled={loading || destinoIgualAOrigen || !origen}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Registrando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Registrar transferencia
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

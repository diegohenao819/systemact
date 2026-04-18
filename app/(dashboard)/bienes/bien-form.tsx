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
import { createClient } from "@/lib/supabase/client";
import { createBienSchema, type CreateBienInput } from "@/lib/validations/bien";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  ImagePlus,
  Loader2,
  PenLine,
  Save,
  UserRound,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { actualizarBien, crearBien } from "./actions";

const MAX_IMAGE_SIZE_MB = 5;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

interface Sede {
  id_sede: number;
  nombre_sede: string;
}

interface Area {
  id_area: number;
  nombre_area: string;
}

interface Caracteristica {
  id_caracteristica: number;
  codigo: string;
  descripcion: string;
}

interface Responsable {
  id: string;
  nombre: string;
  apellido: string;
  cedula: string | null;
}

interface BienExistente {
  id_bien: number;
  nombre: string;
  id_caracteristica: number | null;
  id_sede: number;
  id_area: number | null;
  id_responsable: string | null;
  responsable_texto: string | null;
  serial: string | null;
  placa: string | null;
  cantidad: number;
  valor_unitario: number;
  estado: string;
  observaciones: string | null;
  imagen_url: string | null;
}

interface BienFormProps {
  sedes: Sede[];
  areas: Area[];
  caracteristicas: Caracteristica[];
  responsables: Responsable[];
  bien?: BienExistente;
}

export function BienForm({
  sedes,
  areas,
  caracteristicas,
  responsables,
  bien,
}: BienFormProps) {
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagenUrl, setImagenUrl] = useState<string>(bien?.imagen_url ?? "");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const isEditing = !!bien;

  // Determinar modo inicial: si tiene responsable_texto, empieza en modo texto
  const [modoResponsable, setModoResponsable] = useState<"lista" | "texto">(
    bien?.responsable_texto ? "texto" : "lista",
  );

  const form = useForm<CreateBienInput>({
    resolver: zodResolver(createBienSchema),
    defaultValues: {
      nombre: bien?.nombre ?? "",
      id_caracteristica: bien?.id_caracteristica ?? 0,
      id_sede: bien?.id_sede ?? 0,
      id_area: bien?.id_area ?? 0,
      id_responsable: bien?.id_responsable ?? "",
      responsable_texto: bien?.responsable_texto ?? "",
      serial: bien?.serial ?? "",
      placa: bien?.placa ?? "",
      cantidad: bien?.cantidad ?? 1,
      valor_unitario: bien?.valor_unitario ?? 0,
      estado: (bien?.estado as "ACTIVO" | "INACTIVO") ?? "ACTIVO",
      observaciones: bien?.observaciones ?? "",
      imagen_url: bien?.imagen_url ?? "",
    },
  });

  const cantidad = form.watch("cantidad");
  const valorUnitario = form.watch("valor_unitario");
  const valorTotal = (cantidad || 0) * (valorUnitario || 0);

  const handleTipoChange = (val: string) => {
    const id = Number(val);
    form.setValue("id_caracteristica", id);
    const caract = caracteristicas.find((c) => c.id_caracteristica === id);
    if (caract && !form.getValues("nombre")) {
      form.setValue("nombre", caract.descripcion);
    }
  };

  const handleImageChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error("Formato no soportado. Usa JPG, PNG o WEBP.");
      e.target.value = "";
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      toast.error(`La imagen no puede superar ${MAX_IMAGE_SIZE_MB} MB.`);
      e.target.value = "";
      return;
    }

    setUploadingImage(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const nombreArchivo = `${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("bienes")
        .upload(nombreArchivo, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });

      if (uploadError) {
        toast.error("No se pudo subir la imagen");
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("bienes").getPublicUrl(nombreArchivo);

      setImagenUrl(publicUrl);
      form.setValue("imagen_url", publicUrl);
      toast.success("Imagen cargada");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveImage = () => {
    setImagenUrl("");
    form.setValue("imagen_url", "");
  };

  const toggleModoResponsable = () => {
    if (modoResponsable === "lista") {
      // Cambiar a texto: limpiar selección de lista
      form.setValue("id_responsable", "");
      setModoResponsable("texto");
    } else {
      // Cambiar a lista: limpiar texto
      form.setValue("responsable_texto", "");
      setModoResponsable("lista");
    }
  };

  const onSubmit = async (data: CreateBienInput) => {
    setLoading(true);

    const formData = new FormData();
    formData.set("nombre", data.nombre);
    formData.set("id_caracteristica", String(data.id_caracteristica));
    formData.set("id_sede", String(data.id_sede));
    formData.set("id_area", String(data.id_area));
    formData.set("id_responsable", data.id_responsable ?? "");
    formData.set("responsable_texto", data.responsable_texto ?? "");
    formData.set("serial", data.serial ?? "");
    formData.set("placa", data.placa ?? "");
    formData.set("cantidad", String(data.cantidad));
    formData.set("valor_unitario", String(data.valor_unitario));
    formData.set("estado", data.estado);
    formData.set("observaciones", data.observaciones ?? "");
    formData.set("imagen_url", imagenUrl);

    if (isEditing) {
      formData.set("id_bien", String(bien.id_bien));
    }

    const result = isEditing
      ? await actualizarBien(formData)
      : await crearBien(formData);

    setLoading(false);

    if (result.success) {
      toast.success(isEditing ? "Bien actualizado" : "Bien registrado");
      router.push("/bienes");
    } else {
      toast.error(result.error ?? "Ocurrió un error");
    }
  };

  const formatCOP = (value: number) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(value);

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header con botón volver */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/bienes">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isEditing ? "Editar Bien" : "Nuevo Bien"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {isEditing
              ? "Modifica la información del bien."
              : "Registra un nuevo activo físico en el inventario."}
          </p>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* ── Información básica ── */}
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="font-semibold text-base">Información del Bien</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="id_caracteristica">Tipo de Bien *</Label>
              <Select
                value={
                  form.watch("id_caracteristica")
                    ? String(form.watch("id_caracteristica"))
                    : undefined
                }
                onValueChange={handleTipoChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  {caracteristicas.map((c) => (
                    <SelectItem
                      key={c.id_caracteristica}
                      value={String(c.id_caracteristica)}
                    >
                      {c.codigo} — {c.descripcion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.id_caracteristica && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.id_caracteristica.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="estado">Estado *</Label>
              <Select
                value={form.watch("estado")}
                onValueChange={(val) =>
                  form.setValue("estado", val as "ACTIVO" | "INACTIVO")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVO">Activo</SelectItem>
                  <SelectItem value="INACTIVO">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="nombre">Nombre / Descripción *</Label>
              <Input
                id="nombre"
                placeholder="Ej: Portátil Dell Latitude 5520"
                {...form.register("nombre")}
              />
              {form.formState.errors.nombre && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.nombre.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="serial">Serial</Label>
              <Input
                id="serial"
                placeholder="Número de serie"
                {...form.register("serial")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="placa">Placa</Label>
              <Input
                id="placa"
                placeholder="Placa identificadora"
                {...form.register("placa")}
              />
            </div>
          </div>
        </div>

        {/* ── Ubicación y responsable ── */}
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="font-semibold text-base">Ubicación y Responsable</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="id_sede">Sede *</Label>
              <Select
                value={
                  form.watch("id_sede")
                    ? String(form.watch("id_sede"))
                    : undefined
                }
                onValueChange={(val) => form.setValue("id_sede", Number(val))}
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
              {form.formState.errors.id_sede && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.id_sede.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="id_area">Área *</Label>
              <Select
                value={
                  form.watch("id_area")
                    ? String(form.watch("id_area"))
                    : undefined
                }
                onValueChange={(val) => form.setValue("id_area", Number(val))}
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
              {form.formState.errors.id_area && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.id_area.message}
                </p>
              )}
            </div>

            {/* ── Responsable con toggle ── */}
            <div className="space-y-2 sm:col-span-2">
              <div className="flex items-center justify-between">
                <Label>Responsable</Label>
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
                <Select
                  value={form.watch("id_responsable") || undefined}
                  onValueChange={(val) => form.setValue("id_responsable", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar responsable (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
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
                  {...form.register("responsable_texto")}
                />
              )}

              <p className="text-xs text-muted-foreground">
                {modoResponsable === "lista"
                  ? "Selecciona un usuario del sistema o cambia a escritura libre."
                  : "Escribe el nombre de la persona responsable."}
              </p>
            </div>
          </div>
        </div>

        {/* ── Valoración ── */}
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="font-semibold text-base">Valoración</h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cantidad">Cantidad *</Label>
              <Input
                id="cantidad"
                type="number"
                min={1}
                {...form.register("cantidad", { valueAsNumber: true })}
              />
              {form.formState.errors.cantidad && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.cantidad.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="valor_unitario">Valor Unitario (COP) *</Label>
              <Input
                id="valor_unitario"
                type="number"
                min={0}
                step="1"
                placeholder="0"
                {...form.register("valor_unitario", { valueAsNumber: true })}
              />
              {form.formState.errors.valor_unitario && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.valor_unitario.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Valor Total</Label>
              <div className="flex items-center h-9 px-3 rounded-md border bg-muted text-sm font-semibold">
                {formatCOP(valorTotal)}
              </div>
              <p className="text-xs text-muted-foreground">
                Calculado automáticamente
              </p>
            </div>
          </div>
        </div>

        {/* ── Imagen ── */}
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <div>
            <h2 className="font-semibold text-base">Imagen</h2>
            <p className="text-xs text-muted-foreground">
              Opcional. JPG, PNG o WEBP — máx. {MAX_IMAGE_SIZE_MB} MB.
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleImageChange}
            disabled={uploadingImage}
          />

          {imagenUrl ? (
            <div className="flex items-start gap-4">
              <div className="relative h-32 w-32 overflow-hidden rounded-md border bg-muted">
                <Image
                  src={imagenUrl}
                  alt="Imagen del bien"
                  fill
                  sizes="128px"
                  className="object-cover"
                  unoptimized
                />
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                >
                  {uploadingImage ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Subiendo...
                    </>
                  ) : (
                    <>
                      <ImagePlus className="h-4 w-4 mr-2" />
                      Reemplazar
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveImage}
                  disabled={uploadingImage}
                >
                  <X className="h-4 w-4 mr-2" />
                  Quitar imagen
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImage}
            >
              {uploadingImage ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Subiendo...
                </>
              ) : (
                <>
                  <ImagePlus className="h-4 w-4 mr-2" />
                  Subir imagen
                </>
              )}
            </Button>
          )}
        </div>

        {/* ── Observaciones ── */}
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="font-semibold text-base">Observaciones</h2>
          <textarea
            className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            placeholder="Observaciones adicionales sobre el bien..."
            {...form.register("observaciones")}
          />
        </div>

        {/* ── Botones ── */}
        <div className="flex items-center gap-3 justify-end">
          <Button type="button" variant="outline" asChild>
            <Link href="/bienes">Cancelar</Link>
          </Button>
          <Button type="submit" disabled={loading || uploadingImage}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {isEditing ? "Guardar cambios" : "Registrar Bien"}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

import { Button } from "@/components/ui/button";
import {
  ArrowLeftRight,
  FileSpreadsheet,
  LogIn,
  Package,
  UserPlus,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const highlights = [
  {
    label: "Bienes",
    description: "Registro y consulta",
    icon: Package,
    color: "text-cyan-600",
  },
  {
    label: "Transferencias",
    description: "Movimientos trazables",
    icon: ArrowLeftRight,
    color: "text-rose-600",
  },
  {
    label: "Reportes",
    description: "Excel e historial",
    icon: FileSpreadsheet,
    color: "text-violet-600",
  },
];

export default function RootPage() {
  return (
    <main className="min-h-svh bg-white text-slate-950">
      <header className="mx-auto flex h-20 w-full max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/conviventia_logo_only_resolution.png"
            alt="Conviventia"
            width={44}
            height={44}
            priority
            className="h-11 w-11 object-contain"
          />
          <div className="leading-none">
            <p className="text-sm font-semibold">SYSTEMACT</p>
            <p className="mt-1 text-xs text-slate-500">Conviventia</p>
          </div>
        </Link>

        <nav className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/auth/login">Iniciar sesión</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/auth/sign-up">Registrarse</Link>
          </Button>
        </nav>
      </header>

      <section className="mx-auto flex min-h-[calc(100svh-5rem)] w-full max-w-6xl flex-col justify-center px-6 py-16">
        <div className="max-w-2xl">
          <div className="mb-8 inline-flex items-center gap-2 border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600">
            <span className="h-1.5 w-1.5 bg-amber-400" />
            Sistema interno de inventario
          </div>

          <h1 className="max-w-xl text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl">
            Sistema de inventario Conviventia
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-slate-600">
            Gestión interna de bienes, transferencias, bajas e historial para
            mantener información clara y confiable.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <Link href="/auth/login">
                <LogIn className="h-4 w-4" />
                Iniciar sesión
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/auth/sign-up">
                <UserPlus className="h-4 w-4" />
                Crear cuenta
              </Link>
            </Button>
          </div>
        </div>

        <div className="mt-20 grid max-w-3xl gap-0 border-y border-slate-200 sm:grid-cols-3">
          {highlights.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className={[
                  "flex items-center gap-4 px-0 py-5 sm:px-6",
                  index > 0 ? "border-t border-slate-200 sm:border-l sm:border-t-0" : "",
                ].join(" ")}
              >
                <Icon className={`h-5 w-5 ${item.color}`} />
                <div>
                  <p className="text-sm font-medium text-slate-950">
                    {item.label}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}

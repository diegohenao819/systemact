import { createClient } from "@/lib/supabase/server";
import { Suspense } from "react";
import { Users } from "lucide-react";
import { requireRol, ADMIN_ONLY } from "@/lib/auth/require-rol";
import { UsuariosTable } from "./usuarios-table";

async function UsuariosContent() {
  const ctx = await requireRol(ADMIN_ONLY);
  const supabase = await createClient();

  const { data: usuarios, error } = await supabase.rpc(
    "listar_usuarios_admin",
  );

  if (error) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center">
        <p className="text-destructive">
          Error al cargar los usuarios: {error.message}
        </p>
      </div>
    );
  }

  return <UsuariosTable data={usuarios ?? []} currentUserId={ctx.userId} />;
}

function UsuariosLoading() {
  return (
    <div className="space-y-4">
      <div className="h-10 w-64 bg-muted rounded animate-pulse" />
      <div className="rounded-lg border bg-card">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 p-4 border-b last:border-0"
          >
            <div className="h-4 w-32 bg-muted rounded animate-pulse" />
            <div className="h-4 w-48 bg-muted rounded animate-pulse" />
            <div className="h-6 w-24 bg-muted rounded animate-pulse" />
            <div className="h-4 w-20 bg-muted rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function UsuariosPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-purple-100 p-2 dark:bg-purple-900/50">
          <Users className="h-5 w-5 text-purple-600 dark:text-purple-300" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Usuarios</h1>
          <p className="text-muted-foreground text-sm">
            Gestión de roles y acceso al sistema
          </p>
        </div>
      </div>

      <Suspense fallback={<UsuariosLoading />}>
        <UsuariosContent />
      </Suspense>
    </div>
  );
}

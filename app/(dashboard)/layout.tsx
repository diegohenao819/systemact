import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import { Navbar } from "@/components/layout/navbar";
import type { Rol } from "@/lib/constants";
import { Suspense } from "react";

// Componente async que carga los datos del usuario
async function DashboardShell({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/auth/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("nombre, apellido, rol, id_sede, cedula")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    redirect("/auth/login");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar rol={profile.rol as Rol} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar
          nombre={profile.nombre}
          apellido={profile.apellido}
          rol={profile.rol as Rol}
          email={user.email ?? ""}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

// Loading skeleton mientras carga
function DashboardSkeleton() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="hidden md:block w-64 border-r bg-card animate-pulse" />
      <div className="flex-1 flex flex-col">
        <div className="h-16 border-b bg-card animate-pulse" />
        <div className="flex-1 p-6">
          <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardShell>{children}</DashboardShell>
    </Suspense>
  );
}

"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import type { Rol } from "@/lib/constants";

interface NavbarProps {
  nombre: string;
  apellido: string;
  rol: Rol;
  email: string;
}

const rolColors: Record<Rol, string> = {
  ADMINISTRADOR: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  ESTANDAR: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  CONSULTOR: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

export function Navbar({ nombre, apellido, rol, email }: NavbarProps) {
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  const initials = `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase();

  return (
    <header className="flex items-center justify-between h-16 px-4 md:px-6 border-b bg-card shrink-0">
      <div className="flex items-center gap-3">
        <MobileSidebar rol={rol} />
        <div className="hidden md:block">
          <h2 className="text-sm font-medium text-muted-foreground">
            Bienvenido,{" "}
            <span className="text-foreground font-semibold">
              {nombre} {apellido}
            </span>
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Badge
          variant="outline"
          className={`text-[10px] font-semibold ${rolColors[rol]}`}
        >
          {rol}
        </Badge>

        <ThemeSwitcher />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-9 w-9 rounded-full bg-primary/10"
            >
              <span className="text-xs font-bold text-primary">
                {initials}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">
                  {nombre} {apellido}
                </p>
                <p className="text-xs text-muted-foreground">{email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer" disabled>
              <User className="mr-2 h-4 w-4" />
              <span>Mi perfil</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer text-destructive focus:text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Cerrar sesión</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

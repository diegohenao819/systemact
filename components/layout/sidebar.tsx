"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Package, PanelLeftClose, PanelLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_GROUPS, type Rol } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface SidebarProps {
  rol: Rol;
}

export function Sidebar({ rol }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col border-r bg-card transition-all duration-300",
        collapsed ? "w-[68px]" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b shrink-0">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary">
          <Package className="w-5 h-5 text-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight">SYSTEMACT</span>
            <span className="text-[10px] text-muted-foreground leading-none">
              Conviventia
            </span>
          </div>
        )}
      </div>

      {/* Navegación */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {NAV_GROUPS.map((group) => {
          const visibleItems = group.items.filter((item) =>
            item.roles.includes(rol)
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.title}>
              {!collapsed && (
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
                  {group.title}
                </p>
              )}
              <div className="space-y-1">
                {visibleItems.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                        isActive
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      )}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Botón colapsar */}
      <div className="border-t p-3">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-center"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <PanelLeft className="w-4 h-4" />
          ) : (
            <>
              <PanelLeftClose className="w-4 h-4 mr-2" />
              <span className="text-xs">Colapsar</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}

import {
  Home,
  Package,
  Building2,
  LayoutGrid,
  Users,
  ArrowLeftRight,
  PackageMinus,
  History,
  BarChart3,
  Tag,
  type LucideIcon,
} from "lucide-react";

// Roles de negocio. Mantener estos literales alineados con los CHECK
// constraints y funciones RPC en la migración principal de Supabase.
export const ROLES = {
  ADMINISTRADOR: "ADMINISTRADOR",
  ESTANDAR: "ESTANDAR",
  CONSULTOR: "CONSULTOR",
} as const;

export type Rol = (typeof ROLES)[keyof typeof ROLES];

// Estados persistidos en `bienes.estado`. `DE BAJA` funciona como soft delete.
export const ESTADOS_BIEN = {
  ACTIVO: "ACTIVO",
  INACTIVO: "INACTIVO",
  DE_BAJA: "DE BAJA",
} as const;

// Motivos aceptados por el formulario y por el CHECK constraint de la BD.
export const MOTIVOS_BAJA = [
  "DAÑO IRREPARABLE",
  "OBSOLESCENCIA",
  "ROBO",
  "PERDIDA",
  "DONACION",
  "VENTA",
  "OTRO",
] as const;

// Configuración declarativa del sidebar. El layout filtra cada item según rol.
export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  roles: Rol[]; // qué roles pueden ver este item
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

const ALL_ROLES: Rol[] = [ROLES.ADMINISTRADOR, ROLES.ESTANDAR, ROLES.CONSULTOR];
const ADMIN_ONLY: Rol[] = [ROLES.ADMINISTRADOR];

export const NAV_GROUPS: NavGroup[] = [
  {
    title: "General",
    items: [
      {
        label: "Inicio",
        href: "/inicio",
        icon: Home,
        roles: ALL_ROLES,
      },
    ],
  },
  {
    title: "Inventario",
    items: [
      {
        label: "Bienes",
        href: "/bienes",
        icon: Package,
        roles: ALL_ROLES,
      },
      {
        label: "Sedes",
        href: "/sedes",
        icon: Building2,
        roles: ALL_ROLES,
      },
      {
        label: "Áreas",
        href: "/areas",
        icon: LayoutGrid,
        roles: ALL_ROLES,
      },
      {
        label: "Categorías",
        href: "/categorias",
        icon: Tag,
        roles: ALL_ROLES,
      },
    ],
  },
  {
    title: "Operaciones",
    items: [
      {
        label: "Transferencias",
        href: "/transferencias",
        icon: ArrowLeftRight,
        roles: ALL_ROLES,
      },
      {
        label: "Bajas",
        href: "/bajas",
        icon: PackageMinus,
        roles: ADMIN_ONLY,
      },
      {
        label: "Historial",
        href: "/historial",
        icon: History,
        roles: ALL_ROLES,
      },
    ],
  },
  {
    title: "Administración",
    items: [
      {
        label: "Usuarios",
        href: "/usuarios",
        icon: Users,
        roles: ADMIN_ONLY,
      },
      {
        label: "Reportes",
        href: "/reportes",
        icon: BarChart3,
        roles: ALL_ROLES,
      },
    ],
  },
];

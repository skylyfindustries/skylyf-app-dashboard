import { UserRole } from "@/types/crm";
import {
  LayoutDashboard,
  Users,
  Target,
  Briefcase,
  UserCheck,
  FileText,
  Settings,
  LucideIcon,
  ScanBarcode,
  Cog,
  Workflow,
  BarChart3,
  Building2,
  Wrench,
  Calendar as CalendarIcon,
  Activity,
  CheckSquare,
  MapPin,
  Clock,
  MessageSquare,
  SlidersHorizontal,
  Instagram,
  Package,
  ShoppingCart,
  PackageCheck,
  Receipt,
  Truck,
  Tag,
  LineChart,
  Wallet,
  HandCoins,
  Landmark,
} from "lucide-react";

export type NavGroup = "Overview" | "Production" | "Inventory" | "Purchasing" | "Sales" | "Finance" | "Admin";

export const NAV_GROUPS: NavGroup[] = ["Overview", "Production", "Inventory", "Purchasing", "Sales", "Finance", "Admin"];

export interface NavItem {
  group: NavGroup;
  title: string;
  href: string;
  icon: LucideIcon;
  roles: UserRole[];
}

export const navItems: NavItem[] = [
  {
    group: "Overview",
    title: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    roles: [
      "super_admin",
      "admin",
      "sales_executive",
      "service_manager",
      "accountant",
      "production_manager",
      "operator",
      "fitter",
      "electrician",
      "welder",
      "quality_inspector",
      "store_keeper",
    ],
  },
  {
    group: "Overview",
    title: "Monitor",
    href: "/monitor",
    icon: Activity,
    roles: [
      "super_admin",
      "admin",
      "sales_executive",
      "service_manager",
      "accountant",
      "production_manager",
    ],
  },
  {
    group: "Overview",
    title: "Analytics",
    href: "/analytics",
    icon: LineChart,
    roles: ["super_admin", "admin", "service_manager", "production_manager", "accountant", "sales_executive", "store_keeper"],
  },
  {
    group: "Production",
    title: "Machines",
    href: "/machines",
    icon: Cog,
    roles: [
      "super_admin",
      "admin",
      "service_manager",
      "sales_executive",
      "accountant",
      "production_manager",
      "operator",
      "fitter",
      "electrician",
      "welder",
      "quality_inspector",
    ],
  },
  {
    group: "Production",
    title: "Pipeline",
    href: "/pipeline",
    icon: Workflow,
    roles: [
      "super_admin",
      "admin",
      "service_manager",
      "production_manager",
      "operator",
      "fitter",
      "electrician",
      "welder",
      "quality_inspector",
    ],
  },
  {
    group: "Production",
    title: "Insights",
    href: "/insights",
    icon: BarChart3,
    roles: ["super_admin", "admin", "service_manager", "production_manager"],
  },
  {
    group: "Inventory",
    title: "Spare Parts",
    href: "/spare-parts",
    icon: Package,
    roles: [
      "super_admin",
      "admin",
      "service_manager",
      "production_manager",
      "store_keeper",
    ],
  },
  {
    group: "Sales",
    title: "Sales orders",
    href: "/sales-orders",
    icon: Receipt,
    roles: ["super_admin", "admin", "service_manager", "production_manager", "accountant", "sales_executive"],
  },
  {
    group: "Purchasing",
    title: "Purchase orders",
    href: "/purchase-orders",
    icon: ShoppingCart,
    roles: ["super_admin", "admin", "service_manager", "production_manager", "accountant", "store_keeper"],
  },
  {
    group: "Purchasing",
    title: "Material inward",
    href: "/material-inward",
    icon: PackageCheck,
    roles: ["super_admin", "admin", "service_manager", "production_manager", "accountant", "store_keeper"],
  },
  {
    group: "Sales",
    title: "Dispatch",
    href: "/dispatch",
    icon: Truck,
    roles: ["super_admin", "admin", "service_manager", "production_manager", "accountant", "sales_executive", "store_keeper"],
  },
  {
    group: "Purchasing",
    title: "Price master",
    href: "/prices",
    icon: Tag,
    roles: ["super_admin", "admin", "service_manager", "production_manager", "accountant", "store_keeper", "sales_executive"],
  },
  {
    group: "Sales",
    title: "Clients",
    href: "/clients",
    icon: Building2,
    roles: ["super_admin", "admin", "service_manager", "production_manager"],
  },
  {
    group: "Inventory",
    title: "Rack Scan & Log",
    href: "/rack-scan",
    icon: ScanBarcode,
    roles: [
      "super_admin",
      "admin",
      "service_manager",
      "production_manager",
      "operator",
      "fitter",
      "electrician",
      "welder",
      "quality_inspector",
      "store_keeper",
    ],
  },
  {
    group: "Finance",
    title: "Profit and loss",
    href: "/finance",
    icon: Landmark,
    roles: ["super_admin", "admin", "accountant"],
  },
  {
    group: "Finance",
    title: "Expenses",
    href: "/expenses",
    icon: Wallet,
    roles: ["super_admin", "admin", "accountant"],
  },
  {
    group: "Finance",
    title: "Payroll",
    href: "/payroll",
    icon: HandCoins,
    roles: ["super_admin", "admin", "accountant"],
  },
  {
    group: "Admin",
    title: "Users",
    href: "/users",
    icon: Users,
    roles: ["super_admin", "admin"],
  },
  {
    group: "Admin",
    title: "Settings",
    href: "/settings",
    icon: Settings,
    roles: ["super_admin", "admin"],
  },
];

export function getNavForRole(role: UserRole) {
  return navItems.filter((item) => item.roles.includes(role));
}

// Items for this role, keeping only groups that have something in them
export function getGroupedNav(role: UserRole) {
  const items = getNavForRole(role);
  return NAV_GROUPS.map((group) => ({ group, items: items.filter((i) => i.group === group) })).filter((g) => g.items.length);
}

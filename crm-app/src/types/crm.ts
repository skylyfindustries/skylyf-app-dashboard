export type UserRole =
  | "super_admin"
  | "admin"
  | "sales_executive"
  | "service_manager"
  | "accountant"
  | "production_manager"
  | "operator"
  | "fitter"
  | "electrician"
  | "welder"
  | "quality_inspector"
  | "store_keeper";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  department?: string;
  status: "active" | "inactive";
  lastLogin?: string;
}

export interface Lead {
  _id?: string;
  id?: string;
  name: string;
  company: string;
  source: "IndiaMART" | "TradeIndia" | "Justdial" | "Website" | "Manual";
  phone: string;
  email: string;
  requirement: string;
  status:
    | "PENDING CONTACT"
    | "1"
    | "2"
    | "3"
    | "COMPLETED"
    | "DISCUSSION"
    | "QUOTATION"
    | "VISIT SCHEDULED"
    | "VISITED"
    | "WON"
    | "DROP";
  contactTag?: "HOT" | "WARM" | "COLD";
  budget?: string;
  remarks?: string;
  interestedProducts?: string[];
  followUpDate?: string;
  visitScheduledDate?: string;
  visitActualDate?: string;
  stagePath?: string[];
  statusHistory?: Array<{
    status: string;
    timestamp: string;
    changedBy?: any;
    remarks?: string;
  }>;
  assignedTo?: string;
  indiamartQueryTime?: string;
  createdAt?: string;
}

export interface Client {
  id: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  address: string;
  businessType: string;
  gst?: string;
  services: string[];
  projectStatus: "Active" | "Completed" | "On Hold";
  paymentStatus: "Paid" | "Pending" | "Overdue";
  notes?: string;
}

export interface Service {
  id: string;
  name: string;
  category: string;
  price: number;
  assignedTo: string;
  status: "Active" | "Inactive";
  linkedClients: number;
  progress: number;
  timeline: string;
}

export interface Quotation {
  id: string;
  number: string;
  date: string;
  clientName: string;
  projectTitle: string;
  services: { name: string; price: number; quantity: number }[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  status: "Draft" | "Sent" | "Approved" | "Rejected";
  notes?: string;
}

export const roleLabels: Record<UserRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  sales_executive: "Sales Executive",
  service_manager: "Service Manager",
  accountant: "Accountant",
  production_manager: "Production Manager",
  operator: "Machine Operator",
  fitter: "Fitter / Assembler",
  electrician: "Electrician",
  welder: "Welder / Fabricator",
  quality_inspector: "Quality Inspector",
  store_keeper: "Store Keeper",
};

export const roleColors: Record<UserRole, string> = {
  super_admin: "bg-primary/10 text-primary",
  admin: "bg-secondary/10 text-secondary",
  sales_executive: "bg-success/10 text-success",
  service_manager: "bg-warning/10 text-warning",
  accountant: "bg-muted text-muted-foreground",
  production_manager: "bg-primary/10 text-primary",
  operator: "bg-success/10 text-success",
  fitter: "bg-warning/10 text-warning",
  electrician: "bg-secondary/10 text-secondary",
  welder: "bg-destructive/10 text-destructive",
  quality_inspector: "bg-primary/10 text-primary",
  store_keeper: "bg-muted text-muted-foreground",
};

// People who do the hands-on work on the shop floor; they see a "My work" dashboard.
export const FLOOR_ROLES: UserRole[] = ["operator", "fitter", "electrician", "welder", "quality_inspector"];
export const TRACKING_ROLES: UserRole[] = ["production_manager"];

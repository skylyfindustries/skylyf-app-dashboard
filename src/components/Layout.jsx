import {
  Activity,
  Boxes,
  ClipboardCheck,
  Factory,
  Layers,
  HeartPulse,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Package,
  ReceiptText,
  FileBarChart,
  Users,
  Wrench,
  ShoppingCart,
  BarChart3,
  Cog,
  Database,
  Workflow,
  ScanBarcode,
  Tag,
  Truck,
  PackageCheck,
  Landmark,
  Wallet,
  HandCoins,
  Settings,
} from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { api } from "../api/client.js";
import { logout } from "../api/client.js";
import { FeedbackHost } from "./Feedback.jsx";
import logo from "../assets/logo.webp";

// One menu for everything. Paths starting with "erp/" open the factory pages inside this same shell.
const groups = [
  [
    "Overview",
    [
      ["overview", "Overview", LayoutDashboard],
      ["erp/", "Factory dashboard", Factory],
      ["erp/monitor", "Monitor", Activity],
      ["erp/analytics", "Analytics", BarChart3],
      ["analytics", "App analytics", BarChart3],
      ["reports", "Reports", FileBarChart],
    ],
  ],
  [
    "Customers",
    [
      ["clients", "Clients", Users],
      ["erp/clients", "Factory clients", Users],
      ["technicians", "Technicians", Wrench],
      ["registrations", "Registrations", ClipboardCheck],
    ],
  ],
  [
    "Machines",
    [
      ["models", "Machine models", Factory],
      ["machines", "Client machines", Layers],
      ["catalog", "Types", Boxes],
      ["erp/machines", "Machine production", Cog],
      ["erp/pipeline", "Pipeline", Workflow],
      ["erp/insights", "Insights", BarChart3],
    ],
  ],
  [
    "Inventory",
    [
      ["parts", "Parts", Package],
      ["erp/spare-parts", "Spare parts", Package],
      ["erp/rack-scan", "Rack scan & log", ScanBarcode],
      ["erp/prices", "Price master", Tag],
    ],
  ],
  [
    "Sales",
    [
      ["orders", "App orders", ReceiptText],
      ["woocommerce/orders", "WooCommerce", ShoppingCart],
      ["erp/sales-orders", "Sales orders", ReceiptText],
      ["erp/dispatch", "Dispatch", Truck],
    ],
  ],
  [
    "Purchasing",
    [
      ["erp/purchase-orders", "Purchase orders", ShoppingCart],
      ["erp/material-inward", "Material inward", PackageCheck],
    ],
  ],
  [
    "Finance",
    [
      ["erp/finance", "Profit and loss", Landmark],
      ["erp/expenses", "Expenses", Wallet],
      ["erp/payroll", "Payroll", HandCoins],
    ],
  ],
  [
    "Admin",
    [
      ["service-requests", "Service requests", Wrench],
      ["support", "Support", LifeBuoy],
      ["system", "System", HeartPulse],
      ["activity", "User activity", Activity],
      ["database", "Database", Database],
      ["erp/users", "Factory users", Users],
      ["erp/settings", "Factory settings", Settings],
    ],
  ],
];

export default function Layout() {
  // new service requests waiting for a technician: shown as a badge, refreshed every 30 s
  const [fresh, setFresh] = useState(0);
  useEffect(() => {
    const load = () => api("/service-requests/summary").then((s) => setFresh(s.submitted ?? 0), () => {});
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);
  return (
    <>
      <nav>
        <img className="brand" src={logo} alt="Skylyf" />
        {groups.map(([title, links]) => (
          <div key={title} className="navgroup">
            <small>{title}</small>
            {links.map(([to, text, Icon]) => (
              <NavLink key={to} to={`/${to}`} end={to === "erp/"} title={text}>
                <Icon size={18} />
                <span>{text}</span>
                {to === "service-requests" && fresh > 0 && <b className="badge">{fresh}</b>}
              </NavLink>
            ))}
          </div>
        ))}
        <button className="link signout" onClick={logout}>
          <LogOut size={16} />
          <span>Sign out</span>
        </button>
      </nav>
      <main>
        <Outlet />
      </main>
      <FeedbackHost />
    </>
  );
}

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
} from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { logout } from "../api/client.js";
import { FeedbackHost } from "./Feedback.jsx";
import logo from "../assets/logo.webp";

const groups = [
  [
    "Fleet",
    [
      ["overview", "Overview", LayoutDashboard],
      ["clients", "Clients", Users],
      ["technicians", "Technicians", Wrench],
      ["models", "Machines", Factory],
      ["registrations", "Registrations", ClipboardCheck],
      ["machines", "Client machines", Layers],
      ["catalog", "Types", Boxes],
    ],
  ],
  [
    "Sales",
    [
      ["parts", "Parts", Package],
      ["orders", "App orders", ReceiptText],
      ["woocommerce/orders", "WooCommerce", ShoppingCart],
    ],
  ],
  [
    "Operations",
    [
      ["support", "Support", LifeBuoy],
      ["system", "System", HeartPulse],
      ["activity", "User activity", Activity],
      ["reports", "Reports", FileBarChart],
    ],
  ],
];

export default function Layout() {
  return (
    <>
      <nav>
        <img className="brand" src={logo} alt="Skylyf" />
        {groups.map(([title, links]) => (
          <div key={title} className="navgroup">
            <small>{title}</small>
            {links.map(([to, text, Icon]) => (
              <NavLink key={to} to={`/${to}`} title={text}>
                <Icon size={18} />
                <span>{text}</span>
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

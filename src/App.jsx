import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { setAuthLostHandler, store } from "./api/client.js";
import Layout from "./components/Layout.jsx";
import Activity from "./screens/Activity.jsx";
import ClientDetail from "./screens/ClientDetail.jsx";
import Catalog from "./screens/Catalog.jsx";
import Clients from "./screens/Clients.jsx";
import Login from "./screens/Login.jsx";
import Machines from "./screens/Machines.jsx";
import Models from "./screens/Models.jsx";
import Registrations from "./screens/Registrations.jsx";
import Orders from "./screens/Orders.jsx";
import Parts from "./screens/Parts.jsx";
import Overview from "./screens/Overview.jsx";
import Reports from "./screens/Reports.jsx";
import Support from "./screens/Support.jsx";
import System from "./screens/System.jsx";
import Technicians from "./screens/Technicians.jsx";
import WooCommerce from "./screens/WooCommerce.jsx";
import MobileAnalytics from "./screens/MobileAnalytics.jsx";

export default function App() {
  const [authed, setAuthed] = useState(!!store.get("at"));
  useEffect(() => setAuthLostHandler(() => setAuthed(false)), []);

  if (!authed) return <Login onLogin={() => setAuthed(true)} />;
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="overview" element={<Overview />} />
        <Route path="clients" element={<Clients />} />
        <Route path="clients/:id" element={<ClientDetail />} />
        <Route path="machines" element={<Machines />} />
        <Route path="technicians" element={<Technicians />} />
        <Route path="models" element={<Models />} />
        <Route path="registrations" element={<Registrations />} />
        <Route path="catalog" element={<Catalog />} />
        <Route path="parts" element={<Parts />} />
        <Route path="orders" element={<Orders />} />
        <Route path="woocommerce/orders" element={<WooCommerce />} />
        <Route path="support" element={<Support />} />
        <Route path="system" element={<System />} />
        <Route path="reports" element={<Reports />} />
        <Route path="activity" element={<Activity />} />
        <Route path="analytics" element={<MobileAnalytics />} />
        <Route path="*" element={<Navigate to="/overview" replace />} />
      </Route>
    </Routes>
  );
}

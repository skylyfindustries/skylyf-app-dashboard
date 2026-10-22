import { Activity, Bug, Clock3, MousePointerClick, ShoppingCart, Smartphone } from "lucide-react";
import { useApi } from "../api/useApi.js";
import { fmt } from "../api/format.js";
import { Async, BarChart, Stat } from "../components/ui.jsx";

const listRows = (items, value) =>
  items.map((item, index) => (
    <tr key={`${item.name}-${index}`}>
      <td><b>{item.name || "Unknown"}</b></td>
      <td className="num">{fmt(item[value])}</td>
      {item.users !== undefined && <td className="num">{fmt(item.users)}</td>}
    </tr>
  ));

export default function MobileAnalytics() {
  const state = useApi("/admin/mobile-analytics");
  return (
    <div className="analytics-page">
      <div className="row">
        <div>
          <h1>Mobile analytics</h1>
          <p className="muted">Real usage telemetry from the last 30 days.</p>
        </div>
      </div>
      <Async state={state}>
        {(d) => (
          <>
            <div className="grid analytics-stats">
              <Stat icon={Smartphone} value={fmt(d.activeUsers)} text="Active users" />
              <Stat icon={Activity} value={fmt(d.sessions)} text="Sessions" />
              <Stat icon={Clock3} value={`${d.avgSessionMinutes} min`} text="Average session" />
              <Stat icon={Bug} value={fmt(d.crashes.reduce((n, x) => n + x.count, 0))} text="Crashes" tone="stopped" />
            </div>
            <div className="card analytics-chart">
              <h2>Daily active usage</h2>
              <BarChart data={d.daily.map((x) => ({ label: x.date, value: x.users }))} />
            </div>
            <div className="analytics-grid">
              <div className="card compact-table">
                <h2>Most visited screens</h2>
                <table><thead><tr><th>Screen</th><th>Views</th><th>Users</th></tr></thead><tbody>{listRows(d.screens, "views")}</tbody></table>
              </div>
              <div className="card compact-table">
                <h2>Most used buttons</h2>
                <table><thead><tr><th>Button</th><th>Taps</th></tr></thead><tbody>{listRows(d.buttons, "taps")}</tbody></table>
              </div>
              <div className="card compact-table">
                <h2>Cart additions</h2>
                <table><thead><tr><th>Product</th><th>Added</th><th>Removed</th></tr></thead><tbody>{d.cart.map((x) => <tr key={x.name}><td><ShoppingCart size={14} /> {x.name || "Unknown"}</td><td className="num">{fmt(x.added)}</td><td className="num">{fmt(x.removed)}</td></tr>)}</tbody></table>
              </div>
              <div className="card compact-table">
                <h2>Crash reports</h2>
                <table><thead><tr><th>Error</th><th>Count</th></tr></thead><tbody>{listRows(d.crashes, "count")}</tbody></table>
              </div>
            </div>
          </>
        )}
      </Async>
    </div>
  );
}

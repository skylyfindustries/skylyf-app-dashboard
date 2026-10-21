import {
  Boxes,
  Building2,
  CalendarCheck,
  CircleAlert,
  Clock,
  Factory,
  LifeBuoy,
  Package,
  Users,
} from "lucide-react";
import { date, day, hours, label } from "./format.js";

// Every report is { cols, rows } built from existing admin endpoints — used by the Reports page and each page's Export button.
const machines = (api) => api("/admin/machines");
const eff = (m) =>
  m.todayTarget
    ? `${Math.round((m.todayProduction / m.todayTarget) * 100)}%`
    : "";

export const REPORTS = [
  {
    id: "machines",
    label: "Machine inventory",
    icon: Factory,
    desc: "Every machine with its client, type, status, output and last-seen time.",
    build: async (api) => ({
      cols: [
        "Code",
        "Client",
        "Type",
        "Model",
        "Status",
        "Speed",
        "Today",
        "Target",
        "7 days",
        "Registered",
        "Last seen",
      ],
      rows: (await machines(api)).map((m) => [
        m.code,
        m.client,
        m.typeKey,
        m.model,
        m.status,
        m.speed,
        m.todayProduction,
        m.todayTarget,
        m.weekProduction,
        day(m.createdAt),
        date(m.lastSeenAt),
      ]),
    }),
  },
  {
    id: "production",
    label: "Production",
    icon: Package,
    desc: "Today and 7-day output per machine, against target.",
    build: async (api) => ({
      cols: [
        "Machine",
        "Client",
        "Type",
        "Unit",
        "Today",
        "Target",
        "Efficiency",
        "7 days",
      ],
      rows: (await machines(api)).map((m) => [
        m.code,
        m.client,
        m.typeKey,
        m.outputUnit,
        Math.round(m.todayProduction),
        m.todayTarget,
        eff(m),
        m.weekProduction,
      ]),
    }),
  },
  {
    id: "uptime",
    label: "Running time & downtime",
    icon: Clock,
    desc: "Hours running vs down, uptime % and crash count per machine, last 7 days.",
    build: async (api) => ({
      cols: [
        "Machine",
        "Client",
        "Status",
        "Running",
        "Down",
        "Uptime %",
        "Crashes",
        "Last seen",
      ],
      rows: (await api("/admin/system")).machines.map((m) => [
        m.code,
        m.client,
        m.status,
        hours(m.runSeconds),
        hours(m.downSeconds),
        m.uptime,
        m.crashes,
        date(m.lastSeenAt),
      ]),
    }),
  },
  {
    id: "crashes",
    label: "Crash & recovery log",
    icon: CircleAlert,
    desc: "Every machine crash and recovery event, newest first.",
    build: async (api) => ({
      cols: ["When", "Event", "Machine", "Client", "Message"],
      rows: (await api("/admin/system")).events.map((e) => [
        date(e.at),
        e.kind,
        e.machine,
        e.client,
        e.message,
      ]),
    }),
  },
  {
    id: "types",
    label: "Machines by type",
    icon: Boxes,
    desc: "Machines deployed at clients, per machine type.",
    build: async (api) => {
      const [types, ms] = await Promise.all([
        api("/admin/machine-types"),
        machines(api),
      ]);
      return {
        cols: ["Type", "Key", "Deployed"],
        rows: types.map((t) => [
          t.name,
          t.key,
          ms.filter((m) => m.typeKey === t.key).length,
        ]),
      };
    },
  },
  {
    id: "clients",
    label: "Clients",
    icon: Building2,
    desc: "Client list with machines, users and production.",
    build: async (api) => ({
      cols: [
        "Client",
        "Registered",
        "Machines",
        "Running",
        "Users",
        "Today",
        "7 days",
        "Last login",
      ],
      rows: (await api("/admin/clients")).map((c) => [
        c.name,
        day(c.registeredAt),
        c.machines,
        c.running,
        c.users,
        Math.round(c.todayProduction),
        c.weekProduction,
        date(c.lastLoginAt),
      ]),
    }),
  },
  {
    id: "support",
    label: "Support tickets",
    icon: LifeBuoy,
    desc: "All support requests raised from the mobile app, with replies and status.",
    build: async (api) => ({
      cols: ["Raised", "Client", "Machine", "Request", "Reply", "Status"],
      rows: (await api("/admin/tickets")).map((t) => [
        date(t.createdAt),
        t.client,
        t.machine,
        t.note,
        t.reply,
        label(t.status),
      ]),
    }),
  },
  {
    id: "assignments",
    label: "Daily assignments",
    icon: CalendarCheck,
    desc: "Which technician was given which machine each day, and whether it is done.",
    build: async (api) => ({
      cols: ["Date", "Client", "Technician", "Machine", "Status", "Note"],
      rows: (await api("/admin/assignments")).map((a) => [
        a.date,
        a.client,
        a.technician,
        `${a.code ?? ""} ${a.machine}`.trim(),
        label(a.status),
        a.note,
      ]),
    }),
  },
  {
    id: "activity",
    label: "User activity",
    icon: Users,
    desc: "Latest 100 client actions in the mobile app.",
    build: async (api) => ({
      cols: ["When", "User", "Email", "Client", "Action", "Detail"],
      rows: (await api("/admin/activity")).map((a) => [
        date(a.at),
        a.user,
        a.email,
        a.client,
        label(a.action),
        a.detail,
      ]),
    }),
  },
];

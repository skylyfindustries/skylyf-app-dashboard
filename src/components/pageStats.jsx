import {
  Boxes, Building2, CircleCheck, CirclePause, CirclePlay, CircleX, ClipboardCheck, Clock, Eye, EyeOff, Factory, FileText, Hourglass,
  Layers, LifeBuoy, MessageSquare, OctagonX, Users, Warehouse, Wrench, Zap,
} from 'lucide-react';
import { fmt } from '../api/format.js';
import { Stat } from './ui.jsx';

// Summary cards shown at the top of each dashboard page. Each function turns the rows the page already loaded into [icon, value, label, tone] items.
// balanced rows: 4 cards = 4 across, 6 = 3x2, 8 = 4x2 (narrow screens fall back to whatever fits)
export const Stats = ({ items }) => {
  const cols = items.length <= 4 ? items.length : items.length % 3 === 0 ? 3 : 4;
  return (
    <div className="grid stats reveal" style={{ '--cols': cols }}>
      {items.map(([icon, value, text, tone]) => <Stat key={text} icon={icon} value={value} text={text} tone={tone} />)}
    </div>
  );
};

const sum = (rows, f) => rows.reduce((n, r) => n + (Number(f(r)) || 0), 0);
const within = (d, ms) => d && Date.now() - new Date(d).getTime() < ms;
const distinct = (rows, f) => new Set(rows.map(f).filter(Boolean)).size;

export const clientsStats = (list) => [
  [Users, list.length, 'Clients'],
  [Factory, sum(list, (c) => c.machines), 'Machines'],
  [CirclePlay, sum(list, (c) => c.running), 'Running', 'running'],
  [Users, sum(list, (c) => c.users), 'Users'],
  [Boxes, fmt(sum(list, (c) => c.todayProduction)), 'Produced today'],
  [Clock, list.filter((c) => within(c.lastLoginAt, 7 * 864e5)).length, 'Active this week'],
];

export const clientDetailStats = (machines, users) => [
  [Factory, machines.length, 'Machines'],
  [CirclePlay, machines.filter((m) => m.status === 'running').length, 'Running', 'running'],
  [OctagonX, machines.filter((m) => m.status === 'stopped').length, 'Stopped', 'stopped'],
  [CirclePause, machines.filter((m) => m.status === 'idle').length, 'Idle', 'idle'],
  [Users, users.length, 'Users'],
  [Boxes, fmt(sum(machines, (m) => m.todayProduction)), 'Produced today'],
];

// on shift right now (a shift that ends earlier than it starts runs overnight)
const onShift = (t) => {
  const [s, e] = [t.shift?.start, t.shift?.end].map((v) => (v ? Number(v.slice(0, 2)) * 60 + Number(v.slice(3, 5)) : null));
  if (s == null || e == null) return false;
  const now = new Date().getHours() * 60 + new Date().getMinutes();
  return s <= e ? now >= s && now < e : now >= s || now < e;
};

export const techniciansStats = (list) => [
  [Wrench, list.length, 'Technicians'],
  [Clock, list.filter(onShift).length, 'On shift now', 'running'],
  [Building2, distinct(list, (t) => t.companyId), 'Clients covered'],
  [FileText, sum(list, (t) => t.documents?.length), 'Documents on file'],
];

export const registrationsStats = (list) => [
  [Hourglass, list.filter((r) => r.status === 'pending').length, 'Pending', 'idle'],
  [CircleCheck, list.filter((r) => r.status === 'approved').length, 'Approved', 'running'],
  [CircleX, list.filter((r) => r.status === 'rejected').length, 'Rejected', 'stopped'],
  [ClipboardCheck, list.length, 'All requests'],
];

export const modelsStats = (list) => [
  [Layers, list.length, 'Models'],
  [Eye, list.filter((m) => m.active).length, 'Shown to owners', 'running'],
  [EyeOff, list.filter((m) => !m.active).length, 'Hidden', 'idle'],
  [Boxes, distinct(list, (m) => m.typeKey), 'Machine types'],
];

export const typesStats = (list) => [
  [Boxes, list.length, 'Machine types'],
];

export const supportStats = (all) => [
  [MessageSquare, all.length, 'All requests'],
  [LifeBuoy, all.filter((t) => t.status === 'open').length, 'Open', 'stopped'],
  [Hourglass, all.filter((t) => t.status === 'in_progress').length, 'In progress', 'idle'],
  [CircleCheck, all.filter((t) => t.status === 'done').length, 'Done', 'running'],
];

export const activityStats = (list) => [
  [Zap, list.length, 'Recent events'],
  [Clock, list.filter((a) => within(a.at, 864e5)).length, 'Last 24 hours'],
  [Users, distinct(list, (a) => a.email || a.user), 'People active'],
  [Building2, distinct(list, (a) => a.client), 'Clients active'],
];

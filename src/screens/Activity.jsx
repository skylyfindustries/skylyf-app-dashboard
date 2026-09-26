import { Building2, Calendar, Mail, User, Zap } from 'lucide-react';
import { date, label } from '../api/format.js';
import { useApi } from '../api/useApi.js';
import ExportMenu from '../components/ExportMenu.jsx';
import { Stats, activityStats } from '../components/pageStats.jsx';
import { Async, Ic } from '../components/ui.jsx';

export default function Activity() {
  const state = useApi('/admin/activity');
  return (
    <>
      <div className="row"><h1>User activity</h1><ExportMenu id="activity" /></div>
      <Async state={state}>{(list) => (
        <>
        <Stats items={activityStats(list)} />
        <div className="card tablewrap">
          <table>
            <thead><tr><th>When</th><th>User</th><th>Client</th><th>Action</th><th>Detail</th></tr></thead>
            <tbody>
              {list.map((a) => (
                <tr key={a.id}><td><Ic icon={Calendar}>{date(a.at)}</Ic></td><td><Ic icon={User}>{a.user}</Ic><br /><small><Ic icon={Mail}>{a.email}</Ic></small></td><td><Ic icon={Building2}>{a.client}</Ic></td><td><Ic icon={Zap}>{label(a.action)}</Ic></td><td className="wrap">{a.detail}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}</Async>
    </>
  );
}

import { Activity, Boxes, Factory, HeartPulse, LayoutDashboard, LifeBuoy, LogOut, PackageSearch, FileBarChart, Users } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { logout } from '../api/client.js';
import logo from '../assets/logo.webp';

const groups = [
  ['Fleet', [['overview', 'Overview', LayoutDashboard], ['clients', 'Clients', Users], ['machines', 'Machines', Factory], ['inventory', 'Inventory', PackageSearch], ['catalog', 'Types', Boxes]]],
  ['Operations', [['support', 'Support', LifeBuoy], ['system', 'System', HeartPulse], ['activity', 'User activity', Activity], ['reports', 'Reports', FileBarChart]]],
];

export default function Layout() {
  return (
    <>
      <nav>
        <img className="brand" src={logo} alt="Skylyf" />
        {groups.map(([title, links]) => (
          <div key={title} className="navgroup">
            <small>{title}</small>
            {links.map(([to, text, Icon]) => <NavLink key={to} to={`/${to}`} title={text}><Icon size={18} /><span>{text}</span></NavLink>)}
          </div>
        ))}
        <button className="link signout" onClick={logout}><LogOut size={16} /><span>Sign out</span></button>
      </nav>
      <main><Outlet /></main>
    </>
  );
}

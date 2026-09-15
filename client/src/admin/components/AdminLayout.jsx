import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Activity, AlertTriangle, Bell, CarFront, ChevronRight, Inbox, LogOut, Menu, Route as RouteIcon, Search, Settings, ShieldCheck, Users, X } from 'lucide-react';
import '../styles/index.css';

const links = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: Activity },
  { to: '/admin/users', label: 'User Management', icon: Users },
  { to: '/admin/rides', label: 'Ride Management', icon: CarFront },
  { to: '/admin/reports', label: 'Reports & Analytics', icon: AlertTriangle },
  { to: '/admin/routes', label: 'Route Analytics', icon: RouteIcon },
  { to: '/admin/messages', label: 'Messages', icon: Inbox },
  { to: '/admin/notifications', label: 'Notifications', icon: Bell },
  { to: '/admin/settings', label: 'Settings', icon: Settings }
];

export function AdminLayout({ user, onLogout, children }) {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');

  const search = (event) => {
    event.preventDefault();
    if (query.trim()) navigate(`/admin/users?search=${encodeURIComponent(query.trim())}`);
  };

  return (
    <div className="admin-layout admin-shell">
      <button className={sidebarOpen ? 'admin-sidebar-backdrop admin-sidebar-backdrop-open' : 'admin-sidebar-backdrop'} type="button" aria-label="Close admin navigation" onClick={() => setSidebarOpen(false)} />
      <aside className={sidebarOpen ? 'admin-sidebar admin-sidebar-open' : 'admin-sidebar'}>
        <div className="brand">
          <span className="logo-mark">CC</span>
          <span>Campus <b>Commute</b></span>
        </div>

        <div className="admin-badge">
          <ShieldCheck size={15} />
          Admin control centre
        </div>

        <button className="admin-sidebar-close" type="button" aria-label="Close admin navigation" onClick={() => setSidebarOpen(false)}><X size={18} /></button>

        <p className="nav-label">MONITORING</p>

        <nav>
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
              onClick={() => setSidebarOpen(false)}
            >
              <Icon size={19} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar-promise"><ShieldCheck size={18} /><b>Safe rides.<br />Stronger campus.</b><small>Monitoring · supporting · building a better commute</small></div>

        <div className="sidebar-bottom">
          <div className="mini-profile">
            <div className="avatar">{user?.name?.slice(0, 2).toUpperCase() || 'AD'}</div>
            <div>
              <b>{user?.name || 'Admin'}</b>
              <small>Platform administrator</small>
            </div>
            <button onClick={() => { onLogout(); navigate('/admin/login'); }} title="Log out">
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>

      <main className="admin-main">
        <div className="admin-topbar">
          <button className="admin-menu-button" type="button" aria-label="Open admin navigation" onClick={() => setSidebarOpen(true)}><Menu size={19} /></button>
          <form className="admin-search" onSubmit={search}><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search users, rides, routes..." aria-label="Search users, rides, routes" /></form>
          <div className="admin-topbar-profile"><div className="avatar small">{user?.name?.slice(0, 2).toUpperCase() || 'AD'}</div><span><b>{user?.name || 'Admin'}</b><small>Administrator</small></span></div>
        </div>
        {children}
      </main>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, ArrowUpRight, CarFront, CheckCircle2, MapPin, RefreshCw, Route as RouteIcon, Star, Users } from 'lucide-react';

const ranges = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '3m', label: 'Last 3 months' },
  { value: '1y', label: 'Last year' }
];

const statusColors = {
  ACTIVE: '#1d9b75',
  FULL: '#3f78d4',
  COMPLETED: '#8a62d6',
  CANCELLED: '#db6b5d',
  EXPIRED: '#9a9aa8'
};

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' }) : 'Unknown date';
}

function EmptyChart({ message = 'Not enough data for this chart.' }) {
  return <div className="admin-chart-empty"><Activity size={20} /><span>{message}</span></div>;
}

function Metric({ icon: Icon, label, value, tone, detail }) {
  return <article className={`admin-metric admin-metric-${tone}`}>
    <div className="admin-metric-icon"><Icon size={19} /></div>
    <span>{label}</span>
    <strong>{value}</strong>
    <small>{detail}</small>
  </article>;
}

export function AdminDashboard({ request, user }) {
  const [range, setRange] = useState('7d');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    request(`/admin/analytics?range=${range}`)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [range]);

  const metrics = data?.metrics;
  return <div className="admin-dashboard-page">
    <header className="admin-header admin-dashboard-header">
      <div>
        <p className="eyebrow">PLATFORM OVERVIEW</p>
        <h1>Welcome, <em>{user?.name?.split(' ')[0] || 'Admin'}.</em></h1>
        <p className="muted">Here&apos;s what&apos;s happening with Campus Commute today.</p>
      </div>
      <div className="admin-header-actions">
        <button className="soft-button" type="button" onClick={load} disabled={loading}><RefreshCw size={15} /> Refresh</button>
        <select aria-label="Analytics time range" value={range} onChange={(event) => setRange(event.target.value)}>
          {ranges.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}
        </select>
      </div>
    </header>

    {error && <div className="error-box">{error}</div>}
    {loading && !data ? <div className="admin-loading admin-dashboard-loading">Loading live dashboard data...</div> : <>
      <section className="admin-metrics admin-dashboard-grid">
        <Metric icon={Users} label="Total registered users" value={metrics?.users ?? 0} tone="green" detail="From MongoDB users" />
        <Metric icon={CarFront} label="Active rides" value={metrics?.activeRides ?? 0} tone="blue" detail="Active or full rides" />
        <Metric icon={CheckCircle2} label="Completed rides" value={metrics?.completedRides ?? 0} tone="purple" detail="Completed in the platform" />
        <Metric icon={Star} label="Average rating" value={metrics?.averageRating == null ? 'No data' : `${metrics.averageRating}/5`} tone="yellow" detail={`${metrics?.ratingsCount ?? 0} ratings recorded`} />
      </section>

      <section className="admin-dashboard-grid-layout">
        <article className="admin-panel admin-chart-panel">
          <div className="admin-panel-head"><div><p className="eyebrow">RIDE ACTIVITY OVERVIEW</p><h2>Created and joined rides</h2></div><span className="admin-data-label">LIVE DATA</span></div>
          {data?.rideActivity?.some((item) => item.createdRides || item.joinedRides) ? <ResponsiveContainer width="100%" height={250}><AreaChart data={data.rideActivity}><defs><linearGradient id="createdFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#1d9b75" stopOpacity={0.22} /><stop offset="95%" stopColor="#1d9b75" stopOpacity={0} /></linearGradient><linearGradient id="joinedFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3f78d4" stopOpacity={0.18} /><stop offset="95%" stopColor="#3f78d4" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="#edf0f4" vertical={false} /><XAxis dataKey="date" tickFormatter={(value) => value.slice(5)} tickLine={false} axisLine={false} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} /><Tooltip /><Area type="monotone" dataKey="createdRides" name="Created rides" stroke="#1d9b75" fill="url(#createdFill)" strokeWidth={2} /><Area type="monotone" dataKey="joinedRides" name="Joined rides" stroke="#3f78d4" fill="url(#joinedFill)" strokeWidth={2} /></AreaChart></ResponsiveContainer> : <EmptyChart />}
        </article>

        <article className="admin-panel admin-chart-panel">
          <div className="admin-panel-head"><div><p className="eyebrow">RIDE STATUS</p><h2>Current distribution</h2></div></div>
          {data?.rideStatuses?.length ? <ResponsiveContainer width="100%" height={250}><PieChart><Pie data={data.rideStatuses} dataKey="value" nameKey="status" innerRadius={62} outerRadius={88} paddingAngle={3}>{data.rideStatuses.map((item) => <Cell key={item.status} fill={statusColors[item.status] || '#a5a8b5'} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer> : <EmptyChart message="No ride status data available yet." />}
          <div className="admin-legend">{data?.rideStatuses?.map((item) => <span key={item.status}><i style={{ background: statusColors[item.status] || '#a5a8b5' }} />{item.status} <b>{item.value}</b></span>)}</div>
        </article>
      </section>

      <section className="admin-dashboard-grid-layout">
        <article className="admin-panel admin-chart-panel">
          <div className="admin-panel-head"><div><p className="eyebrow">USER GROWTH</p><h2>Registered users over time</h2></div></div>
          {data?.userGrowth?.some((item) => item.newUsers) ? <ResponsiveContainer width="100%" height={220}><BarChart data={data.userGrowth}><CartesianGrid stroke="#edf0f4" vertical={false} /><XAxis dataKey="date" tickFormatter={(value) => value.slice(5)} tickLine={false} axisLine={false} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} /><Tooltip /><Bar dataKey="newUsers" name="New users" fill="#8a62d6" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer> : <EmptyChart message="No new users in this period." />}
        </article>

        <article className="admin-panel">
          <div className="admin-panel-head"><div><p className="eyebrow">POPULAR ROUTES</p><h2>Most used routes</h2></div><Link className="admin-inline-link" to="/admin/routes">View all <ArrowUpRight size={14} /></Link></div>
          {data?.popularRoutes?.length ? <div className="admin-route-list">{data.popularRoutes.slice(0, 5).map((route) => <div className="admin-route-row" key={`${route.source}-${route.destination}`}><MapPin size={16} /><span><b>{route.source} <em>to</em> {route.destination}</b><small>{route.passengers} accepted passengers</small></span><strong>{route.rides} rides</strong></div>)}</div> : <div className="admin-chart-empty"><RouteIcon size={20} /><span>No ride routes available yet.</span></div>}
        </article>
      </section>

      <section className="admin-dashboard-grid-layout admin-dashboard-lower-grid">
        <article className="admin-panel admin-table-panel"><div className="admin-panel-head"><div><p className="eyebrow">RECENT RIDE REQUESTS</p><h2>Latest rides</h2></div><Link className="admin-inline-link" to="/admin/rides">View all <ArrowUpRight size={14} /></Link></div>{data?.recentRides?.length ? <div className="admin-data-table"><div className="admin-data-table-head"><span>From to destination</span><span>Date</span><span>Seats</span><span>Status</span></div>{data.recentRides.map((ride) => <div className="admin-data-row" key={ride._id}><span><b>{ride.source}</b><small>{ride.destination}</small></span><span>{formatDate(ride.date)}</span><span>{ride.currentPassengers}/{ride.maxPassengers}</span><span className="admin-status-pill">{ride.status}</span></div>)}</div> : <div className="admin-chart-empty">No ride data available yet.</div>}</article>
        <article className="admin-panel admin-table-panel"><div className="admin-panel-head"><div><p className="eyebrow">RECENT USERS</p><h2>New community members</h2></div><Link className="admin-inline-link" to="/admin/users">View all <ArrowUpRight size={14} /></Link></div>{data?.recentUsers?.length ? <div className="admin-user-list">{data.recentUsers.slice(0, 5).map((item) => <div className="admin-user-row" key={item._id}><div className="avatar small">{(item.name || 'U').slice(0, 2).toUpperCase()}</div><span><b>{item.name}</b><small>{item.email}</small></span><em>{item.role}</em></div>)}</div> : <div className="admin-chart-empty">No users available yet.</div>}</article>
      </section>

      <section className="admin-panel admin-location-panel"><div className="admin-panel-head"><div><p className="eyebrow">RIDE LOCATION MAP</p><h2>Active ride locations</h2></div><span className="admin-data-label">{data?.activeRideLocations?.length || 0} WITH COORDINATES</span></div>{data?.activeRideLocations?.length ? <div className="admin-location-list">{data.activeRideLocations.map((ride) => <div className="admin-location-row" key={ride._id}><MapPin size={16} /><span><b>{ride.source} to {ride.destination}</b><small>{ride.status} ride with stored GeoJSON coordinates</small></span></div>)}</div> : <div className="admin-map-empty"><MapPin size={24} /><b>No mapped active rides yet.</b><span>Active rides need stored source and destination coordinates before they can be plotted.</span></div>}</section>
    </>}
  </div>;
}

import React, { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import '../styles/index.css';

export function AdminLoginPage({ request, user, onLogin }) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user && user.role === 'ADMIN') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');

    try {
      const data = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify(form)
      });

      if (data.user?.role !== 'ADMIN') {
        setError('This account is not authorized for the Campus Commute admin panel.');
        return;
      }

      localStorage.setItem('campus-token', data.token);
      onLogin(data.user);
    } catch (err) {
      setError(err.message || 'Unable to sign in to the admin panel.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="admin-login-shell">
      <div className="admin-login-container">
        <div className="admin-login-visual">
          <div className="brand light">
            <span className="logo-mark">CC</span>
            <span>Campus <b>Commute</b></span>
          </div>

          <div className="auth-message">
            <p className="eyebrow">SECURE ADMIN ACCESS</p>
            <h1>Platform <em>oversight.</em></h1>
            <p>Review student activity, rides, reports, and community health from a dedicated admin workspace.</p>
          </div>
        </div>

        <div className="admin-login-panel">
          <div className="admin-login-card">
            <div className="admin-login-title">
              <p className="eyebrow">ADMIN LOGIN</p>
              <h2>Authorize access.</h2>
              <p>Use the platform administrator account to continue.</p>
            </div>

            <form className="admin-login-form" onSubmit={submit}>
              <label>
                Admin email
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                  placeholder="admin@college.edu"
                  required
                />
              </label>

              <label>
                Password
                <input
                  type="password"
                  value={form.password}
                  onChange={(event) => setForm({ ...form, password: event.target.value })}
                  placeholder="Enter password"
                  required
                />
              </label>

              {error && <div className="admin-login-error">{error}</div>}

              <button className="admin-login-button" type="submit" disabled={busy}>
                <ShieldCheck size={16} />
                {busy ? 'Signing in...' : 'Access admin panel'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}

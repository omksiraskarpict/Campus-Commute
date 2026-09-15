import React, { useEffect, useState } from 'react';
import {
  Navigate,
  Route,
  Routes,
  useSearchParams
} from 'react-router-dom';

import {
  Activity,
  AlertTriangle,
  Bell,
  CalendarDays,
  CarFront,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Database,
  MapPin,
  Search,
  ShieldCheck,
  Users,
  X
} from 'lucide-react';

import '../styles/index.css';

import { AdminLayout } from '../components/AdminLayout.jsx';
import { AdminRoute } from '../components/AdminRoute.jsx';
import { AdminLoginPage } from '../pages/AdminLoginPage.jsx';
import { AdminDashboard } from '../pages/AdminDashboard.jsx';


/* =========================================================
   COMMON HELPERS
========================================================= */

function statsLabel(value) {
  return String(value ?? 0);
}

function formatValue(value, fallback = 'Not available') {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return fallback;
  }

  return value;
}

function formatDate(value, fallback = 'Not available') {
  if (!value) return fallback;

  try {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return fallback;
    }

    return date.toLocaleDateString();
  } catch {
    return fallback;
  }
}

function formatDateTime(value, fallback = 'Not available') {
  if (!value) return fallback;

  try {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return fallback;
    }

    return date.toLocaleString();
  } catch {
    return fallback;
  }
}


/* =========================================================
   REUSABLE ADMIN MODAL
========================================================= */

function AdminModal({
  title,
  eyebrow,
  onClose,
  children,
  className = '',
  footer = (
    <button
      className="soft-button"
      type="button"
      onClick={onClose}
    >
      Close
    </button>
  )
}) {
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  return (
    <div
      className="admin-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className={`admin-modal ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-modal-title"
        onMouseDown={(event) => {
          event.stopPropagation();
        }}
      >
        <header className="admin-modal-header">
          <div>
            {eyebrow && (
              <p className="eyebrow">
                {eyebrow}
              </p>
            )}

            <h2 id="admin-modal-title">
              {title}
            </h2>
          </div>

          <button
            className="admin-modal-close"
            type="button"
            aria-label="Close"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </header>

        <div className="admin-modal-body">
          {children}
        </div>

        <footer className="admin-modal-footer">
          {footer}
        </footer>
      </section>
    </div>
  );
}


/* =========================================================
   ADMIN OVERVIEW
========================================================= */

function AdminOverviewPage({ request, user }) {
  const [metrics, setMetrics] = useState(null);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      request('/admin/overview'),
      request('/admin/users')
    ])
      .then(([overview, list]) => {
        setMetrics(overview.metrics);
        setUsers(list.users || []);
      })
      .catch((err) => {
        setError(err.message || 'Unable to load dashboard data.');
      });
  }, [request]);

  const cards = metrics
    ? [
        ['Registered students', metrics.users, Users],
        ['Verified community', metrics.verified, ShieldCheck],
        ['Active rides', metrics.active, Activity],
        ['Completed rides', metrics.completed, CarFront],
        ['Pending verification', metrics.pending, AlertTriangle],
        ['Cancelled rides', metrics.cancelled, CalendarDays]
      ]
    : [];

  return (
    <>
      <header className="admin-header">
        <div>
          <p className="eyebrow">
            LIVE PLATFORM MONITOR
          </p>

          <h1>
            Good morning,{' '}
            <em>
              {user?.name?.split(' ')[0] || 'Admin'}.
            </em>
          </h1>

          <p className="muted">
            A clear view of how Campus Commute is moving today.
          </p>
        </div>

        <div className="admin-status">
          <span></span>
          All systems operational
        </div>
      </header>

      {error && (
        <div className="error-box">
          {error}
        </div>
      )}

      <section className="admin-metrics admin-dashboard-grid">
        {cards.length ? (
          cards.map(([label, value, Icon]) => (
            <div
              className="admin-metric"
              key={label}
            >
              <div className="admin-metric-icon">
                <Icon size={19} />
              </div>

              <span>
                {label}
              </span>

              <strong>
                {statsLabel(value)}
              </strong>

              <small>
                {label === 'Pending verification'
                  ? 'Needs review'
                  : 'Across the platform'}
              </small>
            </div>
          ))
        ) : (
          <div className="admin-loading">
            Loading live platform metrics...
          </div>
        )}
      </section>

      <section className="admin-grid">
        <div className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <p className="eyebrow">
                RECENT ACTIVITY
              </p>

              <h2>
                Latest students
              </h2>
            </div>

            <button
              className="link-button"
              type="button"
            >
              View all
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="activity-list">
            {users.slice(0, 5).map((item) => (
              <div
                className="activity-item"
                key={item._id}
              >
                <div className="avatar small">
                  {(item.name || 'AD')
                    .slice(0, 2)
                    .toUpperCase()}
                </div>

                <div>
                  <b>
                    {item.name}
                  </b>

                  <small>
                    {item.email}
                  </small>
                </div>

                <span
                  className={
                    item.verificationStatus === 'VERIFIED'
                      ? 'status verified-status'
                      : 'status pending-status'
                  }
                >
                  {item.verificationStatus || 'PENDING'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <p className="eyebrow">
                SYSTEM STATUS
              </p>

              <h2>
                Operational snapshot
              </h2>
            </div>
          </div>

          <div className="status-list">
            <div>
              <CheckCircle2 size={16} />
              Authentication secure
            </div>

            <div>
              <ShieldCheck size={16} />
              Admin JWT verification active
            </div>

            <div>
              <Database size={16} />
              MongoDB connected and trusted
            </div>

            <div>
              <CarFront size={16} />
              Ride operations protected
            </div>
          </div>
        </div>
      </section>
    </>
  );
}


/* =========================================================
   ADMIN USERS
========================================================= */

function AdminUsersPage({ request }) {
  const [students, setStudents] = useState([]);
  const [searchParams] = useSearchParams();

  const [query, setQuery] = useState(
    () => searchParams.get('search') || ''
  );

  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const [selectedStudentId, setSelectedStudentId] =
    useState(null);

  const [selectedStudent, setSelectedStudent] =
    useState(null);

  const [studentLoading, setStudentLoading] =
    useState(false);

  const [studentError, setStudentError] =
    useState('');

  const [busyId, setBusyId] =
    useState('');

  /* -----------------------------
     Load students
  ----------------------------- */

  const load = async () => {
    setLoading(true);
    setError('');

    try {
      const data = await request(
        '/admin/students?limit=100'
      );

      setStudents(data.students || []);
    } catch (err) {
      setError(
        err.message || 'Unable to load students.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [request]);

  /* -----------------------------
     Search
  ----------------------------- */

  const filtered = students.filter((student) => {
    const haystack = `
      ${student.name || ''}
      ${student.email || ''}
    `.toLowerCase();

    return haystack.includes(
      query.toLowerCase()
    );
  });

  /* -----------------------------
     Open student details
  ----------------------------- */

  const openStudentDetails = async (studentId) => {
    setSelectedStudentId(studentId);
    setSelectedStudent(null);
    setStudentError('');
    setStudentLoading(true);

    try {
      const data = await request(
        `/admin/students/${studentId}`
      );

      setSelectedStudent(
        data.student
      );
    } catch (err) {
      setStudentError(
        err.message ||
          'Unable to load student details.'
      );
    } finally {
      setStudentLoading(false);
    }
  };

  /* -----------------------------
     Close student modal
  ----------------------------- */

  const closeStudentDetails = () => {
    setSelectedStudentId(null);
    setSelectedStudent(null);
    setStudentError('');
  };

  /* -----------------------------
     Suspend / Reactivate
  ----------------------------- */

  const updateStatus = async (
    studentId,
    field,
    value,
    message
  ) => {
    setBusyId(studentId);
    setError('');

    try {
      const data = await request(
        `/admin/students/${studentId}/${field}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            accountStatus: value
          })
        }
      );

      setNotice(message);

      setStudents((current) =>
        current.map((student) =>
          student._id === data.student._id
            ? data.student
            : student
        )
      );

      setSelectedStudent((current) =>
        current?._id === data.student._id
          ? data.student
          : current
      );
    } catch (err) {
      setError(
        err.message ||
          'Unable to update account status.'
      );
    } finally {
      setBusyId('');
    }
  };

  /* -----------------------------
     Verify student
  ----------------------------- */

  const verifyStudent = async () => {
    if (!selectedStudent?._id) {
      return;
    }

    setBusyId(selectedStudent._id);
    setError('');

    try {
      const data = await request(
        `/admin/students/${selectedStudent._id}/verify`,
        {
          method: 'PATCH'
        }
      );

      setSelectedStudent(
        data.student
      );

      setStudents((current) =>
        current.map((student) =>
          student._id === data.student._id
            ? data.student
            : student
        )
      );

      setNotice(
        data.message ||
          'Student verified successfully.'
      );
    } catch (err) {
      setError(
        err.message ||
          'Failed to verify student.'
      );
    } finally {
      setBusyId('');
    }
  };

  return (
    <>
      <header className="admin-header">
        <div>
          <p className="eyebrow">
            PEOPLE DIRECTORY
          </p>

          <h1>
            Manage <em>students.</em>
          </h1>

          <p className="muted">
            Review accounts, verification,
            and community access.
          </p>
        </div>

        <div className="admin-status">
          <span></span>
          Admin only
        </div>
      </header>

      {notice && (
        <div className="success-box">
          {notice}
        </div>
      )}

      {error && (
        <div className="error-box">
          {error}
        </div>
      )}

      <section className="student-toolbar admin-users-toolbar">
        <div className="student-search">
          <Search size={18} />

          <input
            value={query}
            onChange={(event) =>
              setQuery(event.target.value)
            }
            placeholder="Search by name or email"
          />
        </div>

        <button
          className="soft-button"
          type="button"
          onClick={load}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </section>

      <section className="admin-panel students-panel admin-users-panel">
        <div className="admin-panel-head">
          <div>
            <p className="eyebrow">
              {filtered.length} RESULTS
            </p>

            <h2>
              Student accounts
            </h2>
          </div>
        </div>

        {loading ? (
          <div className="admin-loading">
            Loading students...
          </div>
        ) : (
          <div className="students-table">
            <div className="student-table-head">
              <span>Student</span>
              <span>Verification</span>
              <span>Account</span>
              <span>Role</span>
              <span>Actions</span>
            </div>

            {filtered.length ? (
              filtered.map((student) => (
                <div
                  className="student-row"
                  key={student._id}
                >
                  {/* ONLY NAME IN TABLE */}
                  <div className="student-identity">
                    <div className="avatar small">
                      {(student.name || 'ST')
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>

                    <button
                      className="student-name-button"
                      type="button"
                      onClick={() =>
                        openStudentDetails(
                          student._id
                        )
                      }
                    >
                      {student.name || 'Unknown student'}
                    </button>
                  </div>

                  <span
                    className={
                      student.verificationStatus ===
                      'VERIFIED'
                        ? 'status verified-status'
                        : 'status pending-status'
                    }
                  >
                    {student.verificationStatus ||
                      'PENDING'}
                  </span>

                  <span
                    className={
                      student.accountStatus ===
                      'ACTIVE'
                        ? 'status verified-status'
                        : 'status pending-status'
                    }
                  >
                    {student.accountStatus ||
                      'ACTIVE'}
                  </span>

                  <span className="role-label">
                    {student.role ||
                      'STUDENT'}
                  </span>

                  <div className="row-actions">
                    {student.accountStatus !==
                    'SUSPENDED' ? (
                      <button
                        className="soft-button"
                        type="button"
                        disabled={
                          busyId === student._id
                        }
                        onClick={() =>
                          updateStatus(
                            student._id,
                            'status',
                            'SUSPENDED',
                            'Student suspended successfully.'
                          )
                        }
                      >
                        {busyId === student._id
                          ? 'Saving...'
                          : 'Suspend'}
                      </button>
                    ) : (
                      <button
                        className="soft-button"
                        type="button"
                        disabled={
                          busyId === student._id
                        }
                        onClick={() =>
                          updateStatus(
                            student._id,
                            'status',
                            'ACTIVE',
                            'Student reactivated successfully.'
                          )
                        }
                      >
                        {busyId === student._id
                          ? 'Saving...'
                          : 'Reactivate'}
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-admin">
                No students found.
              </div>
            )}
          </div>
        )}
      </section>

      {/* =====================================================
          STUDENT DETAILS MODAL
      ===================================================== */}

      {selectedStudentId && (
        <AdminModal
          title={
            selectedStudent?.name ||
            'Student details'
          }
          eyebrow="STUDENT PROFILE"
          onClose={closeStudentDetails}
          className="student-modal"
        >
          {studentLoading ? (
            <div className="admin-loading">
              Loading student details...
            </div>
          ) : studentError ? (
            <div className="error-box">
              {studentError}
            </div>
          ) : selectedStudent ? (
            <>
              <div className="student-modal-profile">
                <div className="student-modal-avatar">
                  {(selectedStudent.name || 'ST')
                    .slice(0, 2)
                    .toUpperCase()}
                </div>

                <div>
                  <h3>
                    {selectedStudent.name}
                  </h3>

                  <span
                    className={
                      selectedStudent.verificationStatus ===
                      'VERIFIED'
                        ? 'status verified-status'
                        : 'status pending-status'
                    }
                  >
                    {selectedStudent.verificationStatus ||
                      'PENDING'}
                  </span>
                </div>
              </div>

              <div className="student-detail-grid">
                {[
                  [
                    'Full name',
                    selectedStudent.name
                  ],
                  [
                    'College email',
                    selectedStudent.email
                  ],
                  [
                    'Phone number',
                    selectedStudent.phone
                  ],
                  [
                    'College',
                    selectedStudent.college
                  ],
                  [
                    'Department',
                    selectedStudent.department
                  ],
                  [
                    'Year',
                    selectedStudent.year
                  ],
                  [
                    'Role',
                    selectedStudent.role
                  ],
                  [
                    'Verification',
                    selectedStudent.verificationStatus
                  ],
                  [
                    'Account status',
                    selectedStudent.accountStatus
                  ],
                  [
                    'Rating',
                    selectedStudent.rating
                  ],
                  [
                    'Completed rides',
                    selectedStudent.completedRides
                  ],
                  [
                    'Response rate',
                    selectedStudent.responseRate == null
                      ? null
                      : `${selectedStudent.responseRate}%`
                  ],
                  [
                    'Member since',
                    formatDate(
                      selectedStudent.createdAt
                    )
                  ]
                ].map(([label, value]) => (
                  <div key={label}>
                    <small>
                      {label}
                    </small>

                    <b>
                      {formatValue(value)}
                    </b>
                  </div>
                ))}
              </div>

              <div className="student-actions">
                {selectedStudent.verificationStatus ===
                'PENDING' ? (
                  <button
                    className="primary-button"
                    type="button"
                    disabled={
                      busyId ===
                      selectedStudent._id
                    }
                    onClick={verifyStudent}
                  >
                    {busyId ===
                    selectedStudent._id
                      ? 'Saving...'
                      : 'Verify Student'}
                  </button>
                ) : (
                  <span className="status verified-status">
                    Verified
                  </span>
                )}

                {selectedStudent.role !==
                  'ADMIN' && (
                  <button
                    className="soft-button"
                    type="button"
                    disabled={
                      busyId ===
                      selectedStudent._id
                    }
                    onClick={() =>
                      updateStatus(
                        selectedStudent._id,
                        'status',
                        selectedStudent.accountStatus ===
                          'SUSPENDED'
                          ? 'ACTIVE'
                          : 'SUSPENDED',
                        selectedStudent.accountStatus ===
                          'SUSPENDED'
                          ? 'Student reactivated successfully.'
                          : 'Student suspended successfully.'
                      )
                    }
                  >
                    {selectedStudent.accountStatus ===
                    'SUSPENDED'
                      ? 'Reactivate'
                      : 'Suspend'}
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="empty-admin">
              Student details are unavailable.
            </div>
          )}
        </AdminModal>
      )}
    </>
  );
}


/* =========================================================
   GENERIC ADMIN RECORD PAGE
========================================================= */

function AdminRecordPage({
  request,
  title,
  routePath,
  type
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState('');
  const [notice, setNotice] = useState('');
  const [confirmRide, setConfirmRide] = useState(null);
  const [completingRideId, setCompletingRideId] = useState('');

  const loadRecords = () => {
    setLoading(true);
    setError('');

    request(routePath)
      .then((data) => {
        setItems(
          data.rides ||
            data.reports ||
            data.logs ||
            data.bookings ||
            []
        );
      })
      .catch((err) => {
        setError(
          err.message ||
            'Unable to load records.'
        );
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadRecords();
  }, [request, routePath]);

  const handleCompleteRide = async (ride) => {
    setCompletingRideId(ride._id);
    setError('');

    try {
      const data = await request(
        `/admin/rides/${ride._id}/complete`,
        { method: 'PATCH' }
      );

      setItems((currentItems) =>
        currentItems.map((item) =>
          item._id === ride._id
            ? {
                ...item,
                status: 'COMPLETED',
                completedAt:
                  data.ride?.completedAt ||
                  new Date().toISOString(),
                completionMethod:
                  data.ride?.completionMethod ||
                  'ADMIN'
              }
            : item
        )
      );

      setNotice(data.message || 'Ride completed successfully.');
      setConfirmRide(null);
    } catch (err) {
      setError(err.message || 'Unable to complete ride.');
    } finally {
      setCompletingRideId('');
    }
  };

  return (
    <>
      <header className="admin-header">
        <div>
          <button
            className="link-button admin-back"
            type="button"
            onClick={() => {
              window.history.pushState(
                {},
                '',
                '/admin/dashboard'
              );

              window.dispatchEvent(
                new PopStateEvent('popstate')
              );
            }}
          >
            <ChevronLeft size={16} />
            Overview
          </button>

          <p className="eyebrow">
            ADMIN OPERATIONS
          </p>

          <h1>
            {title}
          </h1>

          <p className="muted">
            Review live platform records
            and authorized actions.
          </p>
        </div>
      </header>

      {notice && (
        <div className="success-box">
          <CheckCircle2 size={17} />
          {notice}
        </div>
      )}

      {error && (
        <div className="error-box">
          {error}
        </div>
      )}

      <section className="admin-panel admin-tool-panel admin-records-panel">
        {loading ? (
          <div className="admin-loading">
            Loading records...
          </div>
        ) : !items.length ? (
          <div className="empty-admin">
            No records found.
          </div>
        ) : (
          items.map((item, index) => (
            <article
              className="admin-record ride-admin-record"
              key={
                item._id ||
                `${type}-${item.createdAt}-${index}`
              }
            >
              <div className="ride-admin-main">
                <div className="ride-admin-copy">
                  <b>
                    {type === 'rides'
                      ? `${item.source || 'Ride'} to ${
                          item.destination ||
                          'destination'
                        }`
                      : type === 'reports'
                        ? item.reason ||
                          'Report'
                        : item.action ||
                          'System event'}
                  </b>

                  <small>
                    {type === 'rides'
                      ? `${
                          item.creator?.name ||
                          'Unknown creator'
                        } · ${
                          item.date
                            ? formatDate(item.date)
                            : 'Date unavailable'
                        } · ${
                          item.departureTime ||
                          'Time unavailable'
                        }`
                      : type === 'reports'
                        ? `${
                            item.reporter?.name ||
                            'Unknown reporter'
                          } · ${
                            item.status ||
                            'OPEN'
                          }`
                        : `${
                            item.admin?.name ||
                            'Unknown admin'
                          } · ${
                            item.target ||
                            'System'
                          }`}
                  </small>
                </div>

                {type === 'rides' && (
                  <div className="ride-admin-meta">
                    <span className={`status-badge ${String(item.status || 'ACTIVE').toLowerCase()}`}>
                      {item.status || 'ACTIVE'}
                    </span>

                    {item.status === 'ACTIVE' && (
                      <button
                        className="primary-button ride-complete-button"
                        type="button"
                        disabled={completingRideId === item._id}
                        onClick={() => setConfirmRide(item)}
                      >
                        {completingRideId === item._id
                          ? 'Completing...'
                          : 'Complete Ride'}
                      </button>
                    )}
                  </div>
                )}
              </div>

              <small>
                {type === 'rides'
                  ? `Status: ${item.status || 'ACTIVE'}`
                  : formatDateTime(
                      item.createdAt,
                      'Recent activity'
                    )}
              </small>
            </article>
          ))
        )}
      </section>

      {confirmRide && (
        <AdminModal
          title="Complete ride?"
          eyebrow="RIDE COMPLETION"
          onClose={() => setConfirmRide(null)}
          className="ride-completion-modal"
          footer={
            <>
              <button
                className="soft-button"
                type="button"
                onClick={() => setConfirmRide(null)}
              >
                Cancel
              </button>

              <button
                className="primary-button"
                type="button"
                disabled={completingRideId === confirmRide._id}
                onClick={() => handleCompleteRide(confirmRide)}
              >
                {completingRideId === confirmRide._id
                  ? 'Completing...'
                  : 'Complete Ride'}
              </button>
            </>
          }
        >
          <div className="ride-completion-summary">
            <p className="modal-summary">
              {confirmRide.source || 'Ride'} → {confirmRide.destination || 'Destination'}
            </p>

            <div className="ride-completion-grid">
              <div>
                <small>Date</small>
                <b>{formatDate(confirmRide.date, 'Not available')}</b>
              </div>

              <div>
                <small>Time</small>
                <b>{formatValue(confirmRide.departureTime, 'Not available')}</b>
              </div>

              <div>
                <small>Current status</small>
                <b>{confirmRide.status || 'ACTIVE'}</b>
              </div>
            </div>

            <p className="ride-completion-question">
              Are you sure you want to mark this ride as completed?
            </p>
          </div>
        </AdminModal>
      )}
    </>
  );
}


/* =========================================================
   ADMIN SETTINGS
========================================================= */

function AdminSettingsPage() {
  return (
    <>
      <header className="admin-header">
        <div>
          <p className="eyebrow">
            SYSTEM SETTINGS
          </p>

          <h1>
            Admin <em>settings.</em>
          </h1>

          <p className="muted">
            Access platform configuration
            and security controls.
          </p>
        </div>
      </header>

      <section className="admin-panel">
        <div className="admin-panel-head">
          <div>
            <p className="eyebrow">
              CONFIGURATION
            </p>

            <h2>
              Platform controls
            </h2>
          </div>
        </div>

        <div className="status-list">
          <div>
            <ShieldCheck size={16} />
            JWT-based authentication remains active
          </div>

          <div>
            <Database size={16} />
            MongoDB data remains the sole source of truth
          </div>

          <div>
            <Clock3 size={16} />
            Normal user routes remain isolated from admin routes
          </div>

          <div>
            <CarFront size={16} />
            Ride and booking data stay under secured admin APIs
          </div>
        </div>
      </section>
    </>
  );
}


/* =========================================================
   COLLECTION PAGE
   BOOKINGS / MESSAGES / NOTIFICATIONS
========================================================= */

function AdminCollectionPage({
  request,
  title,
  eyebrow,
  endpoint,
  type
}) {
  const [items, setItems] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  useEffect(() => {
    setLoading(true);
    setError('');

    request(endpoint)
      .then((data) => {
        setItems(
          data[type] ||
            data.popularRoutes ||
            []
        );
      })
      .catch((err) => {
        setError(
          err.message ||
            'Unable to load records.'
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, [endpoint, request, type]);

  const label = (item) => {
    if (type === 'popularRoutes') {
      return `${item.source} to ${item.destination}`;
    }

    if (type === 'bookings') {
      return `${item.ride?.source || 'Ride'} to ${
        item.ride?.destination ||
        'destination'
      }`;
    }

    if (type === 'messages') {
      return item.message;
    }

    return (
      item.title ||
      item.message ||
      'Notification'
    );
  };

  const detail = (item) => {
    if (type === 'popularRoutes') {
      return `${item.rides || 0} rides · ${
        item.passengers || 0
      } accepted passengers`;
    }

    if (type === 'bookings') {
      return `${
        item.user?.name ||
        'Unknown user'
      } · ${
        item.status ||
        'PENDING'
      }`;
    }

    if (type === 'messages') {
      return `${
        item.sender?.name ||
        'Unknown sender'
      } · ${
        item.ride?.source ||
        'Ride chat'
      }`;
    }

    return `${
      item.user?.name ||
      'User'
    } · ${
      item.read
        ? 'Read'
        : 'Unread'
    }`;
  };

  return (
    <>
      <header className="admin-header">
        <div>
          <p className="eyebrow">
            {eyebrow}
          </p>

          <h1>
            {title}
          </h1>

          <p className="muted">
            Records loaded from the Campus
            Commute database.
          </p>
        </div>
      </header>

      {error && (
        <div className="error-box">
          {error}
        </div>
      )}

      <section className="admin-panel admin-tool-panel">
        {loading ? (
          <div className="admin-loading">
            Loading records...
          </div>
        ) : items.length ? (
          items.map((item, index) => (
            <article
              className="admin-record"
              key={
                item._id ||
                `${type}-${index}`
              }
            >
              <div>
                <b>
                  {label(item)}
                </b>

                <small>
                  {detail(item)}
                </small>
              </div>

              <small>
                {item.createdAt
                  ? formatDateTime(
                      item.createdAt
                    )
                  : `${item.rides || 0} rides`}
              </small>
            </article>
          ))
        ) : (
          <div className="empty-admin">
            No records available yet.
          </div>
        )}
      </section>
    </>
  );
}


/* =========================================================
   ROUTE ANALYTICS
========================================================= */

function AdminRoutesPage({ request }) {
  const [routes, setRoutes] =
    useState([]);

  const [selected, setSelected] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  useEffect(() => {
    setLoading(true);

    request('/admin/routes')
      .then((data) => {
        setRoutes(
          Array.isArray(data.routes)
            ? data.routes
            : []
        );
      })
      .catch((err) => {
        setError(
          err.message ||
            'Unable to load route analytics.'
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, [request]);

  return (
    <>
      <header className="admin-header">
        <div>
          <p className="eyebrow">
            ROUTE ANALYTICS
          </p>

          <h1>
            Route <em>analytics.</em>
          </h1>

          <p className="muted">
            Explore real rides and passenger
            requests by route.
          </p>
        </div>
      </header>

      {error && (
        <div className="error-box">
          {error}
        </div>
      )}

      <section className="admin-panel admin-tool-panel">
        {loading ? (
          <div className="admin-loading">
            Loading routes...
          </div>
        ) : routes.length ? (
          routes.map((route, index) => (
            <button
              className="admin-record admin-record-button"
              type="button"
              key={
                route._id ||
                `${route.source}-${route.destination}-${index}`
              }
              onClick={() =>
                setSelected(route)
              }
            >
              <span>
                <b>
                  <MapPin size={15} />

                  {route.source}

                  <em>
                    to
                  </em>

                  {route.destination}
                </b>

                <small>
                  {route.rideCount || 0}{' '}
                  rides ·{' '}
                  {route.acceptedPassengers ||
                    0}{' '}
                  accepted passengers
                </small>
              </span>

              <ChevronRight size={17} />
            </button>
          ))
        ) : (
          <div className="empty-admin">
            No route data available yet.
          </div>
        )}
      </section>

      {/* ROUTE DETAILS MODAL */}

      {selected && (
        <AdminModal
          title={`${selected.source} to ${selected.destination}`}
          eyebrow="ROUTE DETAILS"
          onClose={() =>
            setSelected(null)
          }
          className="wide-admin-modal"
        >
          <p className="modal-summary">
            {selected.rideCount || 0}{' '}
            rides ·{' '}
            {selected.acceptedPassengers ||
              0}{' '}
            accepted passengers
          </p>

          {Array.isArray(selected.rides) &&
          selected.rides.length ? (
            selected.rides.map(
              (ride, index) => (
                <article
                  className="ride-detail"
                  key={
                    ride._id ||
                    `ride-${index}`
                  }
                >
                  <h3>
                    Ride {index + 1}
                  </h3>

                  <div className="ride-detail-meta">
                    <span>
                      <small>
                        Driver
                      </small>

                      <b>
                        {formatValue(
                          ride.creator?.name
                        )}
                      </b>
                    </span>

                    <span>
                      <small>
                        Starting point
                      </small>

                      <b>
                        {formatValue(
                          ride.source ||
                            selected.source
                        )}
                      </b>
                    </span>

                    <span>
                      <small>
                        Destination
                      </small>

                      <b>
                        {formatValue(
                          ride.destination ||
                            selected.destination
                        )}
                      </b>
                    </span>

                    <span>
                      <small>
                        Date
                      </small>

                      <b>
                        {formatDate(
                          ride.date
                        )}
                      </b>
                    </span>

                    <span>
                      <small>
                        Time
                      </small>

                      <b>
                        {formatValue(
                          ride.departureTime
                        )}
                      </b>
                    </span>

                    <span>
                      <small>
                        Status
                      </small>

                      <b>
                        {formatValue(
                          ride.status
                        )}
                      </b>
                    </span>

                    <span>
                      <small>
                        Seats
                      </small>

                      <b>
                        {formatValue(
                          ride.currentPassengers,
                          0
                        )}{' '}
                        /{' '}
                        {formatValue(
                          ride.maxPassengers
                        )}
                      </b>
                    </span>

                    <span>
                      <small>
                        Available
                      </small>

                      <b>
                        {formatValue(
                          ride.availableSeats,
                          0
                        )}
                      </b>
                    </span>
                  </div>

                  <div className="passenger-list">
                    <h4>
                      Passengers and requests
                    </h4>

                    {Array.isArray(
                      ride.requests
                    ) &&
                    ride.requests.length ? (
                      ride.requests.map(
                        (item, requestIndex) => (
                          <div
                            className="passenger-row"
                            key={
                              item._id ||
                              `request-${requestIndex}`
                            }
                          >
                            <span>
                              <b>
                                {formatValue(
                                  item.user?.name
                                )}
                              </b>

                              <small>
                                {item.requestedAt
                                  ? formatDateTime(
                                      item.requestedAt
                                    )
                                  : 'Request time unavailable'}
                              </small>
                            </span>

                            <span
                              className={
                                item.status ===
                                'ACCEPTED'
                                  ? 'status verified-status'
                                  : 'status pending-status'
                              }
                            >
                              {formatValue(
                                item.status
                              )}
                            </span>
                          </div>
                        )
                      )
                    ) : (
                      <small>
                        No passenger requests
                        for this ride.
                      </small>
                    )}
                  </div>
                </article>
              )
            )
          ) : (
            <div className="empty-admin">
              No ride details available.
            </div>
          )}
        </AdminModal>
      )}
    </>
  );
}


/* =========================================================
   ADMIN MESSAGES
   LIST ONLY RIDES
   CLICK RIDE -> SHOW ALL MESSAGES
========================================================= */

function AdminMessagesPage({ request }) {
  const [conversations, setConversations] =
    useState([]);

  const [selected, setSelected] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  useEffect(() => {
    setLoading(true);

    request('/admin/messages')
      .then((data) => {
        setConversations(
          Array.isArray(data.conversations)
            ? data.conversations
            : []
        );
      })
      .catch((err) => {
        setError(
          err.message ||
            'Unable to load ride conversations.'
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, [request]);

  return (
    <>
      <header className="admin-header">
        <div>
          <p className="eyebrow">
            MESSAGE MONITOR
          </p>

          <h1>
            Admin <em>messages.</em>
          </h1>

          <p className="muted">
            Select a ride to review every
            message exchanged under that ride.
          </p>
        </div>
      </header>

      {error && (
        <div className="error-box">
          {error}
        </div>
      )}

      <section className="admin-panel admin-tool-panel">
        {loading ? (
          <div className="admin-loading">
            Loading ride conversations...
          </div>
        ) : conversations.length ? (
          conversations.map(
            (conversation, index) => (
              <button
                className="admin-record admin-record-button"
                type="button"
                key={
                  conversation.ride?._id ||
                  `conversation-${index}`
                }
                onClick={() =>
                  setSelected(
                    conversation
                  )
                }
              >
                <span>
                  {/* ONLY START + END DESTINATION */}
                  <b>
                    {conversation.ride?.source ||
                      'Unknown starting point'}

                    <em>
                      to
                    </em>

                    {conversation.ride?.destination ||
                      'Unknown destination'}
                  </b>

                  <small>
                    {Array.isArray(
                      conversation.messages
                    )
                      ? conversation.messages.length
                      : 0}{' '}
                    messages
                  </small>
                </span>

                <ChevronRight size={17} />
              </button>
            )
          )
        ) : (
          <div className="empty-admin">
            No ride conversations available
            yet.
          </div>
        )}
      </section>

      {/* MESSAGE POPUP */}

      {selected && (
        <AdminModal
          title={`${selected.ride?.source || 'Unknown'} to ${
            selected.ride?.destination ||
            'Unknown'
          }`}
          eyebrow="RIDE CONVERSATION"
          onClose={() =>
            setSelected(null)
          }
          className="wide-admin-modal"
        >
          <div className="conversation-context">
            <span>
              <small>
                Driver
              </small>

              <b>
                {formatValue(
                  selected.ride?.creator?.name
                )}
              </b>
            </span>

            <span>
              <small>
                Starting point
              </small>

              <b>
                {formatValue(
                  selected.ride?.source
                )}
              </b>
            </span>

            <span>
              <small>
                Destination
              </small>

              <b>
                {formatValue(
                  selected.ride?.destination
                )}
              </b>
            </span>

            <span>
              <small>
                Ride date
              </small>

              <b>
                {formatDate(
                  selected.ride?.date
                )}
              </b>
            </span>

            <span>
              <small>
                Ride time
              </small>

              <b>
                {formatValue(
                  selected.ride?.departureTime
                )}
              </b>
            </span>

            <span>
              <small>
                Total messages
              </small>

              <b>
                {Array.isArray(
                  selected.messages
                )
                  ? selected.messages.length
                  : 0}
              </b>
            </span>
          </div>

          <div className="conversation-list">
            {Array.isArray(
              selected.messages
            ) &&
            selected.messages.length ? (
              selected.messages.map(
                (message, index) => (
                  <article
                    className="message-entry"
                    key={
                      message._id ||
                      `message-${index}`
                    }
                  >
                    <div>
                      <b>
                        {formatValue(
                          message.sender?.name,
                          'Unknown sender'
                        )}
                      </b>

                      <small>
                        To:{' '}
                        {Array.isArray(
                          message.recipients
                        ) &&
                        message.recipients.length
                          ? message.recipients
                              .map(
                                (recipient) =>
                                  recipient.name
                              )
                              .filter(Boolean)
                              .join(', ')
                          : 'Ride participants'}

                        {message.createdAt
                          ? ` · ${formatDateTime(
                              message.createdAt
                            )}`
                          : ''}
                      </small>
                    </div>

                    <p>
                      {formatValue(
                        message.message,
                        'Message unavailable'
                      )}
                    </p>
                  </article>
                )
              )
            ) : (
              <div className="empty-admin">
                No messages have been exchanged
                under this ride.
              </div>
            )}
          </div>
        </AdminModal>
      )}
    </>
  );
}


/* =========================================================
   ADMIN NOTIFICATIONS
========================================================= */

function AdminNotificationsPage({
  request
}) {
  const [notifications, setNotifications] =
    useState([]);

  const [selected, setSelected] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  useEffect(() => {
    setLoading(true);

    request('/admin/notifications')
      .then((data) => {
        setNotifications(
          Array.isArray(
            data.notifications
          )
            ? data.notifications
            : []
        );
      })
      .catch((err) => {
        setError(
          err.message ||
            'Unable to load notifications.'
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, [request]);

  return (
    <>
      <header className="admin-header">
        <div>
          <p className="eyebrow">
            NOTIFICATION MONITOR
          </p>

          <h1>
            System <em>notifications.</em>
          </h1>

          <p className="muted">
            Understand every event with its
            people, ride, request, status,
            and time context.
          </p>
        </div>
      </header>

      {error && (
        <div className="error-box">
          {error}
        </div>
      )}

      <section className="admin-panel admin-tool-panel">
        {loading ? (
          <div className="admin-loading">
            Loading notifications...
          </div>
        ) : notifications.length ? (
          notifications.map((item, index) => (
            <button
              className="admin-record admin-record-button"
              type="button"
              key={
                item._id ||
                `notification-${index}`
              }
              onClick={() =>
                setSelected(item)
              }
            >
              <span>
                <b>
                  {item.title ||
                    item.type ||
                    'Notification'}
                </b>

                <small>
                  {item.relatedRide
                    ? `${item.relatedRide.source} to ${item.relatedRide.destination}`
                    : item.message ||
                      'No related ride'}

                  {' · '}

                  From{' '}
                  {item.relatedRequest?.user
                    ?.name ||
                    'System'}
                </small>
              </span>

              <span
                className={
                  item.read
                    ? 'status verified-status'
                    : 'status pending-status'
                }
              >
                {item.read
                  ? 'READ'
                  : 'UNREAD'}
              </span>
            </button>
          ))
        ) : (
          <div className="empty-admin">
            No notifications available yet.
          </div>
        )}
      </section>

      {/* NOTIFICATION DETAILS POPUP */}

      {selected && (
        <AdminModal
          title={
            selected.title ||
            selected.type ||
            'Notification details'
          }
          eyebrow="NOTIFICATION DETAILS"
          onClose={() =>
            setSelected(null)
          }
        >
          <div className="notification-detail-grid">
            {[
              [
                'Type',
                selected.type
              ],

              [
                'From',
                selected.relatedRequest?.user
                  ?.name || 'System'
              ],

              [
                'To',
                selected.user?.name
              ],

              [
                'Related student',
                selected.relatedRequest?.user
                  ?.name
              ],

              [
                'Ride',
                selected.relatedRide
                  ? `${selected.relatedRide.source} to ${selected.relatedRide.destination}`
                  : null
              ],

              [
                'Ride date',
                selected.relatedRide?.date
                  ? formatDate(
                      selected.relatedRide.date
                    )
                  : null
              ],

              [
                'Ride time',
                selected.relatedRide
                  ?.departureTime
              ],

              [
                'Request status',
                selected.relatedRequest
                  ?.status
              ],

              [
                'Notification status',
                selected.read
                  ? 'READ'
                  : 'UNREAD'
              ],

              [
                'Created',
                selected.createdAt
                  ? formatDateTime(
                      selected.createdAt
                    )
                  : null
              ]
            ].map(
              ([label, value]) => (
                <div key={label}>
                  <small>
                    {label}
                  </small>

                  <b>
                    {formatValue(
                      value
                    )}
                  </b>
                </div>
              )
            )}
          </div>

          <div className="notification-message">
            <small>
              Message
            </small>

            <p>
              {formatValue(
                selected.message
              )}
            </p>
          </div>
        </AdminModal>
      )}
    </>
  );
}


/* =========================================================
   ADMIN ROUTES
========================================================= */

export function AdminRoutes({
  user,
  setUser,
  onLogout,
  request
}) {
  return (
    <Routes>

      {/* ADMIN LOGIN */}

      <Route
        path="/login"
        element={
          user &&
          user.role === 'ADMIN' ? (
            <Navigate
              to="/admin/dashboard"
              replace
            />
          ) : (
            <AdminLoginPage
              request={request}
              user={user}
              onLogin={(account) =>
                setUser(account)
              }
            />
          )
        }
      />

      {/* ADMIN ROOT */}

      <Route
        path="/"
        element={
          <Navigate
            to={
              user &&
              user.role === 'ADMIN'
                ? '/admin/dashboard'
                : '/admin/login'
            }
            replace
          />
        }
      />

      {/* DASHBOARD */}

      <Route
        path="/dashboard"
        element={
          <AdminRoute user={user}>
            <AdminLayout
              user={user}
              onLogout={onLogout}
            >
              <AdminDashboard
                request={request}
                user={user}
              />
            </AdminLayout>
          </AdminRoute>
        }
      />

      {/* USER MANAGEMENT */}

      <Route
        path="/users"
        element={
          <AdminRoute user={user}>
            <AdminLayout
              user={user}
              onLogout={onLogout}
            >
              <AdminUsersPage
                request={request}
              />
            </AdminLayout>
          </AdminRoute>
        }
      />

      {/* RIDE MANAGEMENT */}

      <Route
        path="/rides"
        element={
          <AdminRoute user={user}>
            <AdminLayout
              user={user}
              onLogout={onLogout}
            >
              <AdminRecordPage
                request={request}
                title={
                  <>
                    All <em>rides.</em>
                  </>
                }
                routePath="/admin/rides"
                type="rides"
              />
            </AdminLayout>
          </AdminRoute>
        }
      />

      {/* BOOKINGS */}

      <Route
        path="/bookings"
        element={
          <AdminRoute user={user}>
            <AdminLayout
              user={user}
              onLogout={onLogout}
            >
              <AdminCollectionPage
                request={request}
                title={
                  <>
                    Ride <em>bookings.</em>
                  </>
                }
                eyebrow="BOOKING OPERATIONS"
                endpoint="/admin/bookings"
                type="bookings"
              />
            </AdminLayout>
          </AdminRoute>
        }
      />

      {/* ROUTE ANALYTICS */}

      <Route
        path="/routes"
        element={
          <AdminRoute user={user}>
            <AdminLayout
              user={user}
              onLogout={onLogout}
            >
              <AdminRoutesPage
                request={request}
              />
            </AdminLayout>
          </AdminRoute>
        }
      />

      {/* ANALYTICS */}

      <Route
        path="/analytics"
        element={
          <AdminRoute user={user}>
            <AdminLayout
              user={user}
              onLogout={onLogout}
            >
              <AdminDashboard
                request={request}
                user={user}
              />
            </AdminLayout>
          </AdminRoute>
        }
      />

      {/* MESSAGES */}

      <Route
        path="/messages"
        element={
          <AdminRoute user={user}>
            <AdminLayout
              user={user}
              onLogout={onLogout}
            >
              <AdminMessagesPage
                request={request}
              />
            </AdminLayout>
          </AdminRoute>
        }
      />

      {/* NOTIFICATIONS */}

      <Route
        path="/notifications"
        element={
          <AdminRoute user={user}>
            <AdminLayout
              user={user}
              onLogout={onLogout}
            >
              <AdminNotificationsPage
                request={request}
              />
            </AdminLayout>
          </AdminRoute>
        }
      />

      {/* REPORTS */}

      <Route
        path="/reports"
        element={
          <AdminRoute user={user}>
            <AdminLayout
              user={user}
              onLogout={onLogout}
            >
              <AdminRecordPage
                request={request}
                title={
                  <>
                    Community <em>reports.</em>
                  </>
                }
                routePath="/admin/reports"
                type="reports"
              />
            </AdminLayout>
          </AdminRoute>
        }
      />

      {/* SETTINGS */}

      <Route
        path="/settings"
        element={
          <AdminRoute user={user}>
            <AdminLayout
              user={user}
              onLogout={onLogout}
            >
              <AdminSettingsPage />
            </AdminLayout>
          </AdminRoute>
        }
      />

      {/* FALLBACK */}

      <Route
        path="*"
        element={
          <Navigate
            to={
              user &&
              user.role === 'ADMIN'
                ? '/admin/dashboard'
                : '/admin/login'
            }
            replace
          />
        }
      />

    </Routes>
  );
}
import React, {
  useCallback,
  useEffect,
  useRef,
  useState
} from 'react';

import { io } from 'socket.io-client';

import {
  Bell,
  Bot,
  CalendarDays,
  CarFront,
  Check,
  CheckCheck,
  ChevronRight,
  ChevronLeft,
  Clock3,
  Home,
  LoaderCircle,
  LogOut,
  MapPin,
  MessageCircle,
  Menu,
  Plus,
  Save,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Settings,
  UserRound,
  Users,
  X
} from 'lucide-react';

const SOCKET_URL = (
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:5000/api' : 'https://campus-commute.onrender.com/api')
).replace(/\/api$/, '');

const initials = (name = '') =>
  name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'CC';

const dateLabel = (value) =>
  value
    ? new Date(value).toLocaleString([], {
        dateStyle: 'medium',
        timeStyle: 'short'
      })
    : '';


/* =========================================================
   SOCKET
========================================================= */

function useCampusSocket(
  token,
  onMessage,
  onNotification
) {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token) return undefined;

    const socket = io(SOCKET_URL, {
      auth: {
        token
      },
      transports: [
        'websocket',
        'polling'
      ],
      reconnection: true
    });

    socketRef.current = socket;

    socket.on(
      'receiveMessage',
      onMessage
    );

    socket.on(
      'notification',
      onNotification
    );

    return () => {
      socket.off(
        'receiveMessage',
        onMessage
      );

      socket.off(
        'notification',
        onNotification
      );

      socket.disconnect();

      socketRef.current = null;
    };
  }, [
    token,
    onMessage,
    onNotification
  ]);

  return socketRef;
}


/* =========================================================
   ASSISTANT
========================================================= */

function Assistant({ request }) {
  const [open, setOpen] =
    useState(false);

  const [messages, setMessages] =
    useState([
      {
        role: 'assistant',
        content:
          "Hi! I'm the Campus Commute Assistant. How can I help you today?"
      }
    ]);

  const [text, setText] =
    useState('');

  const [busy, setBusy] =
    useState(false);

  useEffect(() => {
    if (!open) return;

    request(
      '/chatbot/conversation'
    )
      .then(({ messages: saved }) => {
        if (saved?.length) {
          setMessages(saved);
        }
      })
      .catch(() => {});
  }, [open, request]);

  const send = async (
    content = text
  ) => {
    if (!content.trim() || busy) {
      return;
    }

    setText('');

    setMessages((items) => [
      ...items,
      {
        role: 'user',
        content
      }
    ]);

    setBusy(true);

    try {
      const result = await request(
        '/chatbot/message',
        {
          method: 'POST',
          body: JSON.stringify({
            message: content
          })
        }
      );

      setMessages((items) => [
        ...items,
        {
          role: 'assistant',
          content: result.reply
        }
      ]);
    } catch (error) {
      setMessages((items) => [
        ...items,
        {
          role: 'assistant',
          content: error.message
        }
      ]);
    } finally {
      setBusy(false);
    }
  };

  const quick = [
    'Find a ride',
    'How do I book a ride?',
    'How do I offer a ride?',
    'My trips',
    'My messages',
    'Notifications',
    'Profile help',
    'Contact support'
  ];

  return (
    <>
      <button
        className="assistant-launch"
        onClick={() => setOpen(!open)}
        title="Open Campus Commute Assistant"
      >
        <Bot size={23} />
      </button>

      {open && (
        <section className="assistant-panel">

          <header>
            <div className="assistant-title">
              <span className="assistant-avatar">
                <Bot size={17} />
              </span>

              <div>
                <b>
                  Campus Commute Assistant
                </b>

                <small>
                  How can I help you?
                </small>
              </div>
            </div>

            <button
              className="icon-button"
              onClick={() => setOpen(false)}
            >
              <X size={17} />
            </button>
          </header>

          <div className="assistant-messages">
            {messages.map(
              (item, index) => (
                <div
                  className={
                    item.role === 'user'
                      ? 'assistant-message user'
                      : 'assistant-message'
                  }
                  key={`${item.timestamp || ''}-${index}`}
                >
                  {item.content}
                </div>
              )
            )}

            {busy && (
              <div className="assistant-message">
                <LoaderCircle
                  size={15}
                  className="spin"
                />
                Thinking...
              </div>
            )}
          </div>

          <div className="assistant-quick">
            {quick.map((item) => (
              <button
                key={item}
                onClick={() => send(item)}
              >
                {item}
              </button>
            ))}
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              send();
            }}
          >
            <input
              value={text}
              onChange={(event) =>
                setText(event.target.value)
              }
              placeholder="Ask Campus Commute..."
            />

            <button
              disabled={
                busy || !text.trim()
              }
            >
              <Send size={16} />
            </button>
          </form>

        </section>
      )}
    </>
  );
}


/* =========================================================
   MESSAGES
========================================================= */

function MessagesView({
  request,
  rides,
  token,
  user
}) {
  const conversations = [
    ...(rides.created || []),
    ...(rides.joined || [])
  ].filter(
    (ride, index, list) =>
      list.findIndex(
        (item) =>
          item._id === ride._id
      ) === index
  );

  const [active, setActive] =
    useState(
      conversations[0] || null
    );

  const [messages, setMessages] =
    useState([]);

  const [text, setText] =
    useState('');

  const handleMessage =
    useCallback(
      (payload) => {
        const rideId =
          payload.message?.ride?._id ||
          payload.message?.ride;

        if (
          rideId === active?._id
        ) {
          setMessages((items) => [
            ...items,
            payload.message
          ]);
        }
      },
      [active?._id]
    );

  const handleNotification =
    useCallback(() => {}, []);

  const socket =
    useCampusSocket(
      token,
      handleMessage,
      handleNotification
    );

  useEffect(() => {
    if (!active) return;

    request(
      `/messages/${active._id}`
    )
      .then(
        ({ messages: items }) =>
          setMessages(items)
      )
      .catch(() =>
        setMessages([])
      );

    socket.current?.emit(
      'joinRideRoom',
      active._id
    );

    return () => {
      socket.current?.emit(
        'leaveRideRoom',
        active._id
      );
    };
  }, [
    active?._id,
    request
  ]);

  const send = async (event) => {
    event.preventDefault();

    if (
      !text.trim() ||
      !active
    ) {
      return;
    }

    const content =
      text.trim();

    setText('');

    if (
      socket.current?.connected
    ) {
      socket.current.emit(
        'sendMessage',
        {
          rideId: active._id,
          message: content
        }
      );
    } else {
      try {
        const result =
          await request(
            `/messages/${active._id}`,
            {
              method: 'POST',
              body: JSON.stringify({
                message: content
              })
            }
          );

        setMessages((items) => [
          ...items,
          result.message
        ]);
      } catch (error) {
        window.alert(
          error.message
        );
      }
    }
  };

  return (
    <section className="subpage messages-page">

      <div className="welcome-row">
        <div>
          <p className="eyebrow">
            PRIVATE RIDE CHAT
          </p>

          <h1>
            Your <em>messages.</em>
          </h1>

          <p className="muted">
            Conversations stay available to
            accepted ride participants.
          </p>
        </div>
      </div>

      <div className="chat-layout">

        <aside className="conversation-list">

          {conversations.length ? (
            conversations.map(
              (ride) => (
                <button
                  className={
                    active?._id === ride._id
                      ? 'conversation active'
                      : 'conversation'
                  }
                  key={ride._id}
                  onClick={() =>
                    setActive(ride)
                  }
                >
                  <span className="avatar small">
                    {initials(
                      ride.creator?.name ||
                      user.name
                    )}
                  </span>

                  <span>
                    <b>
                      {ride.source} to{' '}
                      {ride.destination}
                    </b>

                    <small>
                      {dateLabel(
                        ride.date
                      )}
                    </small>
                  </span>
                </button>
              )
            )
          ) : (
            <div className="chat-empty">
              No conversations yet.
            </div>
          )}

        </aside>

        <div className="chat-thread">

          {active ? (
            <>
              <div className="chat-thread-head">
                <b>
                  {active.source} to{' '}
                  {active.destination}
                </b>

                <small>
                  {active.creator?.name ||
                    'Ride conversation'}
                </small>
              </div>

              <div className="chat-messages">

                {messages.map(
                  (message) => (
                    <div
                      className={
                        String(
                          message.sender?._id ||
                            message.sender
                        ) ===
                        String(user._id)
                          ? 'chat-bubble mine'
                          : 'chat-bubble'
                      }
                      key={
                        message._id ||
                        `${message.createdAt}-${message.message}`
                      }
                    >
                      <span>
                        {message.message}
                      </span>

                      <small>
                        {new Date(
                          message.createdAt
                        ).toLocaleTimeString(
                          [],
                          {
                            hour: '2-digit',
                            minute: '2-digit'
                          }
                        )}
                      </small>
                    </div>
                  )
                )}

              </div>

              <form
                className="chat-compose"
                onSubmit={send}
              >
                <input
                  value={text}
                  onChange={(event) =>
                    setText(
                      event.target.value
                    )
                  }
                  placeholder="Write a message..."
                />

                <button
                  className="primary-button"
                  disabled={!text.trim()}
                >
                  <Send size={16} />
                </button>
              </form>
            </>
          ) : (
            <div className="chat-empty">
              Join a ride to unlock its private chat.
            </div>
          )}

        </div>
      </div>

    </section>
  );
}


/* =========================================================
   NOTIFICATIONS
========================================================= */

function NotificationsView({
  request,
  notifications,
  setNotifications,
  setScreen
}) {
  const [error, setError] =
    useState('');

  const mark = async (id) => {
    try {
      await request(
        `/notifications/${id}/read`,
        {
          method: 'PATCH'
        }
      );

      setNotifications(
        (items) =>
          items.map((item) =>
            item._id === id
              ? {
                  ...item,
                  read: true
                }
              : item
          )
      );
    } catch (error) {
      setError(
        error.message
      );
    }
  };

  const markAll = async () => {
    try {
      await request(
        '/notifications/read-all',
        {
          method: 'PATCH'
        }
      );

      setNotifications(
        (items) =>
          items.map((item) => ({
            ...item,
            read: true
          }))
      );
    } catch (error) {
      setError(
        error.message
      );
    }
  };

  return (
    <section className="subpage">

      <div className="welcome-row">

        <div>
          <p className="eyebrow">
            STAY IN THE LOOP
          </p>

          <h1>
            Your <em>notifications.</em>
          </h1>
        </div>

        <button
          className="soft-button"
          onClick={markAll}
        >
          <CheckCheck size={16} />
          Mark all read
        </button>

      </div>

      {error && (
        <div className="error-box">
          {error}
        </div>
      )}

      <div className="notification-list">

        {notifications.length ? (
          notifications.map(
            (item) => (
              <article
                className={
                  item.read
                    ? 'notification-item'
                    : 'notification-item unread'
                }
                key={item._id}
                onClick={() =>
                  !item.read &&
                  mark(item._id)
                }
              >

                <span className="notification-icon">
                  <Bell size={17} />
                </span>

                <div>
                  <b>
                    {item.title ||
                      'Campus Commute update'}
                  </b>

                  <p>
                    {item.message}
                  </p>

                  <small>
                    {dateLabel(
                      item.createdAt
                    )}
                  </small>

                  {item.type ===
                    'NEW_JOIN' && (
                    <button
                      className="soft-button notification-action"
                      onClick={(event) => {
                        event.stopPropagation();

                        if (
                          !item.read
                        ) {
                          mark(item._id);
                        }

                        setScreen('trips');
                      }}
                    >
                      Review request
                    </button>
                  )}
                </div>

                {!item.read && (
                  <span className="notification-dot" />
                )}

              </article>
            )
          )
        ) : (
          <div className="empty-state">

            <Bell size={28} />

            <h3>
              No notifications yet
            </h3>

            <p>
              Ride and message updates
              will appear here.
            </p>

          </div>
        )}

      </div>

    </section>
  );
}


/* =========================================================
   PROFILE
========================================================= */

function ProfileView({
  request,
  user,
  setUser
}) {
  const [form, setForm] =
    useState({
      name: user.name || '',
      phone: user.phone || '',
      college: user.college || '',
      department:
        user.department || '',
      year: user.year || ''
    });

  const [state, setState] =
    useState('');

  const [error, setError] =
    useState('');

  const save = async (
    event
  ) => {
    event.preventDefault();

    setState('saving');
    setError('');

    try {
      const result =
        await request(
          '/users/me',
          {
            method: 'PATCH',
            body: JSON.stringify(form)
          }
        );

      setUser(result.user);
      setState('saved');
    } catch (error) {
      setError(
        error.message
      );
      setState('');
    }
  };

  return (
    <section className="subpage">

      <div className="welcome-row">

        <div>
          <p className="eyebrow">
            YOUR ACCOUNT
          </p>

          <h1>
            Your <em>profile.</em>
          </h1>

          <p className="muted">
            Keep your campus information
            current for better rides.
          </p>
        </div>

      </div>

      <div className="profile-layout">

        <div className="profile-summary">

          <div className="profile-avatar">
            {initials(user.name)}
          </div>

          <h2>
            {user.name}
          </h2>

          <p>
            {user.email}
          </p>

          <span className="status verified-status">
            <ShieldCheck size={13} />
            {user.verificationStatus}
          </span>

          <small>
            Member since{' '}
            {new Date(
              user.createdAt
            ).toLocaleDateString()}
          </small>

        </div>

        <form
          className="profile-form"
          onSubmit={save}
        >

          <div className="form-grid">

            <label>
              Full name

              <input
                value={form.name}
                onChange={(e) =>
                  setForm({
                    ...form,
                    name: e.target.value
                  })
                }
                required
              />
            </label>

            <label>
              Phone

              <input
                value={form.phone}
                onChange={(e) =>
                  setForm({
                    ...form,
                    phone: e.target.value
                  })
                }
              />
            </label>

            <label>
              College

              <input
                value={form.college}
                onChange={(e) =>
                  setForm({
                    ...form,
                    college: e.target.value
                  })
                }
              />
            </label>

            <label>
              Department

              <input
                value={form.department}
                onChange={(e) =>
                  setForm({
                    ...form,
                    department:
                      e.target.value
                  })
                }
              />
            </label>

            <label>
              Year

              <input
                value={form.year}
                onChange={(e) =>
                  setForm({
                    ...form,
                    year: e.target.value
                  })
                }
              />
            </label>

          </div>

          {error && (
            <div className="error-box">
              {error}
            </div>
          )}

          {state === 'saved' && (
            <div className="success-box">
              <Check size={16} />
              Profile saved.
            </div>
          )}

          <button
            className="primary-button"
            disabled={
              state === 'saving'
            }
          >
            <Save size={16} />

            {state === 'saving'
              ? 'Saving...'
              : 'Save changes'}
          </button>

        </form>

      </div>

    </section>
  );
}


/* =========================================================
   SETTINGS
========================================================= */

function SettingsView({
  request,
  user,
  onLogout
}) {
  const [preferences, setPreferences] =
    useState(
      user.preferences || {
        rideNotifications: true,
        messageNotifications: true,
        systemNotifications: true,
        profileVisible: true,
        onlineStatusVisible: true
      }
    );

  const [saved, setSaved] =
    useState(false);

  const toggle = async (
    key
  ) => {
    const next = {
      ...preferences,
      [key]: !preferences[key]
    };

    setPreferences(next);

    try {
      await request(
        '/users/me/preferences',
        {
          method: 'PATCH',
          body: JSON.stringify({
            [key]: next[key]
          })
        }
      );

      setSaved(true);
    } catch (error) {
      setSaved(false);
      window.alert(
        error.message
      );
    }
  };

  return (
    <section className="subpage">

      <div className="welcome-row">

        <div>
          <p className="eyebrow">
            PREFERENCES
          </p>

          <h1>
            Your <em>settings.</em>
          </h1>
        </div>

      </div>

      <div className="settings-panel">

        <h3>
          Notifications
        </h3>

        {[
          [
            'rideNotifications',
            'Ride updates',
            'Join requests and ride changes'
          ],
          [
            'messageNotifications',
            'Messages',
            'New messages in your ride chats'
          ],
          [
            'systemNotifications',
            'System updates',
            'Important Campus Commute notices'
          ]
        ].map(
          ([
            key,
            title,
            description
          ]) => (
            <label
              className="setting-row"
              key={key}
            >
              <span>
                <b>{title}</b>
                <small>
                  {description}
                </small>
              </span>

              <input
                type="checkbox"
                checked={Boolean(
                  preferences[key]
                )}
                onChange={() =>
                  toggle(key)
                }
              />
            </label>
          )
        )}

        <h3>
          Privacy
        </h3>

        {[
          [
            'profileVisible',
            'Profile visibility',
            'Let other students see your public profile'
          ],
          [
            'onlineStatusVisible',
            'Online status',
            'Show when you are available in chat'
          ]
        ].map(
          ([
            key,
            title,
            description
          ]) => (
            <label
              className="setting-row"
              key={key}
            >
              <span>
                <b>{title}</b>
                <small>
                  {description}
                </small>
              </span>

              <input
                type="checkbox"
                checked={Boolean(
                  preferences[key]
                )}
                onChange={() =>
                  toggle(key)
                }
              />
            </label>
          )
        )}

        {saved && (
          <div className="success-box">
            Settings saved.
          </div>
        )}

        <button
          className="soft-button"
          onClick={onLogout}
        >
          <LogOut size={16} />
          Log out
        </button>

      </div>

    </section>
  );
}


/* =========================================================
   TRIPS
========================================================= */

function TripsView({
  request,
  rides,
  setRides
}) {
  const [loading, setLoading] =
    useState(true);

  const [busyId, setBusyId] =
    useState('');

  const [error, setError] =
    useState('');

  const [success, setSuccess] =
    useState('');

  const [selectedRideId, setSelectedRideId] =
    useState('');

  const loadTrips = async () => {
    setLoading(true);
    setError('');

    try {
      const data =
        await request(
          '/rides/mine'
        );

      setRides({
        created:
          data.created || [],

        joined:
          data.joined || [],

        pending:
          data.pending || [],

        rejected:
          data.rejected || [],

        incomingRequests:
          data.incomingRequests || []
      });
    } catch (error) {
      setError(
        error.message
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrips();
  }, [request]);

  const processRequest =
    async (
      rideId,
      requestId,
      action
    ) => {
      if (busyId) return;

      setBusyId(requestId);
      setError('');
      setSuccess('');

      try {
        await request(
          `/rides/${rideId}/requests/${requestId}/${action}`,
          {
            method: 'POST'
          }
        );

        setSuccess(
          action === 'accept'
            ? 'Join request accepted successfully.'
            : 'Join request rejected successfully.'
        );

        await loadTrips();
      } catch (error) {
        setError(
          error.message
        );
      } finally {
        setBusyId('');
      }
    };

  const created =
    rides.created || [];

  const joined =
    rides.joined || [];

  const pending =
    rides.pending || [];

  const rejected =
    rides.rejected || [];

  const incomingRequests =
    rides.incomingRequests || [];

  if (loading) {
    return (
      <section className="subpage">
        <div className="admin-loading">
          Loading trips...
        </div>
      </section>
    );
  }

  return (
    <section className="subpage">

      <div className="welcome-row">

        <div>
          <p className="eyebrow">
            YOUR JOURNEY
          </p>

          <h1>
            Your <em>trips.</em>
          </h1>

          <p className="muted">
            Everything you have planned,
            in one place.
          </p>
        </div>

      </div>

      {error && (
        <div className="error-box">
          {error}
        </div>
      )}

      {success && (
        <div className="success-box">
          <Check size={16} />
          {success}
        </div>
      )}


      {/* =================================================
          INCOMING REQUESTS
      ================================================= */}

      <section className="trip-section">

        <div className="section-heading">
          <div>
            <p className="eyebrow">
              RIDE REQUESTS
            </p>

            <h2>
              Join requests
            </h2>
          </div>

          {incomingRequests.filter(
            (item) => item.status === 'PENDING'
          ).length > 0 && (
            <span className="status pending-status">
              {incomingRequests.filter(
                (item) => item.status === 'PENDING'
              ).length}{' '}
              pending
            </span>
          )}
        </div>

        {incomingRequests.length === 0 ? (
          <div className="empty-state">
            <MessageCircle
              size={28}
            />

            <h3>
              No join requests yet
            </h3>

            <p>
              Requests for your rides appear here
              with their pending, accepted, or
              rejected status.
            </p>
          </div>
        ) : (
          <div className="request-list">

            {incomingRequests.map(
              (item) => (
                <article
                  className="request-card"
                  key={item._id}
                >

                  <div className="request-user">

                    <div className="avatar">
                      {initials(
                        item.user?.name ||
                          'Student'
                      )}
                    </div>

                    <div className="request-user-info">

                      <b>
                        {item.user?.name ||
                          'Student'}
                      </b>

                      <small>
                        {item.user?.email ||
                          ''}
                      </small>

                      <small>
                        Rating:{' '}
                        {Number(
                          item.user?.rating || 0
                        ).toFixed(1)}
                      </small>

                      {item.user?.department && (
                        <small>
                          {item.user.department}
                          {item.user.year
                            ? ` · Year ${item.user.year}`
                            : ''}
                        </small>
                      )}

                    </div>

                  </div>


                  <div className="request-ride">

                    <b>
                      {item.ride?.source}
                      {' → '}
                      {item.ride?.destination}
                    </b>

                    <small>
                      {item.ride?.date
                        ? new Date(
                            item.ride.date
                          ).toLocaleDateString()
                        : ''}
                    </small>

                    <small>
                      Departure:{' '}
                      {item.ride
                        ?.departureTime ||
                        '--:--'}
                    </small>

                    <small>
                      {item.ride
                        ?.availableSeats ??
                        0}{' '}
                      seat(s) available
                    </small>

                  </div>


                  <div className="request-actions">

                    <span className={`request-status ${item.status.toLowerCase()}`}>
                      {item.status}
                    </span>

                    <button
                      className="primary-button"
                      disabled={
                        busyId === item._id ||
                        item.status !== 'PENDING'
                      }
                      onClick={() =>
                        processRequest(
                          item.ride._id,
                          item._id,
                          'accept'
                        )
                      }
                    >
                      {busyId === item._id
                        ? 'Processing...'
                        : 'Accept'}
                    </button>

                    <button
                      className="soft-button"
                      disabled={
                        busyId === item._id ||
                        item.status !== 'PENDING'
                      }
                      onClick={() =>
                        processRequest(
                          item.ride._id,
                          item._id,
                          'reject'
                        )
                      }
                    >
                      Reject
                    </button>

                  </div>

                </article>
              )
            )}

          </div>
        )}

      </section>


      {/* =================================================
          PENDING REQUESTS SENT BY CURRENT USER
      ================================================= */}

      {pending.length > 0 && (
        <section className="trip-section">

          <div className="section-heading">

            <div>
              <p className="eyebrow">
                REQUESTS SENT
              </p>

              <h2>
                Waiting for approval
              </h2>
            </div>

          </div>

          <div className="trip-list">

            {pending.map(
              (ride) => (
                <article
                  className="trip-item"
                  key={ride._id}
                >

                  <div>
                    <b>
                      {ride.source} to{' '}
                      {ride.destination}
                    </b>

                    <small>
                      {dateLabel(
                        ride.date
                      )}
                      {' · '}
                      {ride.departureTime}
                    </small>

                    <small>
                      Waiting for{' '}
                      {ride.creator?.name ||
                        'ride owner'}{' '}
                      to accept.
                    </small>
                  </div>

                  <span className="status pending-status">
                    PENDING
                  </span>

                </article>
              )
            )}

          </div>

        </section>
      )}


      {/* =================================================
          CREATED RIDES
      ================================================= */}

      <section className="trip-section">

        <div className="section-heading">

          <div>
            <p className="eyebrow">
              YOUR RIDES
            </p>

            <h2>
              Created rides
            </h2>
          </div>

        </div>

        <div className="trip-list">

          {created.map(
            (ride) => (
              <React.Fragment key={ride._id}>
                <article
                  className="trip-item"
                >

                <div>
                  <b>
                    {ride.source} to{' '}
                    {ride.destination}
                  </b>

                  <small>
                    {dateLabel(
                      ride.date
                    )}
                    {' · '}
                    {ride.departureTime}
                  </small>

                  <small>
                    {ride.currentPassengers || 0}
                    {' / '}
                    {ride.maxPassengers || 0}
                    {' passengers'}
                  </small>
                </div>

                <div className="trip-actions">
                  <span className="status verified-status">
                    {ride.status}
                  </span>

                  <button
                    className="soft-button"
                    onClick={() => setSelectedRideId(
                      selectedRideId === ride._id
                        ? ''
                        : ride._id
                    )}
                  >
                    {selectedRideId === ride._id
                      ? 'Hide requests'
                      : 'View requests'}
                  </button>
                </div>

                </article>

              {selectedRideId === ride._id && (
                <div className="ride-request-history">
                  <b>Requests for this ride</b>
                  {incomingRequests.filter(
                    (item) => String(item.ride?._id) === String(ride._id)
                  ).length === 0 ? (
                    <small>No requests yet.</small>
                  ) : (
                    incomingRequests
                      .filter((item) => String(item.ride?._id) === String(ride._id))
                      .map((item) => (
                        <div className="ride-request-row" key={item._id}>
                          <span>
                            <b>{item.user?.name || 'Student'}</b>
                            <small>{item.user?.email || ''}</small>
                          </span>
                          <span className={`request-status ${item.status.toLowerCase()}`}>
                            {item.status}
                          </span>
                          {item.status === 'PENDING' && (
                            <div className="request-actions">
                              <button className="primary-button" disabled={busyId === item._id} onClick={() => processRequest(ride._id, item._id, 'accept')}>
                                {busyId === item._id ? 'Processing...' : 'Accept'}
                              </button>
                              <button className="soft-button" disabled={busyId === item._id} onClick={() => processRequest(ride._id, item._id, 'reject')}>
                                Reject
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                  )}
                </div>
                )}
              </React.Fragment>
            )
          )}

        </div>

      </section>


      {/* =================================================
          JOINED RIDES
      ================================================= */}

      <section className="trip-section">

        <div className="section-heading">

          <div>
            <p className="eyebrow">
              JOINED RIDES
            </p>

            <h2>
              Rides you joined
            </h2>
          </div>

        </div>

        <div className="trip-list">

          {joined.map(
            (ride) => (
              <article
                className="trip-item"
                key={ride._id}
              >

                <div>
                  <b>
                    {ride.source} to{' '}
                    {ride.destination}
                  </b>

                  <small>
                    {dateLabel(
                      ride.date
                    )}
                    {' · '}
                    {ride.departureTime}
                  </small>

                  <small>
                    Driver:{' '}
                    {ride.creator?.name ||
                      'Unknown'}
                  </small>
                </div>

                <span className="status verified-status">
                  ACCEPTED
                </span>

              </article>
            )
          )}

        </div>

      </section>


      {!created.length &&
        !joined.length &&
        !pending.length &&
        !rejected.length &&
        !incomingRequests.length && (
          <div className="empty-state">

            <h3>
              No trips yet
            </h3>

            <p>
              Offer or join a ride to start
              building your commute history.
            </p>

          </div>
        )}

    </section>
  );
}


/* =========================================================
   STUDENT WORKSPACE
========================================================= */

export function StudentWorkspace({
  request,
  user,
  setUser,
  screen,
  setScreen,
  onMenu,
  onLogout,
  rides,
  setRides,
  notifications,
  setNotifications
}) {
  const token =
    localStorage.getItem(
      'campus-token'
    );

  const handleMessage =
    useCallback(() => {}, []);

  const handleNotification =
    useCallback(() => {
      request('/notifications')
        .then(
          ({
            notifications: items
          }) => {
            setNotifications(items);
          }
        )
        .catch(() => {});

      /*
       * Reload trips too, because a new join
       * request may have arrived.
       */
      request('/rides/mine')
        .then(setRides)
        .catch(() => {});
    }, [
      request,
      setNotifications,
      setRides
    ]);

  useCampusSocket(
    token,
    handleMessage,
    handleNotification
  );

  return (
    <>
      <button
        className="workspace-mobile-menu mobile-menu-button"
        onClick={onMenu}
        aria-label="Open navigation"
      >
        <Menu size={18} />
      </button>

      {screen === 'messages' && (
        <MessagesView
          request={request}
          rides={rides}
          token={token}
          user={user}
        />
      )}

      {screen === 'trips' && (
        <TripsView
          request={request}
          rides={rides}
          setRides={setRides}
        />
      )}

      {screen === 'notifications' && (
        <NotificationsView
          request={request}
          notifications={
            notifications
          }
          setNotifications={
            setNotifications
          }
          setScreen={setScreen}
        />
      )}

      {screen === 'profile' && (
        <ProfileView
          request={request}
          user={user}
          setUser={setUser}
        />
      )}

      {screen === 'settings' && (
        <SettingsView
          request={request}
          user={user}
          onLogout={onLogout}
        />
      )}

      <Assistant
        request={request}
      />
    </>
  );
}


/* =========================================================
   STUDENT APP
========================================================= */

function DashboardRideCard({ ride, requestState, onJoin }) {
  const isPending = requestState === 'PENDING';
  const isJoined = requestState === 'ACCEPTED';
  const isRejected = requestState === 'REJECTED';

  return (
    <article className="dashboard-ride-card ride-card">
      <div className="ride-card-top">
        <span className="match-pill">
          <Sparkles size={13} />
          {ride.matchScore || 90}% match
        </span>
        <span className="status verified-status">
          {ride.availableSeats} seats left
        </span>
      </div>

      <div className="route">
        <div className="route-line">
          <span />
          <i />
          <span />
        </div>
        <div>
          <b>{ride.source}</b>
          <small>{ride.departureTime}</small>
          <b>{ride.destination}</b>
        </div>
      </div>

      <div className="ride-meta">
        <span><CalendarDays size={14} />{new Date(ride.date).toLocaleDateString()}</span>
        <span><CarFront size={14} />{ride.vehicle?.model || 'Campus ride'}</span>
      </div>

      <div className="ride-footer">
        <div className="driver">
          <div className="avatar small">
            {initials(ride.creator?.name)}
          </div>
          <span>
            <b>{ride.creator?.name || 'Verified student'}</b>
            <small>
              {ride.creator?.department || 'Campus community'}
              {ride.creator?.year ? ` · Year ${ride.creator.year}` : ''}
            </small>
          </span>
        </div>

        <button
          className="join-button"
          disabled={!ride.availableSeats || isPending || isJoined}
          onClick={() => onJoin(ride._id)}
        >
          {isJoined
            ? 'Joined'
            : isPending
            ? 'Pending'
            : isRejected
            ? 'Request again'
            : ride.availableSeats
            ? 'Join ride'
            : 'Full'}
        </button>
      </div>
    </article>
  );
}

function DashboardRightRail({
  notifications,
  rides,
  onNotifications,
  onTrips
}) {
  const unread = notifications.filter((item) => !item.read).length;
  const pendingRequests = (rides.incomingRequests || []).filter(
    (item) => item.status === 'PENDING'
  ).length;

  return (
    <aside className="dashboard-rail">
      <section className="rail-panel notification-panel">
        <div className="rail-heading">
          <div>
            <p className="eyebrow">STAY IN THE LOOP</p>
            <h2>Notifications</h2>
          </div>
          <button className="link-button" onClick={onNotifications}>
            View all <ChevronRight size={15} />
          </button>
        </div>

        <div className="rail-notifications">
          {notifications.slice(0, 4).map((item) => (
            <button
              className={item.read ? 'rail-notification' : 'rail-notification unread'}
              key={item._id}
              onClick={onNotifications}
            >
              <span className="rail-notification-icon">
                {item.type === 'NEW_JOIN' ? <Users size={15} /> : <Bell size={15} />}
              </span>
              <span>
                <b>{item.title || 'Campus Commute update'}</b>
                <small>{item.message}</small>
              </span>
              {!item.read && <i />}
            </button>
          ))}
          {!notifications.length && (
            <p className="rail-empty">Your ride updates will appear here.</p>
          )}
        </div>
      </section>

      <section className="rail-panel stats-panel">
        <div className="rail-heading">
          <div>
            <p className="eyebrow">YOUR COMMUTE</p>
            <h2>Quick stats</h2>
          </div>
        </div>
        <div className="dashboard-stats">
          <div><CarFront size={17} /><strong>{rides.created?.length || 0}</strong><small>Created rides</small></div>
          <div><Users size={17} /><strong>{rides.joined?.length || 0}</strong><small>Joined rides</small></div>
          <div><Clock3 size={17} /><strong>{rides.pending?.length || 0}</strong><small>Pending requests</small></div>
          <div><Bell size={17} /><strong>{unread}</strong><small>Unread updates</small></div>
        </div>
      </section>

      <button className="rail-trip-prompt" onClick={onTrips}>
        <span className="rail-trip-icon"><MapPin size={19} /></span>
        <span><b>Ride together, go further.</b><small>{pendingRequests ? `${pendingRequests} request${pendingRequests === 1 ? '' : 's'} need your attention.` : 'Find a familiar face on your route.'}</small></span>
        <ChevronRight size={17} />
      </button>
    </aside>
  );
}

function StudentDashboard({
  user,
  items,
  rides,
  notifications,
  loading,
  query,
  destination,
  date,
  time,
  setQuery,
  setScreen,
  setCreate,
  setDestination,
  setDate,
  setTime,
  joiningId,
  joinMessage,
  onJoin,
  onProcessRequest,
  onMenu
}) {
  const pendingRideIds = new Set((rides.pending || []).map((ride) => ride._id));
  const joinedRideIds = new Set((rides.joined || []).map((ride) => ride._id));
  const rejectedRideIds = new Set((rides.rejected || []).map((ride) => ride._id));
  const requests = (rides.incomingRequests || []).filter((item) => item.status === 'PENDING');

  const requestState = (id) => {
    if (joinedRideIds.has(id)) return 'ACCEPTED';
    if (pendingRideIds.has(id)) return 'PENDING';
    if (rejectedRideIds.has(id)) return 'REJECTED';
    return '';
  };

  return (
    <>
      <header className="topbar">
        <button className="mobile-menu-button" onClick={onMenu} aria-label="Open navigation">
          <Menu size={18} />
        </button>
        <div className="search-box dashboard-search">
          <Search size={17} />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setScreen('search');
            }}
            placeholder="Search rides, destinations..."
          />
        </div>
        <div className="top-actions">
          <button className="icon-button" onClick={() => setScreen('notifications')} aria-label="Open notifications">
            <Bell size={19} />
            {notifications.some((item) => !item.read) && <span className="notification-dot" />}
          </button>
          <button className="top-user" onClick={() => setScreen('profile')}>
            <span className="avatar small">{initials(user.name)}</span>
            <span><b>{user.name}</b><small>Student</small></span>
            <ChevronRight size={15} />
          </button>
        </div>
      </header>

      <div className="dashboard-layout">
        <div className="dashboard-primary">
          <section className="dashboard-hero">
            <div>
              <p className="eyebrow">YOUR COMMUTE, SIMPLIFIED</p>
              <h1>Good morning,<br /><em>{user.name.split(' ')[0]}!</em></h1>
              <p>Find rides, travel together, save money, and make new friends on campus.</p>
            </div>
            <div className="hero-illustration" aria-hidden="true">
              <div className="hero-sun" />
              <div className="hero-cloud cloud-one" />
              <div className="hero-cloud cloud-two" />
              <div className="hero-campus"><span /><span /><span /></div>
              <CarFront size={58} className="hero-car" />
              <div className="hero-road" />
            </div>
          </section>

          <div className="dashboard-actions">
            <button className="dashboard-action action-purple" onClick={() => setScreen('search')}>
              <span><Search size={19} /></span><b>Find a ride</b><small>Search available rides</small><ChevronRight size={16} />
            </button>
            <button className="dashboard-action action-green" onClick={() => setCreate(true)}>
              <span><Plus size={21} /></span><b>Create ride</b><small>Offer a seat to others</small><ChevronRight size={16} />
            </button>
            <button className="dashboard-action action-blue" onClick={() => setScreen('trips')}>
              <span><CalendarDays size={19} /></span><b>My trips</b><small>View your rides</small><ChevronRight size={16} />
            </button>
          </div>

          <section className="ride-search-panel">
            <div className="section-heading compact-heading">
              <div><p className="eyebrow"><MapPin size={14} /> DISCOVER</p><h2>Find your ride</h2></div>
            </div>
            <div className="ride-search-fields">
              <label><small>From</small><span><MapPin size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Source location" /></span></label>
              <label><small>To</small><span><MapPin size={14} /><input value={destination} onChange={(event) => setDestination(event.target.value)} placeholder="Destination" /></span></label>
              <label><small>Date</small><span><CalendarDays size={14} /><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></span></label>
              <label><small>Time</small><span><Clock3 size={14} /><input type="time" value={time} onChange={(event) => setTime(event.target.value)} /></span></label>
              <button className="primary-button" onClick={() => setScreen('search')}><Search size={16} />Search</button>
            </div>
          </section>

          <section className="dashboard-rides-section">
            <div className="section-heading compact-heading">
              <div><p className="eyebrow"><CarFront size={14} /> AVAILABLE NOW</p><h2>Available rides</h2></div>
              <button className="link-button" onClick={() => setScreen('search')}>View all <ChevronRight size={15} /></button>
            </div>
            {joinMessage && <div className={joinMessage.type === 'success' ? 'success-box' : 'error-box'}>{joinMessage.text}</div>}
            <div className="dashboard-rides-grid">
              {loading && [1, 2, 3].map((item) => (
                <div className="dashboard-ride-skeleton" key={item}>
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
              ))}
              {!loading && items.slice(0, 3).map((ride) => (
                <DashboardRideCard
                  key={ride._id}
                  ride={ride}
                  requestState={requestState(ride._id)}
                  onJoin={onJoin}
                />
              ))}
              {!loading && !items.length && <div className="empty-state"><Search size={26} /><h3>No rides available</h3><p>Try another route or create a ride for your campus community.</p></div>}
            </div>
          </section>

          <div className="dashboard-lower-grid">
            <section className="dashboard-lower-card">
              <div className="section-heading compact-heading"><div><p className="eyebrow"><CalendarDays size={14} /> NEXT ON YOUR CALENDAR</p><h2>Your upcoming trip</h2></div><button className="link-button" onClick={() => setScreen('trips')}>View all <ChevronRight size={15} /></button></div>
              {rides.joined?.[0] ? (
                <div className="upcoming-trip"><div className="upcoming-route"><b>{rides.joined[0].source}</b><ChevronRight size={16} /><b>{rides.joined[0].destination}</b></div><small>{new Date(rides.joined[0].date).toLocaleDateString()} · {rides.joined[0].departureTime}</small><div className="upcoming-footer"><span><CarFront size={14} />{rides.joined[0].vehicle?.model || 'Campus ride'}</span><span className="status verified-status">Confirmed</span></div></div>
              ) : <div className="mini-empty">Join a ride to see your next trip here.</div>}
            </section>

            <section className="dashboard-lower-card">
              <div className="section-heading compact-heading"><div><p className="eyebrow"><Users size={14} /> FOR YOUR RIDES</p><h2>Pending requests</h2></div><button className="link-button" onClick={() => setScreen('trips')}>View all <ChevronRight size={15} /></button></div>
              <div className="pending-preview">
                {requests.slice(0, 3).map((item) => <div className="pending-row" key={item._id}><div className="avatar small">{initials(item.user?.name)}</div><span><b>{item.user?.name || 'Student'}</b><small>{item.ride?.source} → {item.ride?.destination}</small></span><button className="accept-mini" onClick={() => onProcessRequest(item.ride._id, item._id, 'accept')}>Accept</button><button className="reject-mini" onClick={() => onProcessRequest(item.ride._id, item._id, 'reject')}>Reject</button></div>)}
                {!requests.length && <div className="mini-empty">No pending requests right now.</div>}
              </div>
            </section>
          </div>
        </div>

        <DashboardRightRail notifications={notifications} rides={rides} onNotifications={() => setScreen('notifications')} onTrips={() => setScreen('trips')} />
      </div>
    </>
  );
}

export function StudentApp({
  request,
  user,
  setUser,
  onLogout
}) {
  const [screen, setScreen] =
    useState('home');

  const [rides, setRides] =
    useState({
      created: [],
      joined: [],
      pending: [],
      rejected: [],
      incomingRequests: []
    });

  const [items, setItems] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [notifications, setNotifications] =
    useState([]);

  const [query, setQuery] =
    useState('');

  const [destination, setDestination] =
    useState('');

  const [date, setDate] =
    useState('');

  const [time, setTime] =
    useState('');

  const [create, setCreate] =
    useState(false);

  const [joiningId, setJoiningId] =
    useState('');

  const load = useCallback(
    async () => {
      setLoading(true);
      try {
        const [
          rideData,
          notificationData,
          mineData
        ] = await Promise.all([
          request(
            `/rides?source=${encodeURIComponent(query)}&destination=${encodeURIComponent(destination)}&date=${encodeURIComponent(date)}&time=${encodeURIComponent(time)}`
          ),

          request(
            '/notifications'
          ),

          request(
            '/rides/mine'
          )
        ]);

        setItems(
          rideData.rides || []
        );

        setNotifications(
          notificationData.notifications ||
            []
        );

        setRides({
          created:
            mineData.created || [],

          joined:
            mineData.joined || [],

          pending:
            mineData.pending || [],

          rejected:
            mineData.rejected || [],

          incomingRequests:
            mineData.incomingRequests ||
            []
        });
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    },
    [date, destination, query, request, time]
  );

  useEffect(() => {
    load();
  }, [load]);

  const unread =
    notifications.filter(
      (item) => !item.read
    ).length;

  const pendingRideIds =
    new Set(
      (rides.pending || []).map(
        (ride) => ride._id
      )
    );

  const joinedRideIds =
    new Set(
      (rides.joined || []).map(
        (ride) => ride._id
      )
    );

  const rejectedRideIds =
    new Set(
      (rides.rejected || []).map(
        (ride) => ride._id
      )
    );

  const [joinMessage, setJoinMessage] =
    useState(null);

  const [mobileNav, setMobileNav] =
    useState(false);

  const [processingRequestId, setProcessingRequestId] =
    useState('');

  const nav = [
    [Home, 'home', 'Home'],
    [Search, 'search', 'Find a ride'],
    [CalendarDays, 'trips', 'My trips'],
    [Plus, 'create', 'Create ride'],
    [MessageCircle, 'messages', 'Messages'],
    [Bell, 'notifications', 'Notifications'],
    [UserRound, 'profile', 'Profile'],
    [Settings, 'settings', 'Settings']
  ];

  const join = async (id) => {
    if (
      joiningId ||
      pendingRideIds.has(id) ||
      joinedRideIds.has(id)
    ) return;

    setJoiningId(id);
    setJoinMessage(null);

    try {
      await request(
        `/rides/${id}/join`,
        {
          method: 'POST'
        }
      );

      await load();

      setJoinMessage({
        type: 'success',
        text: 'Request sent. You will see “Joined” here when the ride creator accepts.'
      });
    } catch (error) {
      setJoinMessage({
        type: 'error',
        text: error.status === 409
          ? `This ride already has a request: ${error.message}`
          : error.message
      });
    } finally {
      setJoiningId('');
    }
  };

  const processRequest = async (rideId, requestId, action) => {
    if (processingRequestId) return;

    setProcessingRequestId(requestId);
    try {
      await request(
        `/rides/${rideId}/requests/${requestId}/${action}`,
        { method: 'POST' }
      );
      await load();
    } catch (error) {
      setJoinMessage({
        type: 'error',
        text: error.status === 409
          ? 'This request was already updated.'
          : 'Unable to update this request right now.'
      });
    } finally {
      setProcessingRequestId('');
    }
  };

  return (
    <div className="app-shell">

      <aside className={mobileNav ? 'sidebar open' : 'sidebar'}>

        <div className="brand">
          <img
            src="/campus-commute-logo.png"
            alt="Campus Commute"
            className="campus-logo"
          />

          <span>
            Campus <b>Commute</b>
          </span>
        </div>

        <p className="nav-label">
          WORKSPACE
        </p>

        <nav>
          {nav
            .slice(0, 5)
            .map(
              ([Icon, value, label]) => (
                <button
                  className={
                    screen === value
                      ? 'nav-item active'
                      : 'nav-item'
                  }
                  key={value}
                  onClick={() => {
                    if (value === 'create') {
                      setCreate(true);
                    } else {
                      setScreen(value);
                    }
                    setMobileNav(false);
                  }}
                >
                  <Icon size={19} />

                  {label}

                  {value ===
                    'messages' &&
                    unread > 0 && (
                      <span className="nav-count">
                        {unread}
                      </span>
                    )}
                </button>
              )
            )}
        </nav>

        <p className="nav-label second">
          ACCOUNT
        </p>

        <nav>
          {nav
            .slice(5)
            .map(
              ([Icon, value, label]) => (
                <button
                  className={
                    screen === value
                      ? 'nav-item active'
                      : 'nav-item'
                  }
                  key={value}
                  onClick={() => {
                    setScreen(value);
                    setMobileNav(false);
                  }}
                >
                  <Icon size={19} />

                  {label}

                  {value ===
                    'notifications' &&
                    unread > 0 && (
                      <span className="nav-count">
                        {unread}
                      </span>
                    )}
                </button>
              )
            )}
        </nav>

        <div className="sidebar-bottom">

          <div className="mini-profile">

            <div className="avatar">
              {initials(user.name)}
            </div>

            <div>
              <b>
                {user.name}
              </b>

              <small>
                Student account
              </small>
            </div>

            <button
              onClick={onLogout}
              title="Log out"
            >
              <LogOut size={17} />
            </button>

          </div>

        </div>

      </aside>


      <main className="main-content">

        {screen === 'home' ||
        screen === 'search' ? (
          <>
          <StudentDashboard
            user={user}
            items={items}
            rides={rides}
            notifications={notifications}
            loading={loading}
            query={query}
            destination={destination}
            date={date}
            time={time}
            setQuery={setQuery}
            setDestination={setDestination}
            setDate={setDate}
            setTime={setTime}
            setScreen={setScreen}
            setCreate={setCreate}
            joiningId={joiningId}
            joinMessage={joinMessage}
            onJoin={join}
            onProcessRequest={processRequest}
            onMenu={() => setMobileNav(true)}
          />
          {false && (
          <>

            <header className="topbar">

              <div className="search-box">

                <input
                  value={query}
                  onChange={(event) => {
                    setQuery(
                      event.target.value
                    );

                    setScreen(
                      'search'
                    );
                  }}
                  placeholder="Search routes, destinations..."
                />

              </div>

              <div className="top-actions">

                <button
                  className="icon-button"
                  onClick={() =>
                    setScreen(
                      'notifications'
                    )
                  }
                >
                  <Bell size={19} />

                  {unread > 0 && (
                    <span className="notification-dot" />
                  )}
                </button>

                <button
                  className="top-user"
                  onClick={() =>
                    setScreen(
                      'profile'
                    )
                  }
                >
                  <span className="avatar small">
                    {initials(
                      user.name
                    )}
                  </span>

                  {user.name}
                </button>

              </div>

            </header>


            <section className="welcome-row">

              <div>

                <p className="eyebrow">
                  {screen === 'home'
                    ? 'YOUR COMMUTE, SIMPLIFIED'
                    : 'DISCOVER YOUR ROUTE'}
                </p>

                <h1>
                  {screen === 'home'
                    ? (
                      <>
                        Good morning,{' '}
                        <em>
                          {
                            user.name.split(
                              ' '
                            )[0]
                          }
                          .
                        </em>
                      </>
                    )
                    : (
                      <>
                        Find your{' '}
                        <em>
                          next ride.
                        </em>
                      </>
                    )}
                </h1>

                <p className="muted">
                  {screen === 'home'
                    ? 'Find a familiar face on the way to campus.'
                    : 'Search real rides shared by verified students.'}
                </p>

              </div>

              <button
                className="primary-button"
                onClick={() =>
                  setCreate(true)
                }
              >
                Offer a ride
              </button>

            </section>


            <section className="rides-section">

              {joinMessage && (
                <div className={joinMessage.type === 'success' ? 'success-box' : 'error-box'}>
                  {joinMessage.text}
                </div>
              )}

              <div className="section-heading">

                <div>

                  <p className="eyebrow">
                    {query
                      ? 'MATCHING RIDES'
                      : 'RECOMMENDED FOR YOU'}
                  </p>

                  <h2>
                    {items.length}{' '}
                    rides available
                  </h2>

                </div>

              </div>


              <div className="rides-grid">

                {items.map(
                  (ride) => {
                    const isPending =
                      pendingRideIds.has(
                        ride._id
                      );

                    const isJoined =
                      joinedRideIds.has(
                        ride._id
                      );

                    const wasRejected =
                      rejectedRideIds.has(
                        ride._id
                      );

                    return (
                      <article
                        className="ride-card"
                        key={ride._id}
                      >

                        <div className="ride-card-top">

                          <span className="match-pill">
                            {ride.matchScore ||
                              90}
                            % Match
                          </span>

                          <span className="status verified-status">
                            {
                              ride.availableSeats
                            }{' '}
                            seats
                          </span>

                        </div>


                        <div className="route">

                          <div className="route-line">
                            <span />
                            <i />
                            <span />
                          </div>

                          <div>

                            <b>
                              {ride.source}
                            </b>

                            <small>
                              {
                                ride.departureTime
                              }
                            </small>

                            <b>
                              {
                                ride.destination
                              }
                            </b>

                          </div>

                        </div>


                        <div className="ride-meta">

                          <span>
                            {new Date(
                              ride.date
                            ).toLocaleDateString()}
                          </span>

                          <span>
                            {ride.vehicle
                              ?.model ||
                              'Campus ride'}
                          </span>

                        </div>


                        <div className="ride-footer">

                          <div className="driver">

                            <div className="avatar small">
                              {initials(
                                ride.creator
                                  ?.name
                              )}
                            </div>

                            <span>

                              <b>
                                {ride.creator
                                  ?.name ||
                                  'Verified student'}
                              </b>

                              <small>
                                Rating{' '}
                                {ride.creator
                                  ?.rating?.toFixed?.(
                                    1
                                  ) ||
                                  '0.0'}
                              </small>

                            </span>

                          </div>


                          <button
                            className="join-button"
                            disabled={
                              !ride.availableSeats ||
                              isPending ||
                              isJoined ||
                              joiningId ===
                                ride._id
                            }
                            onClick={() =>
                              join(
                                ride._id
                              )
                            }
                          >
                            {isJoined
                              ? 'Joined'
                              : isPending
                              ? 'Request Pending'
                              : joiningId ===
                                ride._id
                              ? 'Sending...'
                              : ride.availableSeats
                              ? wasRejected
                                ? 'Request again'
                                : 'Join Ride'
                              : 'Full'}
                          </button>

                        </div>

                      </article>
                    );
                  }
                )}

                {!items.length && (
                  <div className="empty-state">

                    <h3>
                      No rides found
                    </h3>

                    <p>
                      Try another route
                      or offer a ride
                      for your campus
                      community.
                    </p>

                  </div>
                )}

              </div>

            </section>

          </>
          )}
          </>
        ) : (
          <StudentWorkspace
            request={request}
            user={user}
            setUser={setUser}
            screen={screen}
            setScreen={setScreen}
            onMenu={() => setMobileNav(true)}
            onLogout={onLogout}
            rides={rides}
            setRides={setRides}
            notifications={
              notifications
            }
            setNotifications={
              setNotifications
            }
          />
        )}

      </main>


      {create && (
        <CreateRideForm
          request={request}
          onClose={() =>
            setCreate(false)
          }
          onCreated={() => {
            setCreate(false);
            load();
          }}
        />
      )}

    </div>
  );
}


/* =========================================================
   CREATE RIDE
========================================================= */

function CreateRideForm({
  request,
  onClose,
  onCreated
}) {
  const [form, setForm] =
    useState({
      source: '',
      destination: '',
      date: '',
      departureTime: '',
      maxPassengers: 2,

      vehicle: {
        model: 'Campus ride',
        type: 'Car',
        capacity: 4
      },

      notes: ''
    });

  const [error, setError] =
    useState('');

  const submit = async (
    event
  ) => {
    event.preventDefault();

    setError('');

    try {
      await request(
        '/rides',
        {
          method: 'POST',
          body: JSON.stringify(
            form
          )
        }
      );

      onCreated();
    } catch (error) {
      setError(
        error.message
      );
    }
  };

  return (
    <div className="modal-backdrop">

      <form
        className="modal ride-form"
        onSubmit={submit}
      >

        <div className="modal-head">

          <div>

            <p className="eyebrow">
              OFFER A RIDE
            </p>

            <h2>
              Make space for someone.
            </h2>

          </div>

          <button
            type="button"
            className="icon-button"
            onClick={onClose}
          >
            <X />
          </button>

        </div>


        <label>
          Pickup location

          <input
            required
            value={form.source}
            onChange={(e) =>
              setForm({
                ...form,
                source:
                  e.target.value
              })
            }
          />
        </label>


        <label>
          Destination

          <input
            required
            value={
              form.destination
            }
            onChange={(e) =>
              setForm({
                ...form,
                destination:
                  e.target.value
              })
            }
          />
        </label>


        <div className="form-grid">

          <label>
            Date

            <input
              type="date"
              required
              value={form.date}
              onChange={(e) =>
                setForm({
                  ...form,
                  date:
                    e.target.value
                })
              }
            />
          </label>

          <label>
            Departure time

            <input
              type="time"
              required
              value={
                form.departureTime
              }
              onChange={(e) =>
                setForm({
                  ...form,
                  departureTime:
                    e.target.value
                })
              }
            />
          </label>

        </div>


        <label>
          Seats offered

          <input
            type="number"
            min="1"
            max="20"
            required
            value={
              form.maxPassengers
            }
            onChange={(e) =>
              setForm({
                ...form,
                maxPassengers:
                  Number(
                    e.target.value
                  )
              })
            }
          />
        </label>


        {error && (
          <div className="error-box">
            {error}
          </div>
        )}


        <button className="primary-button">
          <Send size={16} />
          Publish ride
        </button>

      </form>

    </div>
  );
}


/* =========================================================
   ADMIN TOOLS
========================================================= */

export function AdminTools({
  request,
  section,
  onBack
}) {
  const [items, setItems] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const load = () => {
    setLoading(true);
    setError('');

    const path =
      section === 'rides'
        ? '/admin/rides'
        : section === 'reports'
        ? '/admin/reports'
        : '/admin/audit-logs';

    request(path)
      .then(
        (data) =>
          setItems(
            data.rides ||
              data.reports ||
              data.logs ||
              []
          )
      )
      .catch((error) =>
        setError(
          error.message
        )
      )
      .finally(() =>
        setLoading(false)
      );
  };

  useEffect(
    load,
    [section]
  );

  const action = async (
    id,
    status
  ) => {
    try {
      await request(
        `/admin/reports/${id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            status
          })
        }
      );

      load();
    } catch (error) {
      setError(
        error.message
      );
    }
  };

  return (
    <main className="admin-main">

      <header className="admin-header">

        <div>

          <button
            className="link-button admin-back"
            onClick={onBack}
          >
            <ChevronLeft size={16} />
            Overview
          </button>

          <p className="eyebrow">
            ADMIN OPERATIONS
          </p>

          <h1>
            {section ===
            'rides' ? (
              <>
                All <em>rides.</em>
              </>
            ) : section ===
              'reports' ? (
              <>
                Community{' '}
                <em>reports.</em>
              </>
            ) : (
              <>
                Audit <em>logs.</em>
              </>
            )}
          </h1>

          <p className="muted">
            Review live platform records
            and take authorized action.
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
        ) : !items.length ? (
          <div className="empty-admin">
            No records found.
          </div>
        ) : (
          items.map(
            (item) => (
              <article
                className="admin-record"
                key={item._id}
              >

                <div>

                  <b>
                    {section ===
                    'rides'
                      ? `${item.source} to ${item.destination}`
                      : section ===
                        'reports'
                      ? item.reason
                      : item.action}
                  </b>

                  <small>
                    {section ===
                    'rides'
                      ? `${item.creator?.name || 'Unknown creator'} · ${item.status}`
                      : section ===
                        'reports'
                      ? `${item.reporter?.name || 'Unknown reporter'} · ${item.status}`
                      : `${item.admin?.name || 'Unknown admin'} · ${item.target || 'System'}`}
                  </small>

                </div>


                {section ===
                  'rides' &&
                  item.status !==
                    'CANCELLED' && (
                    <button
                      className="soft-button"
                      onClick={() =>
                        request(
                          `/admin/rides/${item._id}/cancel`,
                          {
                            method:
                              'PATCH'
                          }
                        )
                          .then(load)
                          .catch(
                            (error) =>
                              setError(
                                error.message
                              )
                          )
                      }
                    >
                      Cancel ride
                    </button>
                  )}


                {section ===
                  'reports' && (
                  <select
                    value={
                      item.status
                    }
                    onChange={(e) =>
                      action(
                        item._id,
                        e.target.value
                      )
                    }
                  >
                    <option>
                      OPEN
                    </option>

                    <option>
                      REVIEWING
                    </option>

                    <option>
                      RESOLVED
                    </option>
                  </select>
                )}


                <small>
                  {dateLabel(
                    item.createdAt
                  )}
                </small>

              </article>
            )
          )
        )}

      </section>

    </main>
  );
}
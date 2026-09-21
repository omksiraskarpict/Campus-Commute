import React, {
  useEffect,
  useRef,
  useState
} from 'react';

import {
  PublicClientApplication
} from '@azure/msal-browser';

import {
  createRoot
} from 'react-dom/client';

import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate
} from 'react-router-dom';

import {
  Activity,
  AlertTriangle,
  Bell,
  CalendarDays,
  CarFront,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Compass,
  Database,
  Filter,
  Home,
  LogOut,
  MapPin,
  Menu,
  MessageCircle,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
  X
} from 'lucide-react';

import './styles.css';

import {
  AdminTools,
  StudentApp
} from './features.jsx';

import {
  AdminRoutes
} from './admin/routes/AdminRoutes.jsx';


/* =========================================================
   API
   ========================================================= */

const API =
  import.meta.env.VITE_API_URL ||
  (
    import.meta.env.DEV
      ? 'http://localhost:5000/api'
      : 'https://campus-commute.onrender.com/api'
  );


const getToken = () =>
  localStorage.getItem('campus-token');


async function request(path, options = {}) {
  let response;

  try {
    response = await fetch(
      `${API}${path}`,
      {
        ...options,

        headers: {
          'Content-Type': 'application/json',

          ...(getToken()
            ? {
                Authorization:
                  `Bearer ${getToken()}`
              }
            : {}),

          ...options.headers
        }
      }
    );
  } catch {
    throw new Error(
      'API unavailable. Start the server with npm run dev, then check port 5000.'
    );
  }

  const body =
    await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(
      body.message ||
      body.error ||
      'Request failed'
    );

    error.status = response.status;

    throw error;
  }

  return body;
}


/* =========================================================
   GOOGLE IDENTITY SERVICES
   ========================================================= */

const GOOGLE_SCRIPT_ID =
  'google-gsi-script';


/*
 * Google Identity Services should only be
 * initialized once for a client ID.
 */
const googleInitializedClients =
  new Set();


/*
 * Prevent loading the same Google script
 * multiple times.
 */
const googleScriptPromise =
  new Map();


function loadGoogleIdentityScript() {
  if (
    window.google?.accounts?.id
  ) {
    return Promise.resolve();
  }


  if (
    googleScriptPromise.has(
      GOOGLE_SCRIPT_ID
    )
  ) {
    return googleScriptPromise.get(
      GOOGLE_SCRIPT_ID
    );
  }


  const promise =
    new Promise((resolve, reject) => {

      const existing =
        document.getElementById(
          GOOGLE_SCRIPT_ID
        );


      if (existing) {

        if (
          window.google?.accounts?.id
        ) {
          resolve();
          return;
        }


        existing.addEventListener(
          'load',
          () => resolve(),
          { once: true }
        );


        existing.addEventListener(
          'error',
          () =>
            reject(
              new Error(
                'Unable to load Google Sign-In.'
              )
            ),
          { once: true }
        );


        return;
      }


      const script =
        document.createElement('script');


      script.id =
        GOOGLE_SCRIPT_ID;


      script.src =
        'https://accounts.google.com/gsi/client';


      script.async = true;

      script.defer = true;


      script.onload = () =>
        resolve();


      script.onerror = () =>
        reject(
          new Error(
            'Unable to load Google Sign-In.'
          )
        );


      document.head.appendChild(
        script
      );

    });


  googleScriptPromise.set(
    GOOGLE_SCRIPT_ID,
    promise
  );


  return promise;
}


/* =========================================================
   APP
   ========================================================= */

function App() {

  const [user, setUser] =
    useState(null);


  const [screen, setScreen] =
    useState('home');


  const [authMode, setAuthMode] =
    useState('login');


  const [showCreate, setShowCreate] =
    useState(false);


  const [loading, setLoading] =
    useState(true);


  useEffect(() => {

    const token =
      getToken();


    if (!token) {

      setLoading(false);

      return;
    }


    request('/auth/me')

      .then(
        ({ user: account }) =>
          setUser(account)
      )

      .catch(() => {

        localStorage.removeItem(
          'campus-token'
        );

        setUser(null);

      })

      .finally(() =>
        setLoading(false)
      );

  }, []);


  const logout = () => {

    localStorage.removeItem(
      'campus-token'
    );

    setUser(null);

    setScreen('home');

    setAuthMode('login');

  };


  const requireUser = (element) =>
    user
      ? element
      : (
          <Navigate
            to="/login"
            replace
          />
        );


  if (loading) {

    return (

      <div className="loading-screen">

        <div className="logo-mark">
          CC
        </div>

        <span>
          Getting your commute ready...
        </span>

      </div>

    );
  }


  return (

    <Routes>

      {/* =====================================================
          HOME
          ===================================================== */}

      <Route
        path="/"
        element={

          !user

            ? (
                authMode === 'welcome'

                  ? (
                      <Welcome
                        onStart={() =>
                          setAuthMode(
                            'login'
                          )
                        }
                      />
                    )

                  : (
                      <Auth
                        mode={authMode}
                        onMode={setAuthMode}
                        onLogin={setUser}
                      />
                    )
              )

            : (

                user.role === 'ADMIN'

                  ? (
                      <Navigate
                        to="/admin/dashboard"
                        replace
                      />
                    )

                  : (
                      <Navigate
                        to="/dashboard"
                        replace
                      />
                    )

              )

        }
      />


      {/* =====================================================
          LOGIN
          ===================================================== */}

      <Route
        path="/login"
        element={

          user

            ? (
                user.role === 'ADMIN'

                  ? (
                      <Navigate
                        to="/admin/dashboard"
                        replace
                      />
                    )

                  : (
                      <Navigate
                        to="/dashboard"
                        replace
                      />
                    )
              )

            : (
                <Auth
                  mode="login"
                  onMode={setAuthMode}
                  onLogin={setUser}
                />
              )

        }
      />


      {/* =====================================================
          REGISTER
          ===================================================== */}

      <Route
        path="/register"
        element={

          user

            ? (
                user.role === 'ADMIN'

                  ? (
                      <Navigate
                        to="/admin/dashboard"
                        replace
                      />
                    )

                  : (
                      <Navigate
                        to="/dashboard"
                        replace
                      />
                    )
              )

            : (
                <Auth
                  mode="register"
                  onMode={setAuthMode}
                  onLogin={setUser}
                />
              )

        }
      />


      {/* =====================================================
          STUDENT DASHBOARD
          ===================================================== */}

      <Route
        path="/dashboard"
        element={

          requireUser(

            <StudentApp
              request={request}
              user={user}
              setUser={setUser}
              onLogout={logout}
            />

          )

        }
      />


      <Route
        path="/rides"
        element={

          requireUser(

            <StudentApp
              request={request}
              user={user}
              setUser={setUser}
              onLogout={logout}
            />

          )

        }
      />


      <Route
        path="/bookings"
        element={

          requireUser(

            <StudentApp
              request={request}
              user={user}
              setUser={setUser}
              onLogout={logout}
            />

          )

        }
      />


      <Route
        path="/chat"
        element={

          requireUser(

            <StudentApp
              request={request}
              user={user}
              setUser={setUser}
              onLogout={logout}
            />

          )

        }
      />


      <Route
        path="/profile"
        element={

          requireUser(

            <StudentApp
              request={request}
              user={user}
              setUser={setUser}
              onLogout={logout}
            />

          )

        }
      />


      {/* =====================================================
          ADMIN
          ===================================================== */}

      <Route
        path="/admin/*"
        element={

          <AdminRoutes
            user={user}
            setUser={setUser}
            onLogout={logout}
            request={request}
          />

        }
      />


      {/* =====================================================
          FALLBACK
          ===================================================== */}

      <Route
        path="*"
        element={

          <Navigate
            to={
              user

                ? (
                    user.role === 'ADMIN'
                      ? '/admin/dashboard'
                      : '/dashboard'
                  )

                : '/'
            }
            replace
          />

        }
      />

    </Routes>

  );
}


/* =========================================================
   WELCOME
   ========================================================= */

function Welcome({
  onStart
}) {

  return (

    <main className="welcome">

      <div className="welcome-nav">

        <div className="brand">

          <span className="logo-mark">
            CC
          </span>

          <span>
            Campus <b>Commute</b>
          </span>

        </div>


        <button
          className="text-button"
          onClick={onStart}
        >
          Sign in
          <ChevronRight size={16} />
        </button>

      </div>


      <section className="hero">

        <div className="hero-copy">

          <p className="eyebrow">

            <Sparkles size={15} />

            Built for campus life

          </p>


          <h1>

            Better rides.

            <br />

            <em>
              Closer community.
            </em>

          </h1>


          <p className="hero-subtitle">

            Find your people on the way
            to class. Share a seat, split
            the cost, and make every
            commute feel a little lighter.

          </p>


          <button
            className="primary-button"
            onClick={onStart}
          >

            Start commuting

            <ChevronRight size={18} />

          </button>


          <div className="hero-proof">

            <div className="avatar-stack">

              <span>AR</span>
              <span>NS</span>
              <span>MK</span>
              <span>+</span>

            </div>


            <p>

              <strong>
                2,400+
              </strong>

              <br />

              students already moving
              together

            </p>

          </div>

        </div>


        <div className="hero-art">

          <div className="art-sun"></div>

          <div className="art-route route-one"></div>

          <div className="art-route route-two"></div>


          <div className="art-card">

            <MapPin size={18} />

            <span>
              PICT Main Gate
            </span>

            <b>
              8:10 AM
            </b>

          </div>


          <div className="art-car">

            <CarFront
              size={82}
              strokeWidth={1.2}
            />

          </div>


          <div className="art-note">

            <ShieldCheck size={19} />

            <div>

              <b>
                Verified students
              </b>

              <small>
                Travel with confidence
              </small>

            </div>

          </div>

        </div>

      </section>

    </main>

  );
}


/* =========================================================
   AUTH
   ========================================================= */

function Auth({
  mode,
  onMode,
  onLogin
}) {

  const navigate =
    useNavigate();


  const location =
    useLocation();


  const [form, setForm] =
    useState({
      name: '',
      email: '',
      password: ''
    });


  const [
    confirmPassword,
    setConfirmPassword
  ] = useState('');


  const [error, setError] =
    useState('');


  const [busy, setBusy] =
    useState(false);


  const [
    socialBusy,
    setSocialBusy
  ] = useState({
    google: false,
    microsoft: false
  });


  const [
    msalInstance,
    setMsalInstance
  ] = useState(null);


  const googleClientId =
    import.meta.env
      .VITE_GOOGLE_CLIENT_ID ||
    '';


  const microsoftClientId =
    import.meta.env
      .VITE_MICROSOFT_CLIENT_ID ||
    '';


  const formRef =
    useRef(form);


  useEffect(() => {

    formRef.current =
      form;

  }, [form]);


  const googleProcessingRef =
    useRef(false);


  /* -------------------------------------------------------
     LOGIN FINALIZATION
     ------------------------------------------------------- */

  const finalizeLogin =
    (data) => {

      if (
        !data?.token ||
        !data?.user
      ) {

        throw new Error(
          'Login response is incomplete.'
        );

      }


      localStorage.setItem(
        'campus-token',
        data.token
      );


      onLogin(
        data.user
      );

    };


  /* -------------------------------------------------------
     PROVIDER LOGIN
     ------------------------------------------------------- */

  const handleProviderLogin =
    async (
      provider,
      credential,
      displayName
    ) => {

      const providerName =
        provider === 'google'
          ? 'Google'
          : 'Microsoft';


      setError('');


      const providerId =
        provider === 'google'
          ? googleClientId
          : microsoftClientId;


      if (!providerId) {

        setError(
          `${providerName} sign-in is not configured yet.`
        );

        return;

      }


      if (
        !credential ||
        typeof credential !== 'string'
      ) {

        setError(
          `${providerName} did not return a valid identity credential.`
        );

        return;

      }


      try {

        setSocialBusy(
          (current) => ({
            ...current,
            [provider]: true
          })
        );


        const currentForm =
          formRef.current;


        const fallbackName =
          currentForm.name ||
          currentForm.email
            ?.split('@')[0] ||
          'Campus User';


        const data =
          await request(
            `/auth/${provider}`,
            {
              method: 'POST',

              body:
                JSON.stringify({
                  credential,

                  name:
                    displayName ||
                    fallbackName
                })
            }
          );


        finalizeLogin(data);

      } catch (e) {

        setError(
          e.message ||
          `${providerName} sign-in failed. Please try again.`
        );

      } finally {

        setSocialBusy(
          (current) => ({
            ...current,
            [provider]: false
          })
        );

      }

    };


  /* -------------------------------------------------------
     GOOGLE INITIALIZATION
     ------------------------------------------------------- */

  useEffect(() => {

    if (!googleClientId) {
      return undefined;
    }


    let cancelled = false;


    const initializeGoogle =
      async () => {

        try {

          await loadGoogleIdentityScript();


          if (cancelled) {
            return;
          }


          if (
            !window.google?.accounts?.id
          ) {

            throw new Error(
              'Google Sign-In could not be initialized.'
            );

          }


          /*
           * Initialize Google only once
           * for this client ID.
           */

          if (
            googleInitializedClients.has(
              googleClientId
            )
          ) {

            return;

          }


          window.google.accounts.id.initialize({

            client_id:
              googleClientId,


            callback:
              async (response) => {

                if (
                  !response?.credential
                ) {

                  setError(
                    'Google did not return a valid identity credential.'
                  );

                  return;

                }


                if (
                  googleProcessingRef.current
                ) {

                  return;

                }


                googleProcessingRef.current =
                  true;


                try {

                  const currentForm =
                    formRef.current;


                  const displayName =
                    currentForm.name ||
                    currentForm.email
                      ?.split('@')[0] ||
                    '';


                  await handleProviderLogin(
                    'google',
                    response.credential,
                    displayName
                  );

                } finally {

                  googleProcessingRef.current =
                    false;

                }

              },


            auto_select:
              false,


            cancel_on_tap_outside:
              true

          });


          googleInitializedClients.add(
            googleClientId
          );

        } catch (e) {

          if (!cancelled) {

            console.error(
              '[Google Sign-In]',
              e
            );


            setError(
              e.message ||
              'Google sign-in could not be initialized.'
            );

          }

        }

      };


    initializeGoogle();


    return () => {
      cancelled = true;
    };

  }, [googleClientId]);


  /* -------------------------------------------------------
     MICROSOFT INITIALIZATION
     ------------------------------------------------------- */

  useEffect(() => {

    if (!microsoftClientId) {
      return;
    }


    const instance =
      new PublicClientApplication({

        auth: {

          clientId:
            microsoftClientId,

          authority:
            'https://login.microsoftonline.com/common',

          redirectUri:
            window.location.origin

        },

        cache: {

          cacheLocation:
            'sessionStorage',

          storeAuthStateInCookie:
            false

        }

      });


    setMsalInstance(
      instance
    );

  }, [microsoftClientId]);


  /* -------------------------------------------------------
     EMAIL / PASSWORD LOGIN
     ------------------------------------------------------- */

  const submit =
    async (event) => {

      event.preventDefault();


      if (busy) {
        return;
      }


      setBusy(true);

      setError('');


      if (
        mode === 'register' &&
        form.password !==
          confirmPassword
      ) {

        setError(
          'Passwords do not match.'
        );

        setBusy(false);

        return;

      }


      try {

        const data =
          await request(
            `/auth/${
              mode === 'login'
                ? 'login'
                : 'register'
            }`,
            {
              method: 'POST',

              body:
                JSON.stringify(form)
            }
          );


        if (
          mode === 'register'
        ) {

          localStorage.removeItem(
            'campus-token'
          );


          navigate(
            '/login',
            {
              replace: true,

              state: {
                registrationSuccess:
                  true
              }
            }
          );


          return;

        }


        finalizeLogin(
          data
        );

      } catch (e) {

        setError(
          e.message ||
          'Authentication failed.'
        );

      } finally {

        setBusy(false);

      }

    };


  /* -------------------------------------------------------
     GOOGLE BUTTON
     ------------------------------------------------------- */

  const handleGoogleClick =
    () => {

      if (!googleClientId) {

        setError(
          'Google sign-in is not configured yet.'
        );

        return;

      }


      if (
        !window.google?.accounts?.id
      ) {

        setError(
          'Google Sign-In is still loading. Please try again.'
        );

        return;

      }


      if (
        socialBusy.google
      ) {

        return;

      }


      setError('');


      /*
       * IMPORTANT:
       *
       * Do not pass the old notification
       * callback here.
       *
       * The old callback used:
       *
       * notification.isNotDisplayed()
       * notification.isSkippedMoment()
       *
       * Those status APIs can trigger the
       * FedCM migration warning.
       *
       * Calling prompt() without the callback
       * avoids that warning.
       */

      try {

        window.google.accounts.id.prompt();

      } catch (e) {

        console.error(
          '[Google Sign-In]',
          e
        );


        setError(
          e.message ||
          'Google sign-in could not be started.'
        );

      }

    };


  /* -------------------------------------------------------
     MICROSOFT BUTTON
     ------------------------------------------------------- */

  const handleMicrosoftClick =
    async () => {

      if (
        !microsoftClientId ||
        !msalInstance
      ) {

        setError(
          'Microsoft sign-in is not configured yet.'
        );

        return;

      }


      if (
        socialBusy.microsoft
      ) {

        return;

      }


      try {

        setError('');


        setSocialBusy(
          (current) => ({
            ...current,
            microsoft: true
          })
        );


        const result =
          await msalInstance.loginPopup({

            scopes: [
              'openid',
              'profile',
              'email',
              'User.Read'
            ]

          });


        if (
          !result?.idToken
        ) {

          throw new Error(
            'Microsoft sign-in failed. Please try again.'
          );

        }


        const currentForm =
          formRef.current;


        const displayName =
          currentForm.name ||
          currentForm.email
            ?.split('@')[0] ||
          '';


        await handleProviderLogin(
          'microsoft',
          result.idToken,
          displayName
        );

      } catch (e) {

        setError(
          e.message ||
          'Microsoft sign-in failed. Please try again.'
        );

      } finally {

        setSocialBusy(
          (current) => ({
            ...current,
            microsoft: false
          })
        );

      }

    };


  const registrationSuccess =
    mode === 'login' &&
    location.state
      ?.registrationSuccess;


  return (

    <main className="auth-page">

      <div className="auth-visual">

        <div className="brand light">

          <span className="logo-mark">
            CC
          </span>

          <span>
            Campus <b>Commute</b>
          </span>

        </div>


        <div className="auth-message">

          <p className="eyebrow">
            YOUR CAMPUS, CONNECTED
          </p>


          <h1>

            Go together.

            <br />

            <em>
              Go further.
            </em>

          </h1>


          <p>

            Simple, safe,
            student-powered rides
            for the moments between
            where you are and where
            you need to be.

          </p>

        </div>


        <div className="auth-orbit orbit-one"></div>

        <div className="auth-orbit orbit-two"></div>

      </div>


      <div className="auth-panel">

        <button
          type="button"
          className="mobile-brand brand"
          onClick={() =>
            onMode('welcome')
          }
        >

          <span className="logo-mark">
            CC
          </span>

          <span>
            Campus <b>Commute</b>
          </span>

        </button>


        <div className="auth-heading">

          <p className="eyebrow">

            {
              mode === 'login'
                ? 'WELCOME BACK'
                : 'JOIN THE MOVEMENT'
            }

          </p>


          <h2>

            {
              mode === 'login'
                ? 'Your next ride is closer.'
                : 'Make your commute count.'
            }

          </h2>


          <p>

            {
              mode === 'login'
                ? 'Sign in to see what is happening on your route.'
                : 'Create an account in under a minute.'
            }

          </p>

        </div>


        {
          registrationSuccess && (

            <div className="success-box">

              Account created successfully.
              Please sign in.

            </div>

          )
        }


        <form
          onSubmit={submit}
          className="auth-form"
        >

          {
            mode !== 'login' && (

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
                  placeholder="Your name"
                  required
                />

              </label>

            )
          }


          <label>

            Email

            <input
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm({
                  ...form,
                  email: e.target.value
                })
              }
              placeholder="you@example.com"
              required
              autoComplete="email"
            />

          </label>


          <label>

            Password

            <input
              type="password"
              value={form.password}
              onChange={(e) =>
                setForm({
                  ...form,
                  password: e.target.value
                })
              }
              placeholder="At least 8 characters"
              required
              minLength={8}
              autoComplete={
                mode === 'login'
                  ? 'current-password'
                  : 'new-password'
              }
            />

          </label>


          {
            mode !== 'login' && (

              <label>

                Confirm password

                <input
                  type="password"
                  value={
                    confirmPassword
                  }
                  onChange={(e) =>
                    setConfirmPassword(
                      e.target.value
                    )
                  }
                  placeholder="Re-enter your password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />

              </label>

            )
          }


          {
            error && (

              <div className="error-box">
                {error}
              </div>

            )
          }


          <button
            type="submit"
            className="primary-button full"
            disabled={busy}
          >

            {
              busy
                ? 'Please wait...'
                : mode === 'login'
                  ? 'Sign in'
                  : 'Create account'
            }

            <ChevronRight size={18} />

          </button>

        </form>


        {
          mode === 'login' && (

            <div className="social-auth">

              <div className="social-divider">

                <span>
                  OR
                </span>

              </div>


              {/* GOOGLE */}

              <button
                type="button"
                className="social-button"
                onClick={
                  handleGoogleClick
                }
                disabled={
                  socialBusy.google ||
                  !googleClientId
                }
              >

                <span
                  className="social-provider-icon google-icon"
                  aria-hidden="true"
                >
                  G
                </span>


                <span>

                  {
                    socialBusy.google
                      ? 'Connecting Google...'
                      : 'Continue with Google'
                  }

                </span>

              </button>


              {/* MICROSOFT */}

              <button
                type="button"
                className="social-button"
                onClick={
                  handleMicrosoftClick
                }
                disabled={
                  socialBusy.microsoft ||
                  !microsoftClientId
                }
              >

                <span
                  className="social-provider-icon microsoft-icon"
                  aria-hidden="true"
                >

                  <svg
                    viewBox="0 0 24 24"
                    width="18"
                    height="18"
                    aria-hidden="true"
                  >

                    <path
                      fill="#f25022"
                      d="M11 2h5.5v5.5H11z"
                    />

                    <path
                      fill="#00a4ef"
                      d="M11 8.5h5.5V14H11z"
                    />

                    <path
                      fill="#7fba00"
                      d="M5.5 2H11v5.5H5.5z"
                    />

                    <path
                      fill="#ffb900"
                      d="M5.5 8.5H11V14H5.5z"
                    />

                    <path
                      fill="#f25022"
                      d="M11 14h5.5v5.5H11z"
                    />

                    <path
                      fill="#00a4ef"
                      d="M5.5 14H11v5.5H5.5z"
                    />

                  </svg>

                </span>


                <span>

                  {
                    socialBusy.microsoft
                      ? 'Connecting Microsoft...'
                      : 'Continue with Microsoft'
                  }

                </span>

              </button>

            </div>

          )
        }


        {
          mode === 'login' && (

            <Link
              className="student-login-admin-link"
              to="/admin/login"
            >
              Admin Panel
            </Link>

          )
        }


        <p className="switch-auth">

          {
            mode === 'login'
              ? 'New to Campus Commute?'
              : 'Already have an account?'
          }

          {' '}


          <Link
            to={
              mode === 'login'
                ? '/register'
                : '/login'
            }
          >

            {
              mode === 'login'
                ? 'Create an account'
                : 'Sign in'
            }

          </Link>

        </p>

      </div>

    </main>

  );
}


/* =========================================================
   STUDENTS VIEW
   ========================================================= */

function StudentsView({
  onBack
}) {

  const [students, setStudents] =
    useState([]);


  const [query, setQuery] =
    useState('');


  const [filter, setFilter] =
    useState('ALL');


  const [selected, setSelected] =
    useState(null);


  const [loading, setLoading] =
    useState(true);


  const [busyId, setBusyId] =
    useState('');


  const [error, setError] =
    useState('');


  const [notice, setNotice] =
    useState('');


  const load = async () => {

    setLoading(true);

    setError('');


    try {

      const {
        students: items = []
      } = await request(
        '/admin/students?limit=100'
      );


      setStudents(
        Array.isArray(items)
          ? items
          : []
      );

    } catch (e) {

      setError(
        e.message ||
        'Unable to load students.'
      );

    } finally {

      setLoading(false);

    }

  };


  useEffect(() => {

    load();

  }, []);


  const filtered =
    students.filter(
      (student) => {

        const studentName =
          student?.name ||
          '';


        const studentEmail =
          student?.email ||
          '';


        const matchesQuery =
          `${studentName} ${studentEmail}`
            .toLowerCase()
            .includes(
              query.toLowerCase()
            );


        const matchesFilter =
          filter === 'ALL' ||
          student.role === filter ||
          student.verificationStatus === filter ||
          student.accountStatus === filter;


        return (
          matchesQuery &&
          matchesFilter
        );

      }
    );


  const updateStudent =
    async (
      student,
      path,
      body,
      message
    ) => {

      if (!student?._id) {
        return;
      }


      setBusyId(
        student._id
      );

      setError('');

      setNotice('');


      try {

        const result =
          await request(
            `/admin/students/${student._id}/${path}`,
            {
              method: 'PATCH',

              body:
                JSON.stringify(body)
            }
          );


        if (result?.student) {

          setStudents(
            (items) =>
              items.map(
                (item) =>
                  item._id ===
                  student._id
                    ? result.student
                    : item
              )
          );


          setSelected(
            result.student
          );

        }


        setNotice(
          message
        );

      } catch (e) {

        setError(
          e.message ||
          'Unable to update student.'
        );

      } finally {

        setBusyId('');

      }

    };


  const statusClass =
    (value) =>
      value === 'VERIFIED' ||
      value === 'ACTIVE'
        ? 'status verified-status'
        : 'status pending-status';


  return (

    <main className="admin-main students-main">

      <header className="admin-header students-header">

        <div>

          <button
            type="button"
            className="link-button admin-back"
            onClick={onBack}
          >

            <ChevronRight size={16} />

            Overview

          </button>


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


      {
        notice && (

          <div className="success-box">

            <CheckCircle2 size={17} />

            {notice}

          </div>

        )
      }


      {
        error && (

          <div className="error-box">
            {error}
          </div>

        )
      }


      <section className="student-toolbar">

        <div className="student-search">

          <Search size={18} />


          <input
            value={query}
            onChange={(event) =>
              setQuery(
                event.target.value
              )
            }
            placeholder="Search by name or email"
          />

        </div>


        <div className="student-filters">

          <Filter size={16} />


          {
            [
              'ALL',
              'VERIFIED',
              'PENDING',
              'ADMIN',
              'ACTIVE',
              'SUSPENDED'
            ].map(
              (value) => (

                <button
                  type="button"
                  className={
                    filter === value
                      ? 'filter-button active'
                      : 'filter-button'
                  }
                  key={value}
                  onClick={() =>
                    setFilter(value)
                  }
                >

                  {
                    value[0] +
                    value
                      .slice(1)
                      .toLowerCase()
                  }

                </button>

              )
            )
          }

        </div>

      </section>


      <section className="admin-panel students-panel">

        <div className="admin-panel-head">

          <div>

            <p className="eyebrow">
              {filtered.length} RESULTS
            </p>

            <h2>
              Student accounts
            </h2>

          </div>


          <button
            type="button"
            className="soft-button"
            onClick={load}
            disabled={loading}
          >

            <Activity size={16} />

            Refresh

          </button>

        </div>


        {
          loading

            ? (

                <div className="admin-loading">
                  Loading students...
                </div>

              )

            : filtered.length === 0

              ? (

                  <div className="empty-admin">

                    <Users size={26} />

                    <h3>
                      No students found
                    </h3>

                    <p>
                      Try a different search
                      or filter.
                    </p>

                  </div>

                )

              : (

                  <div className="students-table">

                    <div className="student-table-head">

                      <span>
                        Student
                      </span>

                      <span>
                        Verification
                      </span>

                      <span>
                        Account
                      </span>

                      <span>
                        Joined
                      </span>

                      <span>
                        Role
                      </span>

                      <span>
                        Actions
                      </span>

                    </div>


                    {
                      filtered.map(
                        (student) => (

                          <button
                            type="button"
                            className="student-row"
                            key={student._id}
                            onClick={() =>
                              setSelected(
                                student
                              )
                            }
                          >

                            <div className="student-identity">

                              <div className="avatar small">

                                {
                                  (
                                    student.name ||
                                    'ST'
                                  )
                                    .slice(0, 2)
                                    .toUpperCase()
                                }

                              </div>


                              <span>

                                <b>
                                  {student.name}
                                </b>

                                <small>
                                  {student.email}
                                </small>

                              </span>

                            </div>


                            <span
                              className={
                                statusClass(
                                  student.verificationStatus
                                )
                              }
                            >

                              {
                                student.verificationStatus ||
                                'PENDING'
                              }

                            </span>


                            <span
                              className={
                                statusClass(
                                  student.accountStatus ||
                                  'ACTIVE'
                                )
                              }
                            >

                              {
                                student.accountStatus ||
                                'ACTIVE'
                              }

                            </span>


                            <small>

                              {
                                student.createdAt
                                  ? new Date(
                                      student.createdAt
                                    ).toLocaleDateString()
                                  : '—'
                              }

                            </small>


                            <span className="role-label">
                              {student.role || 'STUDENT'}
                            </span>


                            <span className="row-action">

                              View

                              <ChevronRight size={15} />

                            </span>

                          </button>

                        )
                      )
                    }

                  </div>

                )
        }

      </section>


      {
        selected && (

          <div
            className="modal-backdrop"
            onMouseDown={(event) => {

              if (
                event.target ===
                event.currentTarget
              ) {

                setSelected(null);

              }

            }}
          >

            <section className="modal student-modal">

              <div className="modal-head">

                <div>

                  <p className="eyebrow">
                    STUDENT PROFILE
                  </p>

                  <h2>
                    {selected.name}
                  </h2>

                </div>


                <button
                  type="button"
                  className="icon-button"
                  onClick={() =>
                    setSelected(null)
                  }
                >
                  <X />
                </button>

              </div>


              <div className="student-detail-grid">

                <div>

                  <small>
                    Email
                  </small>

                  <b>
                    {selected.email}
                  </b>

                </div>


                <div>

                  <small>
                    Role
                  </small>

                  <b>
                    {selected.role}
                  </b>

                </div>


                <div>

                  <small>
                    Verification
                  </small>


                  <span
                    className={
                      statusClass(
                        selected.verificationStatus
                      )
                    }
                  >

                    {
                      selected.verificationStatus ||
                      'PENDING'
                    }

                  </span>

                </div>


                <div>

                  <small>
                    Account
                  </small>


                  <span
                    className={
                      statusClass(
                        selected.accountStatus ||
                        'ACTIVE'
                      )
                    }
                  >

                    {
                      selected.accountStatus ||
                      'ACTIVE'
                    }

                  </span>

                </div>


                <div>

                  <small>
                    Joined
                  </small>


                  <b>

                    {
                      selected.createdAt
                        ? new Date(
                            selected.createdAt
                          ).toLocaleDateString()
                        : '—'
                    }

                  </b>

                </div>


                <div>

                  <small>
                    College
                  </small>

                  <b>
                    {
                      selected.college ||
                      'Not provided'
                    }
                  </b>

                </div>


                <div>

                  <small>
                    Department
                  </small>

                  <b>
                    {
                      selected.department ||
                      'Not provided'
                    }
                  </b>

                </div>


                <div>

                  <small>
                    Year
                  </small>

                  <b>
                    {
                      selected.year ||
                      'Not provided'
                    }
                  </b>

                </div>


                <div>

                  <small>
                    Phone
                  </small>

                  <b>
                    {
                      selected.phone ||
                      'Not provided'
                    }
                  </b>

                </div>


                <div>

                  <small>
                    Rating
                  </small>

                  <b>

                    {
                      typeof selected.rating === 'number'
                        ? selected.rating.toFixed(1)
                        : '0.0'
                    }

                    {' '}

                    (

                    {
                      selected.completedRides ||
                      0
                    }

                    {' '}rides)

                  </b>

                </div>

              </div>


              <div className="student-actions">

                {
                  selected.verificationStatus !==
                    'VERIFIED' && (

                    <button
                      type="button"
                      className="primary-button"
                      disabled={
                        busyId ===
                        selected._id
                      }
                      onClick={() =>
                        updateStudent(
                          selected,
                          'verify',
                          {},
                          'Student verified successfully.'
                        )
                      }
                    >

                      {
                        busyId ===
                        selected._id
                          ? 'Saving...'
                          : 'Verify student'
                      }

                    </button>

                  )
                }


                {
                  selected.role !==
                    'ADMIN' && (

                    <button
                      type="button"
                      className="soft-button"
                      disabled={
                        busyId ===
                        selected._id
                      }
                      onClick={() => {

                        const suspended =
                          selected.accountStatus ===
                          'SUSPENDED';


                        updateStudent(
                          selected,
                          'status',
                          {
                            accountStatus:
                              suspended
                                ? 'ACTIVE'
                                : 'SUSPENDED'
                          },
                          `Student ${
                            suspended
                              ? 'activated'
                              : 'suspended'
                          } successfully.`
                        );

                      }}
                    >

                      {
                        selected.accountStatus ===
                        'SUSPENDED'
                          ? 'Activate account'
                          : 'Suspend account'
                      }

                    </button>

                  )
                }

              </div>

            </section>

          </div>

        )
      }

    </main>

  );
}


/* =========================================================
   ADMIN DASHBOARD
   ========================================================= */

function AdminDashboard({
  user,
  onLogout
}) {

  const [section, setSection] =
    useState('overview');


  const tool =
    section === 'rides' ||
    section === 'reports' ||
    section === 'audit';


  if (section === 'students') {

    return (

      <div className="admin-shell">

        <AdminSidebar
          user={user}
          onLogout={onLogout}
          onStudents={() =>
            setSection('students')
          }
          onSection={setSection}
          active={section}
        />


        <StudentsView
          onBack={() =>
            setSection('overview')
          }
        />

      </div>

    );

  }


  if (tool) {

    return (

      <div className="admin-shell">

        <AdminSidebar
          user={user}
          onLogout={onLogout}
          onStudents={() =>
            setSection('students')
          }
          onSection={setSection}
          active={section}
        />


        <AdminTools
          request={request}
          section={section}
          onBack={() =>
            setSection('overview')
          }
        />

      </div>

    );

  }


  return (

    <AdminOverview
      user={user}
      onLogout={onLogout}
      onStudents={() =>
        setSection('students')
      }
      onSection={setSection}
    />

  );

}


/* =========================================================
   ADMIN SIDEBAR
   ========================================================= */

function AdminSidebar({
  user,
  onLogout,
  onStudents,
  onSection,
  active
}) {

  return (

    <aside className="admin-sidebar">

      <div className="brand">

        <span className="logo-mark">
          CC
        </span>

        <span>
          Campus <b>Commute</b>
        </span>

      </div>


      <div className="admin-badge">

        <ShieldCheck size={15} />

        Admin control centre

      </div>


      <p className="nav-label">
        MONITORING
      </p>


      <button
        type="button"
        className={
          active === 'overview'
            ? 'nav-item active'
            : 'nav-item'
        }
        onClick={() =>
          onSection('overview')
        }
      >

        <Activity size={19} />

        Overview

      </button>


      <button
        type="button"
        className={
          active === 'students'
            ? 'nav-item active'
            : 'nav-item'
        }
        onClick={onStudents}
      >

        <Users size={19} />

        Students

      </button>


      <button
        type="button"
        className={
          active === 'rides'
            ? 'nav-item active'
            : 'nav-item'
        }
        onClick={() =>
          onSection('rides')
        }
      >

        <CarFront size={19} />

        All rides

      </button>


      <button
        type="button"
        className={
          active === 'reports'
            ? 'nav-item active'
            : 'nav-item'
        }
        onClick={() =>
          onSection('reports')
        }
      >

        <AlertTriangle size={19} />

        Reports

      </button>


      <button
        type="button"
        className={
          active === 'audit'
            ? 'nav-item active'
            : 'nav-item'
        }
        onClick={() =>
          onSection('audit')
        }
      >

        <Database size={19} />

        Audit logs

      </button>


      <div className="sidebar-bottom">

        <div className="mini-profile">

          <div className="avatar">

            {
              (
                user?.name ||
                'AD'
              )
                .slice(0, 2)
                .toUpperCase()
            }

          </div>


          <div>

            <b>
              {user?.name || 'Administrator'}
            </b>

            <small>
              Platform administrator
            </small>

          </div>


          <button
            type="button"
            onClick={onLogout}
            title="Log out"
          >
            <LogOut size={17} />
          </button>

        </div>

      </div>

    </aside>

  );

}


/* =========================================================
   ADMIN OVERVIEW
   ========================================================= */

function AdminOverview({
  user,
  onLogout,
  onStudents,
  onSection
}) {

  const [metrics, setMetrics] =
    useState(null);


  const [users, setUsers] =
    useState([]);


  const [error, setError] =
    useState('');


  useEffect(() => {

    let cancelled = false;


    const loadOverview =
      async () => {

        try {

          const [
            overview,
            list
          ] = await Promise.all([

            request(
              '/admin/overview'
            ),

            request(
              '/admin/users'
            )

          ]);


          if (cancelled) {
            return;
          }


          setMetrics(
            overview?.metrics || {}
          );


          setUsers(
            Array.isArray(list?.users)
              ? list.users
              : []
          );

        } catch (e) {

          if (!cancelled) {

            setError(
              e.message ||
              'Unable to load admin overview.'
            );

          }

        }

      };


    loadOverview();


    return () => {
      cancelled = true;
    };

  }, []);


  const cards =
    metrics
      ? [

          [
            'Registered students',
            metrics.users ?? 0,
            Users
          ],

          [
            'Verified community',
            metrics.verified ?? 0,
            ShieldCheck
          ],

          [
            'Active rides',
            metrics.active ?? 0,
            Activity
          ],

          [
            'Completed rides',
            metrics.completed ?? 0,
            CarFront
          ],

          [
            'Pending verification',
            metrics.pending ?? 0,
            AlertTriangle
          ],

          [
            'Cancelled rides',
            metrics.cancelled ?? 0,
            CalendarDays
          ]

        ]
      : [];


  return (

    <div className="admin-shell">

      <AdminSidebar
        user={user}
        onLogout={onLogout}
        onStudents={onStudents}
        onSection={onSection}
        active="overview"
      />


      <main className="admin-main">

        <header className="admin-header">

          <div>

            <p className="eyebrow">
              LIVE PLATFORM MONITOR
            </p>


            <h1>

              Good morning,

              {' '}

              <em>

                {
                  (
                    user?.name ||
                    'Administrator'
                  )
                    .split(' ')[0]
                }.

              </em>

            </h1>


            <p className="muted">

              A clear view of how Campus
              Commute is moving today.

            </p>

          </div>


          <div className="admin-status">

            <span></span>

            All systems operational

          </div>

        </header>


        {
          error && (

            <div className="error-box">
              {error}
            </div>

          )
        }


        <section className="admin-metrics">

          {
            cards.length

              ? cards.map(
                  ([
                    label,
                    value,
                    Icon
                  ]) => (

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
                        {value}
                      </strong>


                      <small>

                        {
                          label ===
                          'Pending verification'

                            ? 'Needs review'

                            : 'Across the platform'
                        }

                      </small>

                    </div>

                  )
                )

              : (

                  <div className="admin-loading">

                    Loading live platform
                    metrics...

                  </div>

                )
          }

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
                type="button"
                className="link-button"
                onClick={onStudents}
              >

                View all

                <ChevronRight size={16} />

              </button>

            </div>


            <div className="user-table">

              {
                users.length

                  ? users.map(
                      (student) => (

                        <div
                          className="user-row"
                          key={student._id}
                        >

                          <div className="avatar small">

                            {
                              (
                                student.name ||
                                'ST'
                              )
                                .slice(0, 2)
                                .toUpperCase()
                            }

                          </div>


                          <div>

                            <b>
                              {student.name}
                            </b>

                            <small>
                              {student.email}
                            </small>

                          </div>


                          <span
                            className={
                              student.verificationStatus ===
                              'VERIFIED'
                                ? 'status verified-status'
                                : 'status pending-status'
                            }
                          >

                            {
                              student.verificationStatus ||
                              'PENDING'
                            }

                          </span>


                          <small className="date-cell">

                            {
                              student.createdAt
                                ? new Date(
                                    student.createdAt
                                  ).toLocaleDateString()
                                : '—'
                            }

                          </small>

                        </div>

                      )
                    )

                  : (

                      <div className="admin-loading">
                        No recent students found.
                      </div>

                    )
              }

            </div>

          </div>


          <div className="admin-panel health-panel">

            <div className="admin-panel-head">

              <div>

                <p className="eyebrow">
                  SYSTEM HEALTH
                </p>

                <h2>
                  Platform pulse
                </h2>

              </div>


              <Activity
                size={19}
              />

            </div>


            <div className="health-line">

              <span>

                <Database size={16} />

                MongoDB

              </span>


              <b>
                Connected
              </b>

            </div>


            <div className="health-line">

              <span>

                <Activity size={16} />

                API service

              </span>


              <b>
                Healthy
              </b>

            </div>


            <div className="health-line">

              <span>

                <MessageCircle size={16} />

                Live messaging

              </span>


              <b>
                Online
              </b>

            </div>


            <div className="health-summary">

              <strong>
                {metrics?.active || 0}
              </strong>


              <span>

                rides currently moving
                through the platform

              </span>

            </div>

          </div>

        </section>

      </main>

    </div>

  );
}


/* =========================================================
   DASHBOARD
   ========================================================= */

function Dashboard({
  user,
  screen,
  setScreen,
  onLogout,
  showCreate,
  setShowCreate
}) {

  const [rides, setRides] =
    useState([]);


  const [notifications,
    setNotifications] =
    useState([]);


  const [query, setQuery] =
    useState('');


  const [mobileNav,
    setMobileNav] =
    useState(false);


  const load = async () => {

    try {

      const {
        rides: items = []
      } = await request(
        `/rides?source=${encodeURIComponent(
          query
        )}`
      );


      setRides(
        Array.isArray(items)
          ? items
          : []
      );

    } catch {
      setRides([]);
    }


    try {

      const {
        notifications: items = []
      } = await request(
        '/notifications'
      );


      setNotifications(
        Array.isArray(items)
          ? items
          : []
      );

    } catch {
      setNotifications([]);
    }

  };


  useEffect(() => {

    load();

  }, [query]);


  const join =
    async (id) => {

      try {

        await request(
          `/rides/${id}/join`,
          {
            method: 'POST'
          }
        );


        await load();

      } catch (e) {

        window.alert(
          e.message ||
          'Unable to join ride.'
        );

      }

    };


  return (

    <div className="app-shell">

      <aside
        className={
          mobileNav
            ? 'sidebar open'
            : 'sidebar'
        }
      >

        <div className="brand">

          <span className="logo-mark">
            CC
          </span>

          <span>
            Campus <b>Commute</b>
          </span>

        </div>


        <button
          type="button"
          className="close-nav"
          onClick={() =>
            setMobileNav(false)
          }
        >
          <X />
        </button>


        <p className="nav-label">
          WORKSPACE
        </p>


        <nav>

          {
            [
              [
                Home,
                'Home',
                'home'
              ],

              [
                Search,
                'Find a ride',
                'search'
              ],

              [
                CalendarDays,
                'My trips',
                'trips'
              ],

              [
                MessageCircle,
                'Messages',
                'messages'
              ]

            ].map(
              ([
                Icon,
                label,
                value
              ]) => (

                <button
                  type="button"
                  className={
                    screen === value
                      ? 'nav-item active'
                      : 'nav-item'
                  }
                  key={value}
                  onClick={() => {

                    setScreen(
                      value
                    );

                    setMobileNav(
                      false
                    );

                  }}
                >

                  <Icon size={19} />

                  {label}


                  {
                    value ===
                      'messages' && (

                      <span className="nav-count">
                        2
                      </span>

                    )
                  }

                </button>

              )
            )
          }

        </nav>


        <p className="nav-label second">
          ACCOUNT
        </p>


        <nav>

          <button
            type="button"
            className="nav-item"
          >

            <Bell size={19} />

            Notifications


            {
              notifications.some(
                (item) =>
                  !item.read
              ) && (

                <span className="notification-dot" />

              )
            }

          </button>


          <button
            type="button"
            className="nav-item"
          >

            <UserRound size={19} />

            Profile

          </button>


          <button
            type="button"
            className="nav-item"
          >

            <Settings size={19} />

            Settings

          </button>

        </nav>


        <div className="sidebar-bottom">

          <div className="mini-profile">

            <div className="avatar">

              {
                (
                  user?.name ||
                  'ST'
                )
                  .slice(0, 2)
                  .toUpperCase()
              }

            </div>


            <div>

              <b>
                {user?.name || 'Student'}
              </b>

              <small>
                Student account
              </small>

            </div>


            <button
              type="button"
              onClick={onLogout}
              title="Log out"
            >
              <LogOut size={17} />
            </button>

          </div>


          <div className="verified">

            <ShieldCheck size={16} />

            Verified community

          </div>

        </div>

      </aside>


      <main className="main-content">

        <header className="topbar">

          <button
            type="button"
            className="menu-button"
            onClick={() =>
              setMobileNav(true)
            }
          >
            <Menu />
          </button>


          <div className="search-box">

            <Search size={18} />


            <input
              value={query}
              onChange={(e) =>
                setQuery(
                  e.target.value
                )
              }
              placeholder="Search your next ride..."
            />

          </div>


          <div className="top-actions">

            <button
              type="button"
              className="icon-button notification-button"
            >

              <Bell size={20} />


              {
                notifications.some(
                  (item) =>
                    !item.read
                ) && (

                  <span />

                )
              }

            </button>


            <div className="top-user">

              <div className="avatar">

                {
                  (
                    user?.name ||
                    'ST'
                  )
                    .slice(0, 2)
                    .toUpperCase()
                }

              </div>


              <div>

                <b>
                  {user?.name || 'Student'}
                </b>

                <small>

                  {
                    user?.college ||
                    'Campus student'
                  }

                </small>

              </div>

            </div>

          </div>

        </header>


        {
          screen === 'home' ||
          screen === 'search'

            ? (

                <>

                  <section className="welcome-row">

                    <div>

                      <p className="eyebrow">

                        {
                          screen === 'home'

                            ? new Date()
                                .toLocaleDateString(
                                  undefined,
                                  {
                                    weekday:
                                      'long',
                                    day:
                                      'numeric',
                                    month:
                                      'long'
                                  }
                                )
                                .toUpperCase()

                            : 'EXPLORE YOUR ROUTE'
                        }

                      </p>


                      <h1>

                        {
                          screen === 'home'

                            ? (

                                <>

                                  Good morning,

                                  {' '}

                                  <em>

                                    {
                                      (
                                        user?.name ||
                                        'Student'
                                      ).split(
                                        ' '
                                      )[0]
                                    }.

                                  </em>

                                </>

                              )

                            : (

                                <>

                                  Find a ride
                                  that

                                  {' '}

                                  <em>
                                    fits.
                                  </em>

                                </>

                              )
                        }

                      </h1>


                      <p className="muted">

                        {
                          screen === 'home'

                            ? 'Your campus commute, thoughtfully connected.'

                            : 'Search by pickup, destination, date, or time.'
                        }

                      </p>

                    </div>


                    <div className="quick-actions">

                      <button
                        type="button"
                        className="soft-button"
                        onClick={() =>
                          setScreen(
                            'search'
                          )
                        }
                      >

                        <Search size={17} />

                        Find a ride

                      </button>


                      <button
                        type="button"
                        className="primary-button"
                        onClick={() =>
                          setShowCreate(
                            true
                          )
                        }
                      >

                        <Plus size={18} />

                        Offer a ride

                      </button>

                    </div>

                  </section>


                  <section className="stats-row">

                    <div className="stat-card highlight">

                      <div className="stat-icon">

                        <Compass size={20} />

                      </div>


                      <div>

                        <span>
                          Your commute
                        </span>

                        <strong>
                          Feels lighter together
                        </strong>

                      </div>


                      <ChevronRight size={18} />

                    </div>


                    <div className="stat-card">

                      <span>
                        Upcoming trips
                      </span>

                      <strong>
                        03
                      </strong>

                      <small>
                        this month
                      </small>

                    </div>


                    <div className="stat-card">

                      <span>
                        Time saved
                      </span>

                      <strong>
                        4.5h
                      </strong>

                      <small>
                        by sharing rides
                      </small>

                    </div>

                  </section>


                  <section className="section-heading">

                    <div>

                      <p className="eyebrow">
                        SMART MATCHES
                      </p>

                      <h2>
                        Recommended for you
                      </h2>

                    </div>


                    <button
                      type="button"
                      className="link-button"
                      onClick={() =>
                        setScreen(
                          'search'
                        )
                      }
                    >

                      View all

                      <ChevronRight size={16} />

                    </button>

                  </section>


                  <div className="rides-grid">

                    {
                      rides.length

                        ? rides.map(
                            (ride) => (

                              <RideCard
                                key={
                                  ride._id
                                }
                                ride={ride}
                                onJoin={
                                  join
                                }
                              />

                            )
                          )

                        : (

                            <EmptyRides
                              onCreate={() =>
                                setShowCreate(
                                  true
                                )
                              }
                            />

                          )
                    }

                  </div>

                </>

              )

            : (

                <TripsView
                  screen={screen}
                  rides={rides}
                />

              )
        }

      </main>


      {
        showCreate && (

          <CreateRide
            onClose={() =>
              setShowCreate(
                false
              )
            }
            onCreated={() => {

              setShowCreate(
                false
              );

              load();

            }}
          />

        )
      }

    </div>

  );
}


/* =========================================================
   RIDE CARD
   ========================================================= */

function RideCard({
  ride,
  onJoin
}) {

  return (

    <article className="ride-card">

      <div className="ride-card-top">

        <span className="match-pill">

          <Sparkles size={13} />

          {
            ride.matchScore ??
            (
              ride.availableSeats > 2
                ? 92
                : 84
            )
          }%

          {' '}Match

        </span>


        <button
          type="button"
          className="more-button"
        >
          •••
        </button>

      </div>


      <div className="route">

        <div className="route-line">

          <span></span>

          <i></i>

          <span></span>

        </div>


        <div>

          <b>
            {ride.source}
          </b>

          <small>
            {ride.departureTime}
          </small>

          <b>
            {ride.destination}
          </b>

        </div>

      </div>


      <div className="ride-meta">

        <span>

          <Clock3 size={15} />

          {ride.estimatedDuration || 35}

          {' '}min

        </span>


        <span>

          <CarFront size={15} />

          {
            ride.vehicle?.model ||
            'Campus ride'
          }

        </span>

      </div>


      <div className="ride-footer">

        <div className="driver">

          <div className="avatar small">

            {
              ride.creator?.name
                ?.slice(0, 2)
                .toUpperCase() ||
              'CC'
            }

          </div>


          <span>

            <b>

              {
                ride.creator?.name ||
                'Verified student'
              }

            </b>


            <small>

              ★

              {' '}

              {
                ride.creator?.rating
                  ?.toFixed?.(1) ||
                '4.8'
              }

              {' '}rating

            </small>

          </span>

        </div>


        <button
          type="button"
          className="join-button"
          disabled={
            !ride.availableSeats
          }
          onClick={() =>
            onJoin(ride._id)
          }
        >

          {
            ride.availableSeats
              ? `${ride.availableSeats} seats`
              : 'Full'
          }

        </button>

      </div>

    </article>

  );
}


/* =========================================================
   EMPTY RIDES
   ========================================================= */

function EmptyRides({
  onCreate
}) {

  return (

    <div className="empty-state">

      <div className="empty-icon">

        <MapPin size={25} />

      </div>


      <h3>
        No rides on this route yet
      </h3>


      <p>

        Be the person who gets the
        campus moving. Offer a ride
        and find your people.

      </p>


      <button
        type="button"
        className="primary-button"
        onClick={onCreate}
      >

        <Plus size={17} />

        Offer a ride

      </button>

    </div>

  );
}


/* =========================================================
   TRIPS
   ========================================================= */

function TripsView({
  screen,
  rides
}) {

  return (

    <section className="subpage">

      <div className="welcome-row">

        <div>

          <p className="eyebrow">
            YOUR JOURNEY
          </p>


          <h1>

            {
              screen === 'trips'

                ? (

                    <>

                      Your

                      {' '}

                      <em>
                        trips.
                      </em>

                    </>

                  )

                : (

                    <>

                      Your

                      {' '}

                      <em>
                        conversations.
                      </em>

                    </>

                  )
            }

          </h1>


          <p className="muted">

            {
              screen === 'trips'

                ? 'Everything you have planned, in one place.'

                : 'Ride-specific conversations will appear here.'
            }

          </p>

        </div>

      </div>


      {
        screen === 'trips'

          ? (

              <div className="empty-state">

                <CalendarDays size={28} />

                <h3>
                  Your trips will show up here
                </h3>

                <p>

                  Join a ride from your
                  recommendations to start
                  building your commute history.

                </p>

              </div>

            )

          : (

              <div className="empty-state">

                <MessageCircle size={28} />

                <h3>
                  No conversations yet
                </h3>

                <p>

                  Join a ride to unlock
                  its private chat room.

                </p>

              </div>

            )
      }

    </section>

  );
}


/* =========================================================
   CREATE RIDE
   ========================================================= */

function CreateRide({
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

        model: '',

        type: 'Car',

        capacity: 4

      },

      notes: ''

    });


  const [error, setError] =
    useState('');


  const [busy, setBusy] =
    useState(false);


  const submit =
    async (e) => {

      e.preventDefault();


      if (busy) {
        return;
      }


      setBusy(true);

      setError('');


      try {

        await request(
          '/rides',
          {
            method: 'POST',

            body:
              JSON.stringify(form)
          }
        );


        onCreated();

      } catch (err) {

        setError(
          err.message ||
          'Unable to create ride.'
        );

      } finally {

        setBusy(false);

      }

    };


  const update =
    (key, value) =>
      setForm({
        ...form,
        [key]: value
      });


  return (

    <div
      className="modal-backdrop"
      onMouseDown={(event) => {

        if (
          event.target ===
          event.currentTarget
        ) {

          onClose();

        }

      }}
    >

      <div className="modal">

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


        <form
          className="ride-form"
          onSubmit={submit}
        >

          <label>

            Pickup location

            <input
              required
              value={form.source}
              onChange={(e) =>
                update(
                  'source',
                  e.target.value
                )
              }
              placeholder="e.g. Pune Station"
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
                update(
                  'destination',
                  e.target.value
                )
              }
              placeholder="e.g. PICT Campus"
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
                  update(
                    'date',
                    e.target.value
                  )
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
                  update(
                    'departureTime',
                    e.target.value
                  )
                }
              />

            </label>

          </div>


          <div className="form-grid">

            <label>

              Seats you offer

              <input
                type="number"
                min="1"
                max="20"
                required
                value={
                  form.maxPassengers
                }
                onChange={(e) =>
                  update(
                    'maxPassengers',
                    Number(
                      e.target.value
                    )
                  )
                }
              />

            </label>


            <label>

              Vehicle

              <input
                value={
                  form.vehicle.model
                }
                onChange={(e) =>
                  update(
                    'vehicle',
                    {
                      ...form.vehicle,
                      model:
                        e.target.value
                    }
                  )
                }
                placeholder="e.g. Honda City"
              />

            </label>

          </div>


          <label>

            Note for riders

            <textarea
              value={form.notes}
              onChange={(e) =>
                update(
                  'notes',
                  e.target.value
                )
              }
              placeholder="Anything helpful about your pickup spot?"
            />

          </label>


          {
            error && (

              <div className="error-box">
                {error}
              </div>

            )
          }


          <button
            type="submit"
            className="primary-button full"
            disabled={busy}
          >

            {
              busy
                ? 'Publishing...'
                : 'Publish ride'
            }

            <ChevronRight size={18} />

          </button>

        </form>

      </div>

    </div>

  );
}


/* =========================================================
   ROOT
   ========================================================= */

const rootElement =
  document.getElementById('root');


if (!rootElement) {

  throw new Error(
    'Root element #root was not found.'
  );

}


createRoot(
  rootElement
).render(

  <BrowserRouter>

    <App />

  </BrowserRouter>

);
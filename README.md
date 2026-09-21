# Campus Commute

A JavaScript-only MERN application for verified student ride sharing and commute coordination.

## Run locally

1. Install Node.js 20+ and MongoDB (local or Atlas).
2. Copy `.env.example` to `server/.env` and set `MONGO_URI` and `JWT_SECRET`. For Atlas, use a real **Database User** from Atlas, not your Atlas account email, and URL-encode special characters in its password.
3. Run `npm run install:all` from the project root.
4. Run `npm run dev`.
5. Open `http://localhost:5173`.

The server uses conditional MongoDB updates for seat allocation, so concurrent join attempts cannot overbook a ride. Socket.IO ride rooms broadcast seat and participant changes only to authorized participants.

## Admin access

Register a normal account first, then promote it from the server directory after MongoDB is connected:

```powershell
npm run promote-admin -- student@college.edu
```

Sign in with that account to open the protected admin control centre. The dashboard shows registered and verified students, ride status counts, verification backlog, recent users, and API/database/messaging health. Admin APIs reject normal student accounts on the backend.

Check the API status at `http://localhost:5000/api/health`. If it reports `database: unavailable`, correct `server/.env`; the API will stay online and return a configuration error rather than causing a browser `ERR_CONNECTION_REFUSED`.

## Google Login Setup

1. In Google Cloud Console, create or select a project.
2. Enable the Google Identity Services / OAuth 2.0 client for web applications.
3. Add your app origin to authorized JavaScript origins:
   - `http://localhost:5173`
   - `http://localhost:5000` if you test server callbacks directly
4. Add your redirect/origin entry for the one-tap / popup flow as needed by your configured client. For this app, the browser uses the Google JS SDK on the frontend and sends the returned credential to the backend API at `POST /api/auth/google`.
5. Copy the OAuth client ID into both the frontend and server env files:

```env
# client/.env or root .env for Vite
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

# server/.env
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

6. The backend verifies the Google ID token with the Google JWKS endpoint and checks the audience and issuer before creating or linking a Campus Commute user.

## Microsoft Login Setup

1. Open Microsoft Entra ID (Azure AD) and create an app registration.
2. Add a web platform and set the redirect URI to:
   - `http://localhost:5173`
3. Under Authentication, enable the platform and ensure the app allows the login popup flow used by the frontend.
4. Copy the Application (client) ID and, if needed, your tenant ID into the environment:

```env
# client/.env or root .env for Vite
VITE_MICROSOFT_CLIENT_ID=your-microsoft-app-client-id

# server/.env
MICROSOFT_CLIENT_ID=your-microsoft-app-client-id
MICROSOFT_TENANT_ID=common
```

5. The backend verifies the Microsoft token against the Microsoft signing keys and validates the expected audience and issuer before returning the same Campus Commute JWT used by the email/password login flow.

## Structure

- `client/`: React/Vite responsive web application
- `server/`: Express, Mongoose, JWT, Socket.IO API
- `server/src/models/`: MongoDB models and indexes
- `server/src/services/`: domain logic such as recommendations, seat allocation, and OAuth verification

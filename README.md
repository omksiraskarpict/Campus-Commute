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

## Structure

- `client/`: React/Vite responsive web application
- `server/`: Express, Mongoose, JWT, Socket.IO API
- `server/src/models/`: MongoDB models and indexes
- `server/src/services/`: domain logic such as recommendations and seat allocation

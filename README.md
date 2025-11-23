# Invest Tracker Platform

This repository contains a TypeScript Express API and a React dashboard for monitoring investment accounts. The backend follows a layered architecture (controllers → services → repositories) over MongoDB, and the frontend uses MUI with a shared theme, loading states, and pages for dashboard, balances, accounts, and settings.

## Project structure
- `backend/`: Node.js + TypeScript API with MongoDB via Mongoose, JWT auth, validation via Zod, and grouped routes for auth, accounts, balances, months, and initialization.
- `frontend/`: React + TypeScript UI built with Vite and MUI components (sidebar layout, pages, loading button, and async handling hooks).
- `REQUIREMENTS.md`: Functional/business requirements that guided the initial implementation.

## Prerequisites
- Node.js 18+
- npm
- MongoDB 6+ (local instance or hosted connection string)

## Backend setup
1. Copy the environment template and adjust values:
   ```bash
   cd backend
   cp .env.example .env
   ```

   Minimal variables used by the server:
   ```env
   PORT=4000
   MONGO_URI=mongodb://localhost:27017/invest-tracker
   JWT_SECRET=change-me
   INIT_TOKEN=init-secret-token
   API_BASE_URL=http://localhost:4000/api
   AUTH_EMAIL=admin@example.com
   AUTH_PASSWORD=changeme
   ```
   - `MONGO_URI` should point to your MongoDB instance (for Atlas use the SRV string like `mongodb+srv://user:pass@cluster/dbname`).
   - `INIT_TOKEN` gates the one-time `/api/init` endpoint; omit it to keep the init route open only when the database is empty.
   - `API_BASE_URL` is used by the HTTP client file under `backend/http` for quick manual calls.
   - `AUTH_EMAIL`/`AUTH_PASSWORD` seed sample credentials for the debug requests.

2. Install dependencies and start the API:
   ```bash
   npm install
   npm run dev    # for hot reload (ts-node-dev)
   # npm run build && npm start  # for production build
   ```

3. The API listens on `PORT` (default `4000`) and serves routes under `/api` (e.g., `/api/health`, `/api/auth/login`). Ensure MongoDB is reachable via `MONGO_URI` before starting.

4. Optional: for manual debugging with the HTTP client in `backend/http/client.http`, open the file in VS Code (REST Client) or another `.http` runner. It reads `API_BASE_URL`, `AUTH_EMAIL`, `AUTH_PASSWORD`, and `INIT_TOKEN` from your `.env` and provides requests for every endpoint (health, init, auth, accounts, balances, months, dashboard, currency rates). After running the login request, the token is captured for subsequent calls.

## Frontend setup
1. Create a `.env` file in `frontend/` if you need to override the API base path (defaults to `/api` via proxy):
   ```env
   VITE_API_BASE_URL=/api
   ```

2. Install dependencies and start Vite dev server:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   The dev server prints a local URL (default `http://localhost:5173`). Configure your proxy so `/api` routes forward to the backend port (e.g., 4000) during development.

3. Build for production with `npm run build`, and preview with `npm run preview`.

## Running the stack
- Start MongoDB locally or provide a hosted connection string in `backend/.env`.
- Run the backend (`npm run dev` in `backend/`).
- Run the frontend (`npm run dev` in `frontend/`).
- Visit the frontend URL; it will call the backend via `/api`.

## Key endpoints
- `GET /api/health` – service and DB status.
- `POST /api/init` – one-time initialization (requires empty DB and optional `INIT_TOKEN`).
- Auth: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/profile`.
- Accounts: `GET/POST/PUT/DELETE /api/accounts`.
- Balances: `GET /api/balances`, `POST /api/balances/batch`.
- Months: `POST /api/months/close`, `GET /api/months/history`.
- Dashboard aggregates: `GET /api/dashboard`.

## Notes
- Monetary fields are validated to be non-negative with up to two decimals on both backend and frontend.
- Async UI actions use a shared loading button/hook that disables inputs while requests are in-flight.

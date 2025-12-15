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
   cp .env.example .env  # create this file if it does not exist
   ```

   Minimal variables used by the server:
   ```env
   PORT=4000
   MONGO_URI=mongodb://localhost:27017/invest-tracker
   JWT_SECRET=change-me
   INIT_TOKEN=init-secret-token
   ```
   - `MONGO_URI` should point to your MongoDB instance (for Atlas use the SRV string like `mongodb+srv://user:pass@cluster/dbname`).
   - `INIT_TOKEN` gates the one-time `/api/init` endpoint; omit it to keep the init route open only when the database is empty.

2. Install dependencies and start the API:
   ```bash
   npm install
   npm run dev    # for hot reload (ts-node-dev)
   # npm run build && npm start  # for production build
   ```

3. The API listens on `PORT` (default `4000`) and serves routes under `/api` (e.g., `/api/health`, `/api/auth/login`). Ensure MongoDB is reachable via `MONGO_URI` before starting.

### Importing currency rates from CSV
- Format each line in the file as `YYYY-MM-DD,PAIR,RATE` (or `DD.MM.YYYY` for the date). Currency pairs can be written as `USDRUB`, `USD/RUB`, or `USD-RUB`, and rates can use a comma or dot as the decimal separator.
- Confirm `backend/.env` has a valid `MONGO_URI` pointing to your database.
- Run the importer from the `backend/` folder:
  ```bash
  npm run import:rates -- --file=path/to/rates.csv
  ```
- Existing records for the same date/base/target are overwritten; new rows are inserted. The script closes the connection when finished and prints the number of imported entries.

### Importing balances from CSV
- Prepare a CSV file with columns: `year,month,email,account name,balance,net flow`. Delimiters can be commas or semicolons; decimals may use a comma or dot.
- The importer looks up the user by email and the account by name; if either is missing the row is skipped. Account status and month closure flags are not validated during this load.
- Run the importer from the `backend/` folder:
  ```bash
  npm run import:balances -- --file=path/to/balances.csv
  ```

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

## Deploying to Fly.io
The repository includes a multi-stage `Dockerfile` and `fly.toml` to run the compiled frontend and backend from a single Fly machine.

1. Install the Fly CLI and log in: `fly auth login`.
2. Configure required secrets (adjust values to your deployment):
   ```bash
   fly secrets set MONGO_URI="mongodb+srv://..." JWT_SECRET="prod-secret" INIT_TOKEN="init-secret"
   ```
3. Deploy using the provided config (listens on port 8080 inside the VM):
   ```bash
   fly deploy
   ```
   The Docker build compiles the React app, copies it into `backend/dist/public`, and serves it alongside the API from Express.

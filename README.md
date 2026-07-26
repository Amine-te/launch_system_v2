# launch_system_v2

## Running locally

**1. Start Postgres (Docker Compose)**
```bash
docker compose up -d
```

**2. Start the backend**
```bash
cd backend
.venv/bin/python -m alembic upgrade head      # apply migrations (first time / after pulling new ones)
.venv/bin/python -m scripts.seed_demo_users   # seed the 7 demo accounts (see below)
.venv/bin/uvicorn app.main:app --reload
```
Runs the API at `http://localhost:8000`, which must match `API_BASE_URL` in
`frontend/js/api/config.js`.

**3. Serve the frontend**
This is a plain JS app using `<script type="module">`, so opening
`index.html` directly via `file://` won't work — ES modules and `fetch()`
both get blocked by browsers under `file://`. Serve it over HTTP instead,
from the `frontend/` folder:
```bash
cd frontend
python3 -m http.server 5500
```
(or `npx serve frontend` if you have Node), then open `http://localhost:5500`.

**4. Open it**
You should land on the full-screen login card. Log in with a seeded demo
account below, or use the quick-login buttons.

⚠️ **CORS note:** the frontend (e.g. port 5500) and backend (port 8000) are
different origins. If `app/main.py` doesn't yet have `CORSMiddleware`
allowing the frontend's origin, login will fail with a CORS error in the
browser console (not a "wrong password" message) — add that middleware if
you hit this.

## Dev/demo login credentials

⚠️ **Dev-only — never real secrets.** These accounts are seeded locally for
development and demoing the app. Do not reuse this password anywhere, and do
not seed these accounts in any shared/staging/production database.

Seed them (from `backend/`, venv active):

```bash
python -m scripts.seed_demo_users
```

This creates/updates one account per role, all with password `DemoPass!2026`:

| Role | Email |
|---|---|
| Launch Engineer | a.rahal@launchops.example |
| Launch Manager | s.aitoubou@launchops.example |
| Plant Manager | k.benali@launchops.example |
| Warehouse Team Leader | m.elidrissi@launchops.example |
| Warehouse Personnel | i.chafai@launchops.example |
| Production & Packing Coordinator | y.mansouri@launchops.example |
| System Administrator | r.benali@launchops.example |

The frontend's login screen has a "Quick login" panel with one button per
role above — each one fills in and submits the real login form with these
credentials, it doesn't bypass authentication.
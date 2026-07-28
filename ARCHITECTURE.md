# architecture.md — Launch System

Status: living document, updated at the end of every roadmap step. Read
this and `db.md` before starting any new step so new code follows the
conventions already established instead of reinventing them.

Covers: **M00 — User Management** through **Step 1 — M01 Project
Management**.

## Stack

- **Backend:** FastAPI + SQLAlchemy 2.0 (declarative, `Mapped[...]`
  style) + Alembic, Postgres 16 (Dockerized, see `docker-compose.yml`).
  Run with `uvicorn app.main:app --reload` from `backend/`.
- **Frontend:** Plain JS (ES modules), no framework, no build step —
  `index.html` loads `js/main.js` as a `<script type="module">`. HTML is
  built with template strings, not JSX/a templating engine.
- **Auth:** JWT bearer tokens (`/auth/login`), 24h expiry, no refresh
  token yet (see `frontend/js/api/auth.js`'s module docstring for the
  documented trade-off). Stored in `sessionStorage`, not `localStorage`.

## Backend layout

```
backend/app/
  main.py            FastAPI app, CORS, router registration
  core/
    config.py        Settings (env-driven, no silent defaults for secrets)
    security.py      Password hashing + JWT encode/decode — the only file
                      that touches bcrypt/pyjwt directly
    audit.py          log_audit_event() — the only place that writes to
                      audit_events
  db/
    session.py        engine + SessionLocal + get_db() FastAPI dependency
    base.py            Declarative Base
  models/              One file per table (or tightly related pair, e.g.
                      project.py holds both Project and ProjectAssignment)
  schemas/             Pydantic request/response models, one file per
                      resource, named to match models/
  api/
    deps.py            get_current_user, require_role() — shared auth
                      dependencies every route module imports
    routes/            One router per resource, registered in main.py
  scripts/             One-off/seed scripts, run as `python -m scripts.x`
  alembic/versions/    One linear migration chain (see db.md)
```

### Conventions established so far

- **`require_role(*roles)` is a dependency factory**, not a bespoke check
  copy-pasted per route. `Depends(require_role(UserRole.admin))` at the
  router level when *every* route in a file needs the same gate (e.g.
  `users.py`, `reference_entries.py`, `project_assignments.py`); per-route
  when different endpoints in the same file need different role sets
  (`projects.py` — read is broader than write).
- **Role checks are always server-side**, never inferred from what the
  frontend happens to show. Every route module's docstring states the
  exact role rule it enforces and cites the SRS requirement it's
  implementing (e.g. `projects.py`'s module docstring walks through
  M01-FR-05/06/07 role-by-role). A hidden UI button is not access control.
- **404, not 403, for "you can't know this exists."** A Launch Engineer
  requesting a project outside their assignment gets a 404
  (`_assert_read_access` in `routes/projects.py`), the same way a locked-
  out user gets a generic "incorrect email or password" rather than
  "that account is locked" at login-attempt time when it would leak
  information. 403 is reserved for "you can see this exists, but can't
  act on it."
- **Fields computed server-side, never trusted from the client, are set
  directly onto the ORM instance right before serialization** via a small
  `_decorate()` helper (see `projects.py`'s `_decorate` setting
  `can_write`/`owner_name`, `project_assignments.py`'s setting
  `project_name`/`user_full_name`/etc.). The Pydantic schema declares
  these as ordinary output fields (`from_attributes=True` reads them like
  any other attribute) — the schema's docstring says which fields are
  "not real columns" and where they get set.
- **Deactivate, never delete, for anything with an audit trail.** Users
  are never deleted (M00-FR-04). This step's projects *can* be deleted
  (M01-FR-02 says so explicitly, unlike users), but only when nothing
  references them yet (M01-AC-05) — see db.md's note on
  `_project_has_purchase_orders()`.
- **Audit every mutation.** Every create/update/delete route that
  represents a real user action calls `log_audit_event()` before
  `db.commit()`, in the same transaction as the change it's describing.
  Read endpoints don't audit.
- **One CRUD surface per conceptually-one resource, discriminated by a
  type column, instead of N near-identical endpoints.** Established by
  `reference_entries` (six lists, one table, one router,
  `list_type` discriminator) and continued by nothing new this step, but
  the pattern is why `audit_events` is one generic table rather than
  one per module.
- **Every route module's docstring names the SRS requirement(s) it
  implements** and explains any non-obvious design choice inline, next to
  the code it's explaining — not just here. This file records
  cross-cutting conventions; the "why" for any one specific rule lives in
  the file that enforces it.

## Frontend layout

```
frontend/js/
  main.js                 Entry point: boots the app, session gate,
                           kicks off any data that's eagerly loaded at
                           login (see "Eager vs lazy loading" below)
  state.js                 Single mutable `state` object + page-persistence
  expose-globals.js        Side-effect import: attaches every function used
                           by inline onclick/onchange HTML attributes to
                           `window` (the app has no event-delegation layer)
  api/                     One file per backend resource. Thin wrappers
                           around fetch() — no business logic, no mapping.
                           `authFetch()` (api/auth.js) is the only one that
                           attaches the bearer token / handles 401.
  data/                    Live, mutable "store" modules (see below) plus
                           mock-data.js for anything not yet backed by a
                           real endpoint
  pages/                   One file per page/route, exporting `pageX()`
                           render functions plus that page's event handlers
  components/              Shared chrome: nav, breadcrumb, topbar, modal
  utils/                    Formatting/lookup helpers with no page identity
```

### The live-store pattern

Established by `data/admin-store.js` (M00) and reused as-is by
`data/projects-store.js` (Step 1) for every resource backed by a real
endpoint:

1. **A plain, exported, mutable array** (`ADMIN_USERS`, `PROJECTS`,
   `PROJECT_ASSIGNMENTS`, ...) — not a getter, not a class instance. Every
   existing call site across the app does `PROJECTS.find(...)`,
   `.filter(...)`, `.length` etc. directly on it.
2. **A `loadX()` function** that fetches from the real API, then clears
   and refills the array **in place** (`target.length = 0;
   target.push(...items)`) rather than reassigning it — so every module
   that imported the array keeps a valid reference across a reload; no
   importer has to re-subscribe.
3. **An `xStatus` object** (`{ loading, loaded, error }`) any page can
   check before rendering.
4. **An `ensureXLoaded()` helper** in the *page* module (not the store) —
   kicks off `loadX()` if it hasn't started, returns the current status,
   and the page renders a loading/error skeleton until `status.loaded`
   flips true (the fetch's own `.then(renderPage)` re-renders once real
   data lands). This exists because render functions can't `await` —
   `renderPage()` needs HTML back synchronously.
5. **A `mapX(apiObject)` function** translating the wire shape
   (snake_case, backend ids) to whatever shape the existing page code
   already expects (camelCase, display-formatted dates, etc.) — so
   switching a page from a mock array to a live store only ever changes
   its import line, never its render logic.

New in Step 1: `projects-store.js` additionally documents a field-mapping
convention worth carrying forward — when a resource has both a
human-facing display id (`PRJ-004`) and a real numeric backend id, the
mapped object exposes both (`id` = display code, for every existing
`.find(p => p.id === ...)` call site; `backendId` = the real id, for
mutation functions to send to the API). Don't introduce a third shape;
extend this one if a future resource needs the same split.

### Eager vs. lazy loading

Two different loading triggers exist, and the choice isn't automatic —
match it to who actually reads the data:

- **Eager, at login** (`main.js`'s `onAccountChange`/`initAccountSwitcher`
  callbacks): for data read by pages across the *entire* app regardless of
  role — `loadReferenceEntries()` and `loadProjects()` both fire here,
  because dashboards, materials-stock, simulation, and the PO/BOM pages
  all read `PROJECTS` for lookups, not just the Projects page itself.
- **Lazy, on first visit** (`ensureXLoaded()` called from inside a page's
  own render function): for data only one section of the app ever reads
  — `ADMIN_USERS`, `ADMIN_LOGIN_EVENTS`, and `PROJECT_ASSIGNMENTS` are all
  lazy, since only Admin pages read them. A user who never opens Admin
  never pays for that fetch.

When adding a new live store, ask "does anything outside this store's own
page(s) read it?" — if yes, eager-load in `main.js` next to
`loadProjects()`; if no, lazy-load via `ensureXLoaded()` the way
`data/admin-store.js`'s exports already do.

### Search index

`data/mock-data.js`'s `buildSearchIndex()` is a **function**, not a
precomputed constant — it has to be, since it indexes live stores
(`PROJECTS`) that start empty and fill in asynchronously after login,
unlike the still-mocked arrays it also indexes (`POS`, `PNS`, etc.). If a
future resource that feeds the search index also moves from mock to live,
this function doesn't need to change — it already re-reads whatever's
currently in the imported array on every call. `components/topbar.js`
calls `buildSearchIndex()` fresh on every keystroke rather than reading a
cached result, for the same reason.

### Deleting a mock array

When a resource moves from `mock-data.js` to a live store: delete the
array, don't comment it out, and leave a short explanatory comment in its
place pointing at the live replacement (see `mock-data.js`'s comments
above where `ADMIN_USERS`/`PROJECTS`/`ADMIN_ASSIGNMENTS` used to be) —
this makes it impossible for a stale import to silently keep working, and
tells the next reader where the real data now lives without needing to
dig through history. Grep every file for the removed export name before
considering the migration done; several pages import the same array
purely for cross-referencing (e.g. `PROJECTS` is read by materials-stock,
simulation, and the PO/BOM pages, not just `pages/projects.js`) and each
one needs its import switched, not just the page that "owns" the
resource.

## Cross-cutting: what "wiring a page to the real backend" means here

Every step so far (and every step in the roadmap) follows the same shape,
established in M00 and unchanged in Step 1:

1. Backend: model + migration + schema + router, role rules enforced
   server-side per the SRS table for that module.
2. `api/<resource>.js`: thin fetch wrappers, no logic.
3. `data/<resource>-store.js`: live store per the pattern above.
4. `pages/<page>.js`: switch the import from `mock-data.js` to the new
   store; add `ensureXLoaded()` + a loading skeleton if the page didn't
   already have one; wire create/update/delete handlers to the store's
   mutation functions, `await`ing them and calling `openModal(...)` on
   failure rather than assuming success.
5. Grep for the old mock export everywhere it's imported, not just in the
   page being actively worked on, and update each reader.
6. Update `db.md` and this file.

Nothing in Step 1 deviated from this shape — it's the first step to
*reuse* it wholesale (both for `projects-store.js` itself and for wiring
`pages/admin.js`'s Project Assignments section to a resource that didn't
exist when that page was first built).
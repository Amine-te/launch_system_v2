# db.md — Launch System Database

Status: living document, updated at the end of every roadmap step. Reflects
the schema as it actually exists in `backend/app/models/` and
`backend/alembic/versions/` today — not the aspirational full design in
`draft/db_draft.dbml` (see "Relationship to draft/db_draft.dbml" below).

Covers: **Step 0 — Foundational Audit Log** (folded into Step 1) and
**M00 — User Management** through **Step 1 — M01 Project Management**.

## Migration chain

Single linear chain, current head `5a7c14f9d2b1`:

```
7c22b59ed111  baseline, no models yet
  -> e6e8dbfb6844  create users table
  -> b3d4a7f10c2e  add user full_name and is_active
  -> 2e84584260e8  add account lockout and login_events
  -> 99dfdc4e6e63  add reference_entries table
  -> 5a7c14f9d2b1  add projects, project_assignments, and audit_events   [HEAD]
```

Run with (from `backend/`, venv active, `.env` pointing at the Dockerized
Postgres in `docker-compose.yml`):

```
alembic upgrade head
```

## Tables

### `users` (M00)

| Column | Type | Notes |
| --- | --- | --- |
| `id` | int, PK | |
| `email` | varchar(255), unique, indexed | used as the username |
| `hashed_password` | varchar(255) | bcrypt via passlib |
| `full_name` | varchar(255) | |
| `role` | enum `user_role` | `engineer, manager, plant, wh_lead, wh_staff, prod_coord, admin` |
| `is_active` | bool, default true | M00-FR-04/05: deactivated, never deleted |
| `failed_login_attempts` | int, default 0 | M00-FR-12 |
| `locked_at` | timestamptz, nullable | non-null == locked (M00-FR-12); `is_locked` is a Python property, not a column |
| `last_login_at` | timestamptz, nullable | |
| `created_at` | timestamptz | |

### `login_events` (M00-FR-13)

Append-only. `username` is stored as plain text, not a FK to `users` — a
run of failed attempts against an email with no matching account is still
worth auditing, so it can't require a real user row to exist.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | int, PK | |
| `username` | varchar(255), indexed | as typed at the login form |
| `result` | enum `login_result` | `success, failed` |
| `reason` | varchar(255) | free text, e.g. "Incorrect password — attempt 3 of 5" |
| `source_ip` | varchar(64) | |
| `created_at` | timestamptz | |

### `reference_entries` (M00-FR-14..16)

One table for all six reference lists, distinguished by `list_type`,
instead of six near-identical tables.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | int, PK | |
| `list_type` | enum `reference_list_type`, indexed | `customers, contacts, fgpn, receivers, methods, materialTypes` |
| `label` | varchar(255) | |
| `project` | varchar(255), nullable | only meaningful for `list_type == fgpn` |
| `reference_codes` | JSON, nullable | only meaningful for `list_type == customers` |
| `is_active` | bool, default true | M00-FR-15: inactive entries hidden from dropdowns, kept in historical records |
| `created_at` | timestamptz | |

### `projects` (Step 1 — M01)

| Column | Type | Notes |
| --- | --- | --- |
| `id` | int, PK | |
| `name` | varchar(255), unique, indexed | case-insensitive duplicate check done in the route layer, not the DB |
| `customer` | varchar(255) | |
| `customer_ref` | varchar(255), nullable | snapshot of the reference-entry customer code at the time the customer was picked — not re-derived live (see Design decisions) |
| `owner_user_id` | int, FK → `users.id` | the project's single assigned Launch Engineer (M01-FR-02) |
| `site` | varchar(255), default `''` | |
| `description` | text, default `''` | |
| `status` | enum `project_status`, default `Draft` | `Draft, On Track, At Risk, Blocked` — values match the frontend's display strings exactly, no translation layer |
| `start_date` | date, nullable | |
| `target_date` | date, nullable | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz, onupdate | |

No `progress`/`health` columns — see "Design decisions" below.

`code` (e.g. `PRJ-004`) is a computed Python property on the model, never
stored, derived from `id` so it can never drift out of sync.

### `project_assignments` (Step 1 — M01 / M00-FR-07..09)

Who has write access to a project, and in what capacity.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | int, PK | |
| `project_id` | int, FK → `projects.id`, `ondelete=CASCADE`, indexed | |
| `user_id` | int, FK → `users.id`, indexed | |
| `role` | enum `assignment_role` | `engineer, manager` |
| `created_at` | timestamptz | |

Unique constraint `uq_project_assignment` on `(project_id, user_id, role)`.

Every project's owner automatically gets a matching `role='engineer'` row
at creation time. A Launch Manager who creates a project (or is later
assigned by the System Administrator) gets a `role='manager'` row. This
table is the **only** place write access is ever checked — never a direct
comparison against `projects.owner_user_id` (see Design decisions).

### `audit_events` (Step 0, folded into Step 1)

Append-only, general-purpose action log every future module writes to.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | int, PK | |
| `actor_id` | int, FK → `users.id`, nullable | nullable in principle for a future system-triggered event; always populated today |
| `actor_name` | varchar(255) | snapshot at event time — a later name change doesn't rewrite history |
| `module` | varchar(100), indexed | e.g. `"Projects"`, `"Administration"` |
| `action` | varchar(255) | e.g. `"Project created"` |
| `entity_type` | varchar(100), nullable | e.g. `"project"` |
| `entity_id` | varchar(100), nullable | |
| `project` | varchar(255), nullable, indexed | project name at event time |
| `po` | varchar(100), nullable | reserved for when purchase orders are real (Step 2/3) |
| `details` | text, default `''` | free-form human-readable description |
| `created_at` | timestamptz, indexed | |

Written via the single `app/core/audit.py:log_audit_event()` helper so
every caller stays consistent — callers `db.add()` the row and are
responsible for the commit, so it lands in the same transaction as the
change it describes.

## Design decisions made this step

**`project_assignments` as its own table, not a column.** The roadmap
asked us to pick one of three shapes for the assignment relationship: a
`project_assignments` table, a column on `projects`, or reusing
`ADMIN_USERS`' old local `.projects` bookkeeping. We went with a real
table because:
- A project needs *two* kinds of assignees (an owning engineer and,
  independently, a manager with "own" write access per M01-FR-07) — a
  single FK column on `projects` only cleanly expresses the first.
- It has to be queryable from both directions: "which projects can this
  user write to" (used on every list/write-access check) and "who is
  assigned to this project" (the Admin assignment page) — a join table is
  the natural shape for that, a denormalized array column is not.
- It's the thing `M00-FR-07..09` already describes ("assign one or more
  Launch Engineers or Launch Managers to a project") — modeling it
  directly instead of bolting it onto `projects` keeps the schema close to
  the SRS language.

`projects.owner_user_id` still exists as a direct FK (not derived from
`project_assignments`) because M01-FR-02 talks about "the Launch Engineer
assigned to a project" as a single, first-class fact — the project record
should be able to say who its engineer is without a join. But it is
**not** used for access control: `_can_write()` in
`routes/projects.py` only ever queries `project_assignments`. This means
`owner_user_id` and the matching `project_assignments` row are kept in
sync explicitly by the route layer (create, and the owner-reassignment
branch of update) rather than one being derived from the other at read
time — simpler to reason about than a computed/denormalized owner, at the
cost of the route layer being responsible for keeping them consistent.

**No `progress`/`health` columns on `projects`.** The old frontend mock
hand-picked these numbers (`progress: 72, health: 88`, etc.) with no real
source. The modules that would make a genuine progress/health figure
meaningful — purchase orders, BOM, simulation — don't exist as real tables
yet (Steps 2–7). Per the roadmap's "don't fake fields with no real
source," this step leaves them out of the schema entirely. The frontend
(`data/projects-store.js`) computes an honest, clearly-labeled stand-in
instead: a "how far through the scheduled window are we" percentage
derived from `start_date`/`target_date`. This should be revisited once
PO/BOM/production data is real.

**`customer_ref` is a snapshot, not a live lookup.** It's copied onto the
project at creation time from whatever reference-entry code was selected,
rather than joined live from `reference_entries` on every read. A
project's own record of "what the customer ref was when we picked this
customer" shouldn't silently change if an admin edits or deactivates that
reference-list entry later — the same reasoning M00-FR-15 already applies
to reference entries in general (inactive entries stay visible in
historical records).

**`audit_events` is deliberately generic**, not one table per module.
Every caller passes `module`/`action`/`entity_type`/`entity_id`/`project`/
`po`/`details`; new modules don't need a schema change here, only a new
call site. This is the same reasoning as `reference_entries` being one
table with a `list_type` discriminator instead of six.

## Known simplifications (honest, not silent)

- **`_project_has_purchase_orders()` in `routes/projects.py` always
  returns `False`.** M01-AC-05 requires blocking deletion of a project
  with linked purchase orders, but `purchase_orders` doesn't exist as a
  table yet (that's M03, Step 3). The check is real code, wired into both
  `update_project` (identity-field locking) and `delete_project`, with an
  explicit comment marking it as always-true-today — same pattern as
  `reference_entries`' delete endpoint, which has an identical caveat for
  the same reason. Both need a one-line swap to a real `select(...)` query
  once the target table exists.
- **`audit_events.po` is unused today** — reserved for when purchase
  orders are real; every call site so far passes `po=None` implicitly.

## Relationship to `draft/db_draft.dbml`

`db_draft.dbml` is a hardened, full-system logical design covering every
module through M12 (UUID keys, hash-chained append-only audit, RLS notes,
etc.) — a target to converge toward, not a literal spec for what gets
built in any one step. The actual models deliberately diverge from it
where the simpler shape is enough for what's built so far:

- **Integer PKs, not UUIDv7.** Nothing here needs globally-unique or
  externally-generated ids yet; auto-increment ints are simpler to work
  with locally and in tests.
- **`projects`/`project_assignments`/`audit_events` are simpler than
  their dbml counterparts** — no `row_version` optimistic-locking column,
  no hash-chained `prev_hash`/`event_hash` on `audit_events`, no
  `stream_key`/`sequence_no`. Those are real hardening concerns for a
  production system but not needed to satisfy M01's functional
  requirements or acceptance criteria today. If/when audit tamper-evidence
  becomes a real requirement (M12, Step 11), that's the point to revisit
  `audit_events` toward the dbml's hash-chain design — not before, since
  building it now would mean guessing at a shape nothing exercises yet.
- **No `customers` table.** `projects.customer` is a plain string today,
  matching how the old frontend mock modeled it and how M00's `customers`
  reference list already works (label + optional reference codes, no
  separate customer entity). The dbml's `customers` table with a real
  `projects.customer_id` FK is where this should end up if/when customer
  records need their own identity beyond a reference-list label.

None of this is a rejection of the dbml's design — it's a "simplest thing
that satisfies the current step" default, documented here so it's an
explicit, revisitable choice rather than silent drift.
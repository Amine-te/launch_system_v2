# Database Documentation — Launch System

Status: living document, updated after every roadmap step (see
`roadmap.md`) that touches the schema. This file describes what is
**actually implemented and migrated**, not what's planned.

`draft/db_draft.dbml` is the original brainstorm sketch from before any
backend existed — it's more normalized and ambitious than what's actually
built (e.g. it has separate `roles`/`permissions`/`role_permissions`/
`user_role_assignments` tables where the real implementation uses a
single enum column on `users`). It's kept for reference only. **Where
this file and the draft disagree, this file is correct.**

## Stack

- PostgreSQL, run via `docker-compose.yml` in dev.
- SQLAlchemy 2.0 (declarative style, `Mapped`/`mapped_column`), not the
  legacy `Column(...)` style — keep new models consistent with this.
- Alembic for migrations, one revision per roadmap step (not one per
  table — a step that adds two related tables is one migration).
- No automated test suite yet (see architecture.md's Gaps section) —
  verification is manual, against each SRS module's acceptance criteria.

## Conventions established in M00

These aren't stylistic preferences — each one exists because of a real
bug hit while building M00. Follow them for every new table.

1. **Soft-delete via `is_active: bool`** for anything a user creates that
   other records might reference (users, reference entries). Never hard-
   delete a row that could be linked elsewhere. `reference_entries` is
   the one place with a real hard-DELETE endpoint, and it's guarded by a
   linked-record check (SRS M00-FR-16) — see that route's docstring for
   why the check currently always passes (nothing else has a backend yet
   that could link to it) and what it needs once something does.

2. **One model file per table** under `backend/app/models/`, all
   re-exported from `backend/app/models/__init__.py` — required for
   Alembic autogenerate to see them, easy to forget when adding a table.

3. **Separate Pydantic schemas per operation** under
   `backend/app/schemas/`: `<X>Out` (response, `from_attributes=True`),
   `<X>Create`, `<X>Update` (all fields optional, `exclude_unset=True` on
   the server side so a PATCH only touches what was actually sent).

4. **Enum member name vs. value — always keep them identical.** Python
   `(str, Enum)` classes let you set a member's value independently of
   its name (e.g. `material_types = "materialTypes"`), and it's tempting
   to do this to match a frontend naming convention. Don't. SQLAlchemy's
   `Enum(SomeEnumClass, ...)` column type defaults to binding/reading by
   the member's **name**, not its value — if they diverge, every read/
   write silently sends the wrong string to Postgres's native enum type
   and fails once you hit the divergent member. This exact bug shipped
   in `ReferenceListType.material_types` (name `material_types`, value
   `materialTypes`) and had to be fixed with
   `values_callable=lambda cls: [m.value for m in cls]` on the column's
   `Enum(...)`. Simplest fix for any *new* enum: make name == value
   always, and this whole problem doesn't exist.

5. **Postgres native enum + `create_table` in the same migration — let
   `create_table` create the type, don't call `.create()` yourself.**
   Two earlier attempts at the `login_events`/`reference_entries`
   migrations explicitly called `some_enum.create(op.get_bind(),
   checkfirst=True)` before `op.create_table(...)`, both with and
   without `create_type=False` on the `Enum(...)` object — both still hit
   `DuplicateObject: type "X" already exists`, because `create_table`'s
   own default behavior (`create_type=True`) tried to create the same
   type a second time in the same transaction. The pattern that actually
   works, proven by the original `create_users_table` migration: no
   explicit `.create()` call at all, just use the `Enum(...)` object as
   a column type inside `create_table` and let it create the type once.
   Only call `.drop()` explicitly, in `downgrade()`, after `drop_table`.

6. **Migration revision ids**: `python3 -c "import secrets;
   print(secrets.token_hex(6))"`, filename
   `<revision>_<snake_case_description>.py`, matching Alembic's own
   autogenerate convention.

7. **Seed scripts** live in `backend/scripts/`, are idempotent (check
   for an existing row before inserting, matched the same way the app
   itself checks for duplicates), and are never run automatically — run
   manually with `python -m scripts.<name>` after migrating. Two exist
   so far: `seed_demo_users.py`, `seed_reference_lists.py`.

## Tables implemented (as of M00)

### `users`
| Column | Type | Notes |
|---|---|---|
| id | int, PK | |
| email | str, unique | Doubles as the login username — SRS M00-FR-02 asks for a "username"; the schema's own comment documents the deliberate decision to use email rather than add a separate field. |
| hashed_password | str | bcrypt via passlib |
| full_name | str | |
| role | enum `user_role` | `engineer`, `manager`, `plant`, `wh_lead`, `wh_staff`, `prod_coord`, `admin`. One role per user (SRS M00-FR-03: single role, not the draft's many-to-many role assignment table). |
| is_active | bool | soft-delete / deactivate flag |
| failed_login_attempts | int, default 0 | SRS M00-FR-12 |
| locked_at | datetime, nullable | NULL = not locked. Set the instant `failed_login_attempts` hits 5. Only cleared by an admin's unlock action. |
| last_login_at | datetime, nullable | |
| created_at | datetime | |

### `login_events`
SRS M00-FR-13 — every login attempt, successful or failed.

| Column | Type | Notes |
|---|---|---|
| id | int, PK | |
| username | str, indexed | the attempted email, even if it doesn't match a real account |
| result | enum `login_result` | `success`, `failed` |
| reason | str | human-readable ("Incorrect password -- attempt 3 of 5", "Account locked after 5 failed attempts", "Account deactivated", "Authenticated") |
| source_ip | str | |
| created_at | datetime | |

### `reference_entries`
SRS M00-FR-14..16 — one table backing all six reference lists, not six
separate tables (they share the same shape).

| Column | Type | Notes |
|---|---|---|
| id | int, PK | |
| list_type | enum `reference_list_type` | `customers`, `contacts`, `fgpn`, `receivers`, `methods`, `materialTypes` |
| label | str | |
| project | str, nullable | only meaningful for `list_type == fgpn` |
| reference_codes | JSON list[str], nullable | only meaningful for `list_type == customers`; column named to avoid `REFERENCES`, a reserved SQL keyword |
| is_active | bool | |
| created_at | datetime | |

Case-insensitive duplicate label checking within a `list_type` is
enforced at the application layer (route-level query), not a DB
constraint.

## Migration chain (current head: `99dfdc4e6e63`)

| Revision | Depends on | Description |
|---|---|---|
| `7c22b59ed111` | — | baseline (pre-existing) |
| `e6e8dbfb6844` | `7c22b59ed111` | create `users` table |
| `b3d4a7f10c2e` | `e6e8dbfb6844` | add `full_name`, `is_active` to `users` (pre-existing) |
| `2e84584260e8` | `b3d4a7f10c2e` | add lockout fields to `users`, create `login_events` |
| `99dfdc4e6e63` | `2e84584260e8` | create `reference_entries` |

## Not yet modeled

Everything below M00 is still frontend-only mock data (see
`architecture.md`'s Current Implementation Status). Rough table needs per
upcoming roadmap step, for orientation only — the actual schema gets
decided and documented here when each step is built, not designed in
advance:

| Roadmap step | SRS module | Will need roughly |
|---|---|---|
| 1 | M01 Project Management | `projects`, `audit_events` (general-purpose, foundational) |
| 2 | M02 PO Intake/Extraction | raw PO document storage, extracted-field staging |
| 3 | M03 PO Storage/Versioning | `purchase_orders` (immutable versions) |
| 4 | M04 PO Status Tracking | status column/table + transition history |
| 5 | M06 BOM | BOM header + line items, template version |
| 6 | M07 Stock | stock records, reception log, 24h-lock/correction trail |
| 7 | M05 Simulation | mostly computed from 4/5/6, maybe a simulation-run log |
| 8 | M08 Warehouse Delivery | delivery instructions, time-limited delivery codes |
| 9 | M09 Customer Delivery | delivery instructions (reuses M00's `methods` reference list) |
| 10 | M10 Finance | price records with change history, revenue calculations |
| 11 | M12 Audit | mostly assembled from other tables + `audit_events` |
| 12 | M11 Dashboards | no new tables expected, aggregation only |

## How to update this file

After finishing a roadmap step: add its table(s) to "Tables implemented"
in the same format as M00's, append its migration(s) to the chain table,
and remove its row from "Not yet modeled".
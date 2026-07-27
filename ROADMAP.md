# Implementation Roadmap — Launch System

Status: living document. One step = one module = one session (roughly).
Each step below is written as a ready-to-paste prompt for a fresh Claude
session. Steps are ordered by actual dependency, not by SRS module number
— the SRS numbers M05 (Simulation) before M06 (BOM) and M07 (Stock), but
Simulation needs both, so this roadmap builds M06 and M07 first.

## How to use this file

1. Work top to bottom. Don't skip ahead — later steps assume earlier ones
   are done and real (backend + frontend), not mocked.
2. Before running a step's prompt, paste in `architecture.md` and `db.md`
   from the project root (or just tell Claude to read them from the repo)
   so it picks up the established conventions instead of reinventing them.
3. Each step is scoped to be independently testable end-to-end through the
   running app, the same way M00 was (see the manual test table produced
   for M00 as the template for what "testable" means here).
4. After each step, both `db.md` and `architecture.md` should get updated
   — that's a required part of every prompt below, not an afterthought.
5. Check off a step (change `- [ ]` to `- [x]`) once it's built, tested,
   and merged.

## Progress

- [x] Step 0 — Foundational Audit Log (folded into Step 1, see note below)
- [x] M00 — User Management, Authentication, Reference Lists (done — see db.md)
- [ ] Step 1 — M01 Project Management
- [ ] Step 2 — M02 Purchase Order Intake, Extraction, Validation
- [ ] Step 3 — M03 Purchase Order Storage, Versioning, Comparison
- [ ] Step 4 — M04 Purchase Order Status Tracking
- [ ] Step 5 — M06 Bill of Material and Material Requirements
- [ ] Step 6 — M07 Stock Management
- [ ] Step 7 — M05 Launch Manufacturing Simulation
- [ ] Step 8 — M08 Warehouse-to-Manufacturing Delivery
- [ ] Step 9 — M09 Customer Delivery
- [ ] Step 10 — M10 Finance, Recovery, and Sales Forecasting
- [ ] Step 11 — M12 Audit and Traceability
- [ ] Step 12 — M11 Dashboards and Monitoring (consolidation pass)

Note on M11 (Dashboards): every step above touches its own role dashboard
in passing (the way M00 touched `dashAdmin`) — wiring the *rest* of each
dashboard to real data as you go is cheaper than leaving it all for one
giant step at the end. Step 12 exists to catch whatever's left over, not
to do all dashboard work in one sitting.

---

## Step 0 — Foundational Audit Log

Skip this as its own prompt. `login_events` (M00) already established the
pattern for an append-only, auto-logged table. When you run Step 1's
prompt below, it asks for a general-purpose `audit_events` table (actor,
action, entity type + id, project, details, timestamp) that every future
module writes to, replacing the frontend's `AUDIT_LOGS` mock the same way
`login_events` replaced the old mock login array. Bundling it into Step 1
avoids a step that has nothing user-facing to test on its own.

---

## Step 1 — M01 Project Management

```
Implement SRS M01 (Project Management) for the Launch System, following
the conventions in architecture.md and db.md (read both from the repo
root first).

Scope for this step:
- Backend: a `projects` table (name, customer, customer_ref, engineer/
  owning user, site, start_date, target_date, description, status,
  progress/health if easily derivable — don't fake fields with no real
  source). CRUD endpoints per M01-FR-01/02/07: create, read, update,
  delete, with the exact role rules in M01.5's table (Plant Manager:
  read-only all; Launch Manager: read all, write own; Launch Engineer:
  read+write only assigned; enforce M01-FR-06 access restriction
  server-side, not just by hiding UI).
- Also add a general-purpose `audit_events` table now (see the Step 0
  note above) and have project create/update/delete write to it.
- Prevent deletion of a project with existing purchase orders
  (M01-AC-05) — note purchase orders don't exist as a real table yet
  (that's Step 2/3), so this check will currently always pass; leave an
  honest comment saying so, the same way the reference-entries delete
  endpoint documents that its own linked-record check is currently
  always-true for the same reason.
- Frontend: wire pages/projects.js's project list/detail/create/edit
  views to the real API, following the exact ADMIN_USERS pattern in
  data/admin-store.js (live store, loadX(), xStatus flags,
  ensureXLoaded(), loading skeleton). Remove the PROJECTS mock array
  from data/mock-data.js once nothing reads from it anymore — check
  every file that currently imports PROJECTS (grep for it) since
  several other pages reference it for dropdowns; note which of those
  are still legitimately mocked (their own module isn't built yet) vs.
  need to switch to the new live store.
- Also wire Admin's Project Assignments page (pages/admin.js) to real
  projects now that they exist — this was explicitly left mocked in
  M00 because there was no Project table yet. Keep the assignment
  *relationship* itself as you find it (decide: new project_assignments
  table, or a column on projects, or reuse ADMIN_USERS' local
  `.projects` bookkeeping — pick one and document the decision in
  db.md).

Explicitly out of scope — do not touch:
- Purchase orders, BOM, stock, simulation, delivery, finance. Their
  mock data and pages stay exactly as they are.

Testing: after implementing, give me the exact manual steps to verify
each of M01-AC-01 through M01-AC-05 through the running app, the same
format as the M00 test table.

Update db.md (new `projects` and `audit_events` tables, migration
chain) and architecture.md (note the live-store pattern was reused, any
new decision like the project_assignments question above) to reflect
this step. Give me the changed/added files to paste over my project,
same as before.
```

---

## Step 2 — M02 Purchase Order Intake, Extraction, Validation

```
Implement SRS M02 (Purchase Order Intake, Extraction, and Validation)
for the Launch System, following architecture.md and db.md.

Scope for this step:
- Backend: an endpoint to upload a PO PDF (per M02.2), store the raw
  file (decide and document in db.md: filesystem path column vs. blob
  column vs. object storage — pick the simplest thing that works
  locally, document the tradeoff), and a parsing/extraction step
  (M02.3) that pulls out the fields M02 defines. If real PDF-parsing
  logic is a large undertaking, it's fine to implement a real but
  simple extraction (e.g. a text-layer regex/heuristic pass) rather
  than an AI-based one for this step — flag that as a documented
  simplification in db.md/architecture.md rather than silently faking
  extracted values.
- Validation (M02.4) and user review/correction (M02.5): the extracted
  data must be editable by the user before it's accepted, per M02-BP-01
  (M02.6).
- Reject non-PDF uploads outright (M02.7).
- Frontend: wire pages/po-intake.js's upload/review flow to the real
  endpoints, same live-store pattern as before. This step does NOT
  include persisted storage/versioning of the *accepted* PO — that's
  Step 3 (M03). If the boundary between "extracted, under review" and
  "stored, versioned" data is unclear, treat this step as ending right
  before a PO is confirmed/saved, and stub that final save as a TODO
  Step 3 will fill in (document the seam clearly rather than building
  half of M03 here).

Explicitly out of scope: PO status tracking (M04), simulation, BOM,
everything downstream.

Testing: give me manual steps to verify M02's acceptance criteria
(M02.8) through the running app.

Update db.md and architecture.md. Give me the changed/added files.
```

---

## Step 3 — M03 Purchase Order Storage, Versioning, Comparison

```
Implement SRS M03 (Purchase Order Storage, Versioning, and Comparison)
for the Launch System, following architecture.md and db.md.

Scope for this step:
- Backend: the `purchase_orders` table and a versioning scheme per
  M03.3 (M03-BP-01 in M03.6: stored versions are immutable — a new PO
  version is a new row/record, never an in-place edit of an accepted
  one). Version comparison (M03.4) and the calculated fields in M03.5.
  This is where Step 2's "review, not yet saved" PO data gets its real
  save-and-store step.
- Frontend: wire the PO storage/version-history/comparison views to
  real data, same pattern as before.

Explicitly out of scope: PO status *tracking* (that's M04 — this step
is about storage/versioning, not the status lifecycle), simulation,
BOM, delivery, finance.

Testing: manual steps for M03's acceptance criteria (M03.7).

Update db.md and architecture.md. Give me the changed/added files.
```

---

## Step 4 — M04 Purchase Order Status Tracking

```
Implement SRS M04 (Purchase Order Status Tracking) for the Launch
System, following architecture.md and db.md.

Scope for this step:
- Backend: the status field/lifecycle per M04.2's defined statuses and
  M04.4's transition model (BP) — enforce valid transitions server-side,
  don't just trust whatever the frontend sends.
- Every status change should write to the audit_events table from
  Step 1.
- Frontend: wire status displays and transition actions across
  wherever PO status currently shows (purchase-orders.js and any
  dashboard/list that shows PO status) to the real field.

Explicitly out of scope: simulation, BOM, stock, delivery, finance.

Testing: manual steps for M04's acceptance criteria (M04.5).

Update db.md and architecture.md. Give me the changed/added files.
```

---

## Step 5 — M06 Bill of Material and Material Requirements

```
Implement SRS M06 (Bill of Material and Material Requirements) for the
Launch System, following architecture.md and db.md.

Scope for this step:
- Backend: BOM upload (M06-FR-01) via .xlsx (M06.2), parsed and
  validated against the expected template (M06-FR-03) — reject with a
  clear error on mismatch, don't silently accept malformed data.
  BOM data + calculations per M06.3. Template versioning (M06-BP-01,
  M06.4).
- Frontend: wire pages/parts-bom.js to the real upload/data endpoints.

Explicitly out of scope: simulation (Step 7 — this step only makes BOM
data available for simulation to later consume), stock, delivery.

Testing: manual steps for M06's acceptance criteria (M06.5).

Update db.md and architecture.md. Give me the changed/added files.
```

---

## Step 6 — M07 Stock Management

```
Implement SRS M07 (Stock Management) for the Launch System, following
architecture.md and db.md.

Scope for this step:
- Backend: material stock records, reception recording (M07.2) with
  search-as-you-type support (M07-FR-01/02 — partial match on part
  number and description), the 24-hour edit lock and Launch-Engineer
  override-with-reason after that window (M07-FR-05/06/07 — this is a
  real business rule, implement the time check server-side, not just
  in the UI), and the stock-update-within-5-seconds requirement
  (M07-FR-08 — in practice this just means "update synchronously in
  the same request", not literally a 5-second timer).
- CutMan import (mentioned in M07.1) — if there's no real CutMan file/
  API available to integrate against, implement the stock model to
  accept an import in that shape but stub the actual CutMan connection
  as a clearly-documented TODO rather than fabricating fake imported
  data.
- Frontend: wire pages/materials-stock.js to the real endpoints.

Explicitly out of scope: simulation (Step 7 consumes this), delivery.

Testing: read the full M07 block in draft/SRS_Launch_System_v2-bis.md
for its acceptance-criteria section and give me manual steps for each.

Update db.md and architecture.md. Give me the changed/added files.
```

---

## Step 7 — M05 Launch Manufacturing Simulation

```
Implement SRS M05 (Launch Manufacturing Simulation) for the Launch
System, following architecture.md and db.md. This step depends on
Steps 4 (PO status), 5 (BOM), and 6 (Stock) — confirm all three are
real before starting; if any aren't, stop and tell me rather than
building simulation logic against mock data for one of its three
inputs.

Scope for this step:
- Backend: simulation logic per M05.2 (single PO), M05.3 (multiple PO,
  with the priority/tie-break rule in M05-BP-01/M05.4), and M05.5
  (future stock simulation) using the three real inputs from Steps 4-6
  (warehouse stock, BOM, PO status) plus "remaining usable WIP
  material" from CutMan (per M05.2's input table) — if Step 6 stubbed
  the CutMan connection, this input should be explicitly documented as
  using that stub, not silently ignored.
- Frontend: wire pages/simulation.js to the real endpoints.

Explicitly out of scope: delivery, finance.

Testing: manual steps for M05's acceptance criteria (M05.8).

Update db.md and architecture.md. Give me the changed/added files.
```

---

## Step 8 — M08 Warehouse-to-Manufacturing Delivery

```
Implement SRS M08 (Warehouse-to-Manufacturing Delivery) for the Launch
System, following architecture.md and db.md.

Scope for this step:
- Backend: delivery instruction creation (M08.2) gated on an approved
  launch operation with uploaded meeting minutes (M08-FR-03 — this
  needs a real "launch operation approval + document upload" concept;
  if that doesn't exist yet as its own thing, build the minimum real
  version of it here rather than faking the gate). Delivery code
  generation with the 48-hour expiry (M08.3, M08-FR-04/05) enforced
  server-side. Code-based access flow (M08-FR-06/07).
- Frontend: wire pages/manufacturing-delivery.js to the real flow.

Explicitly out of scope: customer delivery, finance.

Testing: read the full M08 block for its acceptance-criteria section
and give me manual steps for each.

Update db.md and architecture.md. Give me the changed/added files.
```

---

## Step 9 — M09 Customer Delivery

```
Implement SRS M09 (Customer Delivery) for the Launch System, following
architecture.md and db.md.

Scope for this step:
- Backend: delivery instruction generation (M09.2) referencing PO,
  FGPN, quantity, and delivery method (M09-FR-03) — delivery methods
  already exist as real data from M00's reference lists
  (ADMIN_REFERENCE_LISTS.methods / the `methods` list_type in
  reference_entries), use that instead of creating a second list.
  Partial delivery tracking and confirmation per whatever M09's
  remaining functional requirements define (read the full M09 block).
- Frontend: wire pages/customer-delivery.js to the real flow — it
  already reads ADMIN_REFERENCE_LISTS for the method dropdown (M00
  wired that eagerly at login specifically so this page would have it
  ready); the rest of the page's data is still CUST_DELIVERIES mock,
  replace that.

Explicitly out of scope: finance.

Testing: manual steps for M09's acceptance criteria.

Update db.md and architecture.md. Give me the changed/added files.
```

---

## Step 10 — M10 Finance, Recovery, and Sales Forecasting

```
Implement SRS M10 (Finance, Recovery, and Sales Forecasting) for the
Launch System, following architecture.md and db.md.

Scope for this step:
- Backend: price records per FGPN and delivery-method transport cost
  (M10.2), with every price change tracked (effective date, previous/
  new value, username — M10-FR-05, this is an audit trail specific to
  price history, distinct from the general audit_events table; decide
  and document whether it's its own table or rows in audit_events with
  structured details). Period-based revenue calculation (M10.3) and
  whatever forecasting requirements the rest of M10 defines (read the
  full block).
- Frontend: wire pages/finance.js to the real endpoints.

Explicitly out of scope: nothing left downstream — this is the last
data-producing module before Steps 11-12.

Testing: manual steps for M10's acceptance criteria.

Update db.md and architecture.md. Give me the changed/added files.
```

---

## Step 11 — M12 Audit and Traceability

```
Implement SRS M12 (Audit and Traceability) for the Launch System,
following architecture.md and db.md. By this point audit_events (Step
1) has been accumulating real entries from every module — this step is
about surfacing and packaging that data per M12, not creating a new
logging mechanism.

Scope for this step:
- Backend: project audit document generation (M12.2) assembling the
  content table in M12-FR-02 from real records across the modules
  built so far (PO PDFs/versions from M03, status history from M04,
  corrections, comparison summaries, project tracking from M01, launch
  decisions, meeting minutes from M08). Whatever items on that list
  don't have a real source yet (because some module was scoped out)
  should be explicitly omitted with a documented reason, not faked.
- Frontend: wire pages/audit.js to real audit document generation and
  the real audit_events feed (replacing the AUDIT_LOGS mock everywhere
  it's still used — grep for it, there were ~12 files reading it as of
  M00).

Testing: manual steps for M12's acceptance criteria.

Update db.md and architecture.md. Give me the changed/added files.
```

---

## Step 12 — M11 Dashboards and Monitoring (consolidation)

```
Implement SRS M11 (Dashboards and Monitoring) for the Launch System,
following architecture.md and db.md. Every prior step should already
have touched its own role's dashboard in passing (the way M00 wired
dashAdmin) — this step is a consolidation pass, not the first time
dashboards get real data.

Scope for this step:
- Audit every role dashboard in pages/dashboards.js against what's now
  real vs. still mock, and wire whatever's left. Enforce M11's
  read-only rules per role (check the full M11 block for all role
  rules, not just Plant Manager/Launch Engineer).
- This is also the right point to do a final sweep for any remaining
  mock data anywhere in data/mock-data.js and confirm each remaining
  entry is either (a) genuinely still out of scope and clearly
  commented as such, or (b) something this step should finish wiring.

Testing: manual steps for M11's acceptance criteria, plus a full
role-by-role walkthrough (log in as each of the 7 seeded demo accounts,
confirm every dashboard shows real data with no leftover placeholders).

Update db.md and architecture.md to reflect final state. Give me the
changed/added files.
```
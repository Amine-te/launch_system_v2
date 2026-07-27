"""
Seed the six SRS M00-FR-14 reference lists with the same starter data the
frontend used to ship as a hardcoded mock (data/mock-data.js's old
ADMIN_REFERENCE_LISTS, now removed from that file). Without this, a fresh
database has zero reference entries -- and Customer Delivery's method
picker and Projects' JIT-customer lookups (frontend/js/pages/
customer-delivery.js, pages/projects.js) both read live off this table
now, so an empty table means those dropdowns are empty too, for every
role, not just Admin. Run this once against a fresh database (or a
database created before reference lists existed) to restore that
starting data as real, editable rows instead.

Idempotent: matched by (list_type, label) case-insensitively, same as
the app's own duplicate check -- rerunning this is a no-op after the
first run rather than creating duplicates.

Usage (from backend/, venv active):
    python -m scripts.seed_reference_lists
"""
from app.db.session import SessionLocal
from app.models.reference_entry import ReferenceEntry, ReferenceListType

# Labels lifted from frontend/js/utils/table-state.js's MFG_DELIVERY_RECEIVERS,
# which is what the old mock's `receivers` list was generated from.
RECEIVER_LABELS = [
    "Cell 1 \u2014 Cutting Line",
    "Cell 2 \u2014 Terminal Crimping",
    "Cell 3 \u2014 Harness Assembly",
    "Cell 4 \u2014 Final Assembly",
]

SEED_ENTRIES = [
    {"list_type": ReferenceListType.customers, "label": "BMW Group", "reference_codes": ["G05 LCI"]},
    {"list_type": ReferenceListType.customers, "label": "Renault", "reference_codes": ["BJA Phase 2", "DJF"]},
    {"list_type": ReferenceListType.customers, "label": "Stellantis", "reference_codes": ["P21"]},
    {"list_type": ReferenceListType.contacts, "label": "Olivier Martin"},
    {"list_type": ReferenceListType.contacts, "label": "Nadia Bennis"},
    {"list_type": ReferenceListType.fgpn, "label": "FG-BX5-100", "project": "BMW X5"},
    {"list_type": ReferenceListType.fgpn, "label": "FG-BX5-101", "project": "BMW X5"},
    {"list_type": ReferenceListType.fgpn, "label": "FG-RCV-330", "project": "Renault Clio V"},
    *({"list_type": ReferenceListType.receivers, "label": label} for label in RECEIVER_LABELS),
    {"list_type": ReferenceListType.methods, "label": "Truck"},
    {"list_type": ReferenceListType.methods, "label": "DHL"},
    {"list_type": ReferenceListType.methods, "label": "Van"},
    {"list_type": ReferenceListType.material_types, "label": "Wire"},
    {"list_type": ReferenceListType.material_types, "label": "Connector"},
    {"list_type": ReferenceListType.material_types, "label": "Tape"},
    {"list_type": ReferenceListType.material_types, "label": "Tube"},
]


def main() -> None:
    db = SessionLocal()
    try:
        for seed in SEED_ENTRIES:
            existing = (
                db.query(ReferenceEntry)
                .filter(ReferenceEntry.list_type == seed["list_type"])
                .filter(ReferenceEntry.label.ilike(seed["label"]))
                .first()
            )
            if existing:
                print(f"skipped (exists): [{seed['list_type'].value}] {seed['label']}")
                continue
            db.add(ReferenceEntry(
                list_type=seed["list_type"],
                label=seed["label"],
                project=seed.get("project"),
                reference_codes=seed.get("reference_codes"),
            ))
            db.flush()
            print(f"created: [{seed['list_type'].value}] {seed['label']}")
        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    main()

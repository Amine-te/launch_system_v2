"""
/reference-entries/* -- SRS M00.5, System Administrator only. One CRUD
surface backing all six reference lists (list_type distinguishes them --
see app.models.reference_entry.ReferenceListType).
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import require_role
from app.db.session import get_db
from app.models.reference_entry import ReferenceEntry, ReferenceListType
from app.models.user import UserRole
from app.schemas.reference_entry import ReferenceEntryCreate, ReferenceEntryOut, ReferenceEntryUpdate

router = APIRouter(dependencies=[Depends(require_role(UserRole.admin))])


def _get_entry_or_404(entry_id: int, db: Session) -> ReferenceEntry:
    entry = db.get(ReferenceEntry, entry_id)
    if entry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reference entry not found.")
    return entry


def _assert_no_duplicate(db: Session, list_type: ReferenceListType, label: str, exclude_id: int | None = None) -> None:
    query = select(ReferenceEntry).where(
        ReferenceEntry.list_type == list_type, func.lower(ReferenceEntry.label) == label.strip().lower()
    )
    if exclude_id is not None:
        query = query.where(ReferenceEntry.id != exclude_id)
    if db.scalar(query) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"{label} already exists in this list.",
        )


@router.get("", response_model=list[ReferenceEntryOut])
def list_reference_entries(db: Session = Depends(get_db)) -> list[ReferenceEntry]:
    """Every entry, across all six lists -- the frontend groups them by
    list_type client-side (see data/admin-store.js), the same shape the
    old ADMIN_REFERENCE_LISTS mock was already pre-grouped into, and it's
    a small enough dataset that six separate round trips would be waste."""
    return list(db.scalars(select(ReferenceEntry).order_by(ReferenceEntry.list_type, ReferenceEntry.label)))


@router.post("", response_model=ReferenceEntryOut, status_code=status.HTTP_201_CREATED)
def create_reference_entry(payload: ReferenceEntryCreate, db: Session = Depends(get_db)) -> ReferenceEntry:
    if payload.list_type == ReferenceListType.fgpn and not payload.project:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="project is required for a Finished Goods Part Number entry.")
    _assert_no_duplicate(db, payload.list_type, payload.label)
    entry = ReferenceEntry(
        list_type=payload.list_type,
        label=payload.label.strip(),
        project=payload.project if payload.list_type == ReferenceListType.fgpn else None,
        reference_codes=payload.reference_codes if payload.list_type == ReferenceListType.customers else None,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.patch("/{entry_id}", response_model=ReferenceEntryOut)
def update_reference_entry(entry_id: int, payload: ReferenceEntryUpdate, db: Session = Depends(get_db)) -> ReferenceEntry:
    entry = _get_entry_or_404(entry_id, db)
    data = payload.model_dump(exclude_unset=True)
    if "label" in data:
        _assert_no_duplicate(db, entry.list_type, data["label"], exclude_id=entry.id)
        entry.label = data["label"].strip()
    if "project" in data and entry.list_type == ReferenceListType.fgpn:
        entry.project = data["project"]
    if "reference_codes" in data and entry.list_type == ReferenceListType.customers:
        entry.reference_codes = data["reference_codes"]
    if "is_active" in data:
        entry.is_active = data["is_active"]
    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_reference_entry(entry_id: int, db: Session = Depends(get_db)) -> None:
    """SRS M00-FR-16: 'The system shall prevent deletion of any reference
    list entry that is linked to existing records.' There is nothing in
    the backend yet that can hold such a link -- POs, BOMs, and delivery
    records (the things that would actually reference a customer, FGPN,
    receiver, etc.) don't have backend tables of their own yet either.
    So today, correctly, nothing is ever linked, and delete always
    succeeds. Once those modules exist with real foreign keys into this
    table, this endpoint needs a check here before the delete -- e.g.
    `if db.scalar(select(func.count()).select_from(PurchaseOrder).where(PurchaseOrder.customer_entry_id == entry_id)): raise HTTPException(409, ...)`
    -- and should stay a 409 (matches the M00-AC-05 "explanatory message"
    requirement) rather than silently deactivating instead.
    """
    entry = _get_entry_or_404(entry_id, db)
    db.delete(entry)
    db.commit()

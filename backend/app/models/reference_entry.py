"""
SRS M00.5 -- Reference List Management (M00-FR-14..16). One table, not six,
distinguished by `list_type`: the six lists (JIT Customers, Contact Names,
Finished Goods Part Numbers per project, Manufacturing Receivers, Delivery
Methods, Material Types) all share the same shape -- a label, an
active/inactive status, and two list-specific optional fields (`project`
for FGPNs, `reference_codes` for customer references) -- so one table with
an enum column avoids five near-identical tables.
"""
import enum
from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, Enum, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ReferenceListType(str, enum.Enum):
    # Values match the frontend's module keys (state.adminReferenceModule
    # in pages/admin.js) exactly, so the API and the UI never need a
    # translation table between them.
    customers = "customers"
    contacts = "contacts"
    fgpn = "fgpn"
    receivers = "receivers"
    methods = "methods"
    material_types = "materialTypes"


class ReferenceEntry(Base):
    __tablename__ = "reference_entries"

    id: Mapped[int] = mapped_column(primary_key=True)
    list_type: Mapped[ReferenceListType] = mapped_column(
        # BUGFIX: SQLAlchemy's Enum(SomeEnumClass, ...) defaults to
        # binding/reading by the Python member's .name, not .value. Every
        # member here has name == value except material_types (name
        # "material_types", value "materialTypes" -- deliberately
        # camelCase to match the frontend's key). Without
        # values_callable, the ORM sent 'material_types' to a column
        # whose only valid label (created from this enum's *values* in
        # the migration) is 'materialTypes', throwing
        # "invalid input value for enum reference_list_type:
        # material_types" the moment anything touched that list type.
        Enum(
            ReferenceListType,
            name="reference_list_type",
            values_callable=lambda enum_cls: [member.value for member in enum_cls],
        ),
        nullable=False, index=True,
    )
    label: Mapped[str] = mapped_column(String(255), nullable=False)
    # Only meaningful for list_type == fgpn (SRS: "Finished Goods Part
    # Numbers per project"). NULL for every other list type.
    project: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # Only meaningful for list_type == customers ("customer references" --
    # the customer's own internal codes for this JIT customer). NULL for
    # every other list type. Named to avoid REFERENCES, a reserved SQL
    # keyword, rather than because it means something different.
    reference_codes: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
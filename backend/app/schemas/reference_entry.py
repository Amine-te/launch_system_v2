from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.reference_entry import ReferenceListType


class ReferenceEntryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    list_type: ReferenceListType
    label: str
    project: str | None
    reference_codes: list[str] | None
    is_active: bool
    created_at: datetime


class ReferenceEntryCreate(BaseModel):
    list_type: ReferenceListType
    label: str = Field(min_length=1, max_length=255)
    project: str | None = None
    reference_codes: list[str] | None = None
    # New entries are Active by default (mirrors UserCreate not accepting
    # is_active) -- SRS doesn't call for creating an entry pre-deactivated,
    # and it's one less thing the form needs to ask for.


class ReferenceEntryUpdate(BaseModel):
    """PATCH body -- every field optional so this covers both a full edit
    (label/project/reference_codes) and a quick status toggle
    (adminToggleReferenceEntry sends just `is_active`) through one
    endpoint, matching how the two admin.js actions already behaved
    against the in-memory mock."""

    label: str | None = Field(default=None, min_length=1, max_length=255)
    project: str | None = None
    reference_codes: list[str] | None = None
    is_active: bool | None = None

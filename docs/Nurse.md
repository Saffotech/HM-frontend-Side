Schema — create + bulk: shift_name optional
Ab:

class NurseShiftBedAllocationCreate(BaseModel):
    nurse_id: int = Field(..., ge=1)
    bed_id: int = Field(..., ge=1)
    shift_date: date
    assigned_until: Optional[date] = None
    shift_name: str = Field(..., min_length=1, max_length=100)  # required
    ...
class NurseShiftBedAllocationBulkCreate(BaseModel):
    ...
    shift_name: str = Field(..., min_length=1, max_length=100)  # required
Chahiye:

class NurseShiftBedAllocationCreate(BaseModel):
    nurse_id: int = Field(..., ge=1)
    bed_id: int = Field(..., ge=1)
    shift_date: date
    assigned_until: Optional[date] = None
    shift_name: Optional[str] = Field(None, max_length=100)  # omit / null / "" allowed
    shift_start: Optional[time] = None
    shift_end: Optional[time] = None
    department_id: Optional[int] = Field(None, ge=1)
    notes: Optional[str] = None
class NurseShiftBedAllocationBulkCreate(BaseModel):
    nurse_id: int = Field(..., ge=1)
    bed_ids: List[int] = Field(..., min_length=1)
    shift_date: date
    assigned_until: Optional[date] = None
    shift_name: Optional[str] = Field(None, max_length=100)
    shift_start: Optional[time] = None
    shift_end: Optional[time] = None
    department_id: Optional[int] = Field(None, ge=1)
    notes: Optional[str] = None
Response empty string allow karo:

class NurseShiftBedAllocationItem(BaseModel):
    ...
    shift_name: str = ""   # empty OK for new rows; old rows still "Morning"
Update pehle se optional hai — mat badlo:

class NurseShiftBedAllocationUpdate(BaseModel):
    shift_name: Optional[str] = Field(None, min_length=1, max_length=100)
2. Service — 400 hatao, empty persist karo
Ab (create_allocation_service + bulk_create_allocations_service):

shift_name = _normalize_shift_name(data.shift_name)
if not shift_name:
    raise HTTPException(status_code=400, detail="shift_name is required")
start, end = _resolve_shift_times(shift_name, data.shift_start, data.shift_end)
row = NurseShiftBedAllocation(
    ...
    shift_name=shift_name,
    shift_start=start,
    shift_end=end,
    ...
)
Chahiye:

shift_name = _normalize_shift_name(getattr(data, "shift_name", None))
# missing / null / "" → persist "" (column NOT NULL). Do NOT default "Morning".
# Do NOT infer from clock.
start, end = _resolve_shift_times(shift_name, data.shift_start, data.shift_end)
# empty shift_name → start/end stay None (DEFAULT_SHIFT_TIMES lookup miss)
row = NurseShiftBedAllocation(
    nurse_id=nurse.id,
    bed_id=bed.id,
    shift_date=data.shift_date,
    assigned_until=assigned_until,
    shift_name=shift_name,   # "" if omitted
    shift_start=start,       # None if no times sent
    shift_end=end,
    department_id=dept_id,
    assigned_by=assigned_by,
    notes=data.notes,
    is_active=True,
)
_resolve_shift_times empty name pe Morning times mat lagao — current code already DEFAULT_SHIFT_TIMES.get(shift_name) miss pe (None, None) return karta hai. Empty "" pe wohi chahiye.

3. Update — omit = no change
Yeh already sahi hai. Frontend PATCH pe shift_name bhejta nahi.

payload = data.model_dump(exclude_unset=True)
if "shift_name" in payload and payload["shift_name"] is not None:
    row.shift_name = _normalize_shift_name(payload["shift_name"])
# field missing → old Morning/Evening stays
4. Notification (optional)
Shift empty ho to “Shift / Morning” mat likho.

Ab:

timing = _shift_timing_label(out.get("shift_name"), out.get("shift_start"), out.get("shift_end"))
dates = _date_range_label(out.get("shift_date"), out.get("assigned_until"))
message = f"You were assigned bed {bed_label}{ward_part} for {timing}, {dates}."
Chahiye:

dates = _date_range_label(out.get("shift_date"), out.get("assigned_until"))
shift_name = (out.get("shift_name") or "").strip()
if shift_name:
    timing = _shift_timing_label(shift_name, out.get("shift_start"), out.get("shift_end"))
    message = f"You were assigned bed {bed_label}{ward_part} for {timing}, {dates}."
else:
    message = f"You were assigned bed {bed_label}{ward_part} {dates}."
Bulk create same pattern: empty shift pe
You were assigned {n} bed(s) {dates}.

5. Frontend ab kya bhejta hai
POST create / bulk — shift_name nahi:

{
  "nurse_id": 12,
  "bed_ids": [101, 102],
  "shift_date": "2026-09-04",
  "assigned_until": "2026-09-10",
  "department_id": 3,
  "notes": null
}
PATCH — shift_name nahi:

{
  "shift_date": "2026-09-04",
  "assigned_until": "2026-09-12",
  "notes": "updated"
}
Is body pe 201 chahiye, validation 422/400 nahi.

Mat change karo
Roster APIs (/admin/nurse-workforce/roster) — shift required hi rahe
Dashboard On Duty (roster se)
Beds Assigned count (allocations se)
_find_active_conflict — ek active nurse per bed, shift independent

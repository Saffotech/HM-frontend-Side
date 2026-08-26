# Backend: `beds.bed_type` (Single | Double)

## Status
**Reverted from backend code** (frontend UI for Type / filters may still exist).  
Re-apply this when ready so Type persists and shows on IPD / Admin bed lists.

## Goal
Store bed inventory type as **`single`** or **`double`**.

- Still **one patient per bed** (type is classification only, not capacity 2).
- Used by Admin **Beds & wards** and IPD **Bed list** Type column / filters.
- Needed later for **double ward tariff** resolution.

---

## Already true after this work
No separate rate column on `beds` — daily price stays in OPD settings tariff.

---

## Backend to implement

### 1. Model — `Models/opd_billing.py` → class `Bed`
```python
# single | double — capacity is still one patient per bed
bed_type = Column(String, nullable=False, default="single")
```

### 2. Schemas — `Schemas/opd_schema.py`
| Model | Field |
|--------|--------|
| `BedOut` | `bed_type: str = "single"` |
| `BedCreate` | `bed_type: str = "single"` |
| `BedBulkCreate` | `bed_type: str = "single"` |
| `BedUpdate` | `bed_type: Optional[str] = None` |

### 3. Service — `Services/bed_service.py`
- Helpers: `_coerce_bed_type` / `_normalize_bed_type` (`single` \| `double` only; else 400).
- `_bed_out`: include `bed_type`.
- `create_bed` / `create_beds_bulk`: set `bed_type`.
- `update_bed`: allow changing `bed_type`.

### 4. Alembic migration
Add column on `beds`:

```text
bed_type  String  NOT NULL  server_default='single'
```

Example revision name: `d0e1f2a3b4c5_beds_bed_type` (or next free revision).

```bash
# from HM-System-Backend (with venv)
alembic upgrade head
```

### 5. Downgrade / undo DB (if column already applied)
```bash
alembic downgrade -1
# or drop column manually if migration was removed:
# ALTER TABLE beds DROP COLUMN IF EXISTS bed_type;
```

---

## API shape (after)

```json
{
  "id": 1,
  "bed_number": "G-101",
  "ward_name": "General",
  "bed_type": "double",
  "status": "available"
}
```

---

## Frontend (already / after backend)
- Admin: create / edit / filter by type.
- IPD Bed list: Type column + type filter.
- Until this backend is back: Type may show `—` / default and not persist.

---

## Related (not this doc)
| Topic | Doc / note |
|--------|------------|
| Show Rate on IPD bed list | `BackendChange.md` → enrich `_enrich_bed_for_ipd` with `resolve_bed_rate` |
| Double ward tariff + `bed_type` in rate resolve | Separate; needs tariff fields + pass `bed_type` into `resolve_bed_rate` |
| Care team add doctors | `BackendChange.md` → `ipd_admission_care_team` |

---

**Short:** Add **`beds.bed_type`** (`single` \| `double`) in model + schema + bed_service + Alembic. No capacity change.

## Goal
Generated bill pe **Paid ₹130** ki jagah alag columns: **Paid 1 ₹30**, **Paid 2 ₹100**.

---

## Already exists (no change needed)

| Thing | Status |
|--------|--------|
| Table `ipd_payment_transactions` | Har payment alag row (`amount`, `payment_mode`, `paid_at`, `bill_id`) |
| Collect payment saves each txn | Already |
| Aggregate `paid_amount` on bill | Already (sum) |
| New DB migration / new table | **Not required** |

Problem: admission detail / bill list API **sirf total** `paid_amount` bhejti hai, individual payments nahi.

---

## Backend jo chahiye (sirf ye)

### 1. Schema — `Schemas/ipd_schema.py`
Naya response model + `IpdBillOut` pe field:

```text
IpdBillPaymentOut:
  - id
  - amount
  - payment_mode
  - paid_at (optional)
  - transaction_reference (optional)

IpdBillOut:
  - ...existing fields...
  - payments: list[IpdBillPaymentOut]   # default []
```

### 2. Service — `Services/ipd_service.py` → `_bill_out()`
Bill items ke saath:

- `ipd_payment_transactions` se us `bill_id` ki rows lao  
- order: `paid_at ASC` (pehli payment pehle)  
- `payments=[...]` mein map karke return karo  

Jahan `_bill_out` use hota hai (admission detail `bills`, pay/generate bill response), wahan payments auto aa jayenge.

### 3. Database / migrations
**Kuch nahi** — table pehle se hai.

### 4. Routers
**Naya endpoint zaroori nahi** — existing bill payload extend karo (additive, backward compatible).

---

## Example API shape (after)

```json
{
  "bill_number": "IPD-BILL-00008",
  "grand_total": 530,
  "paid_amount": 130,
  "balance_due": 400,
  "payment_mode": "cash",
  "payments": [
    { "id": 1, "amount": 30, "payment_mode": "cash", "paid_at": "..." },
    { "id": 2, "amount": 100, "payment_mode": "cash", "paid_at": "..." }
  ]
}
```

---

## Frontend (baad mein)
`payments[]` se **Paid 1 / Paid 2** columns; agar list empty ho to fallback `paid_amount`.

---

**Short:** Backend pe **new table nahi** — sirf bill response mein **`payments` array** add karna hai (`schema` + `_bill_out`).  





ADMIN SETTING FOR BED 




Yes — the **intent** of the backend work changed. You no longer need “update/replace primary doctor” as the main care-team feature. You need **add / list / remove associated doctors** while **keeping** the existing primary.

### What stays the same
- Admission still has **one** primary: `ipd_admissions.doctor_id` + `department_id` (from admit) — **do not overwrite** when adding others
- Optional: put `department_name` on visit rows for nicer display

### What changed vs the earlier list

| Earlier idea | Now (correct for your UI) |
|--------------|---------------------------|
| Change primary via Care team | **No** — primary stays as admitted |
| Care team = replace doctor | Care team = **extra associated doctors** |
| Focus on PATCH admission doctor | Focus on **POST/DELETE care-team members** |

### Backend you need now

1. **Table** `ipd_admission_care_team`  
   - `admission_id`, `doctor_id`, `department_id`  
   - Optional `role` (`associated` / `consultant`)  
   - Unique `(admission_id, doctor_id)`  
   - **Do not** store primary here if primary stays on `ipd_admissions` (or store primary as read-only sync — either way, adding must not clear primary)

2. **APIs**
   - `GET` admission detail → `care_team: [{ doctor_id, doctor_name, department_id, department_name, role }]`  
     (or primary from admission + extras from this table)
   - `POST /ipd/admissions/{id}/care-team` — **add** doctor  
   - `DELETE /ipd/admissions/{id}/care-team/{member_id}` — **remove** associated only  
   - **No** “change primary” endpoint required for this screen

3. **Rules**
   - Reject add if doctor already primary or already associated  
   - Doctor must belong to selected department  
   - Cannot remove primary via this API  

4. **Frontend after backend**  
   - Drop `localStorage` stub (`careTeamLocalStore.js`)  
   - Wire Add/Remove to real APIs  

So: backend is still required for real multi-doctor association, but the design is **add-only associates**, not **change doctor**.








SHOW RET ON BED IN SIDBAR 




## Analysis

| Piece | Today |
|--------|--------|
| Tariff in DB/settings | Exists (ward rates, special beds) |
| `resolve_bed_rate()` | Exists (used in billing / ward stats) |
| `/ipd/beds` | Only sets `charge_per_day` for **special** overrides → otherwise `null` |
| Bed list UI | Uses `useIpdBedRateLookup()` → needs OPD settings; if that fails → `ratesAvailable = false` → shows `—` |

So Rate is blank because **beds API doesn’t send the real ward rate**, and IPD often **can’t load OPD settings**.

---

## What to write (recommended: backend)

### File: `HM-System-Backend/Services/ipd_service.py`  
Change `_enrich_bed_for_ipd` so every bed gets a resolved rate:

```python
def _enrich_bed_for_ipd(db: Session, bed_out) -> dict:
    payload = bed_out.model_dump() if hasattr(bed_out, "model_dump") else dict(bed_out)
    pricing = opd_settings_service.get_pricing(db)

    special_rate = opd_settings_service.get_special_bed_rate(
        pricing,
        bed_number=payload.get("bed_number"),
    )

    # Always resolve full rate (special → ward → defaults)
    rate = opd_settings_service.resolve_bed_rate(
        pricing,
        bed_number=payload.get("bed_number"),
        ward_name=payload.get("ward_name"),
        # later add: bed_type=payload.get("bed_type"),
    )

    payload["charge_per_day"] = float(rate) if rate is not None else None
    payload["has_custom_rate"] = special_rate is not None
    return payload
```

That’s the main fix: **IPD beds already return `charge_per_day`; fill it with the real rate.**

### Optional later (double bed)
In `resolve_bed_rate`, accept `bed_type` and pick double ward rate when `bed_type == "double"`.

---

## Frontend (small, after backend)

In `IpdBedsPage.jsx` you already do:

```js
const rate = ratesAvailable ? getRate(bed) : null;
```

`rateForBed` already prefers `bed.charge_per_day`. After backend always sends it, either:

1. Prefer bed field always:

```js
const rate = bed.charge_per_day ?? (ratesAvailable ? getRate(bed) : null);
```

or  

2. Keep `getRate(bed)` — it will use `charge_per_day` first if present.

You don’t need OPD settings permission if `/ipd/beds` always returns the rate.

---

## What you do **not** need
- New table for rates  
- New column on `beds` for price (tariff stays in settings)  
- Changing Type column (already from `bed_type`)

---

## Short checklist

1. **Backend:** In `_enrich_bed_for_ipd`, call `resolve_bed_rate(...)` for every bed → set `charge_per_day`.  
2. **Frontend:** Use `bed.charge_per_day` on the Rate column (fallback to tariff lookup if needed).  
3. **Later:** Pass `bed_type` into `resolve_bed_rate` for double prices.

I’m in **Ask mode** — switch to **Agent mode** if you want this applied in the repo.
---

## Beds `bed_type` (Single / Double) — REVERTED

Backend code for `beds.bed_type` was **undone**.  
Full re-apply checklist: **`docs/Beds_BedType.md`**.

If the migration was already run on your DB, drop the column or `alembic downgrade` as noted in that file.

---

## Doctor console — lab list 500 + departments 403 (2026-08-27)

Frontend workaround for **403 `/opd/departments`**: when that call fails with 403, doctor UI builds LAB/RAD routing from `GET /lab-catalog` (`useLabRoutingDepartmentsQuery`).

**500 `/api/lab-tests` cannot be fixed on frontend** — backend must align the Postgres enum.

### 1. Fix `labteststatus` enum mismatch (causes 500)

- **Symptom:** `GET /lab-tests` → 500  
  `invalid input value for enum labteststatus: "cancelled"`
- **Cause:** PG enum still has **NAME** labels (`ORDERED`, `CANCELLED`, …) while SQLAlchemy sends **`.value`** strings (`ordered`, `cancelled`, …). Model already uses `values_callable` on `LabTestOrder.status`.
- **Fix:** Alembic migration (same approach as existing `u9v0w1x2y3z4_lab_status_enum_use_values.py`):
  1. `ALTER COLUMN status TYPE VARCHAR USING status::text`
  2. Normalize rows: `ORDERED`→`ordered`, `SAMPLE_COLLECTED`→`sample_collected`, `PROCESSING`→`sample_collected`, `COMPLETED`→`completed`, `CANCELLED`→`cancelled`
  3. Drop/recreate enum as `('ordered','sample_collected','completed','cancelled')`
  4. Cast column back to enum; default `'ordered'`
- **Verify:** after upgrade, enum labels must be lowercase values only.

### 2. Allow doctors to list departments for lab routing (403)

- **Symptom:** Doctor UI → `GET /opd/departments` → 403 (`opd:view` required)
- **Cause:** Doctor role has `lab:view` / `lab_catalog:view` but **not** `opd:view` (`seed.py`).
- **Preferred fix (pick one):**
  - **A.** `GET /opd/departments` accept `opd:view` **or** `lab:view`, or  
  - **B.** Dedicated `GET /lab/routing-departments` (LAB+RAD only) gated by `lab:view`, or  
  - **C.** Grant doctor `opd:view` (broader than needed)
- Frontend already falls back via catalog when OPD returns 403; backend fix still preferred so IDs come from departments master, not inference.

### Checklist
1. Migrate `labteststatus` → lowercase values matching `LabTestStatus`
2. Open departments (or lab-routing) list to roles with `lab:view`
3. Smoke: doctor login → Labs list loads; Add Lab Test shows Laboratory / Radiology with real `department_id`

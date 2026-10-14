# Super Admin Reports — backend changes

Frontend Super Admin Reports is already wired. Do **not** add a new route. Extend the existing admin reports APIs.

Files:

- `HM-System-Backend/Routers/admin_reports_router.py`
- `HM-System-Backend/Services/admin_reports_service.py`
- `HM-System-Backend/Schemas/admin_reports_schema.py`

Endpoints:

- `GET /admin/reports/overview`
- `GET /admin/reports/visits`

---

## 1. Department filter (cannot be done on frontend)

**Status:** Frontend already sends `department_id` on **both** APIs. Ledger (`/visits`) already filters. **Overview KPIs and charts do not**, because `/overview` ignores `department_id`.

Do **not** fake this on the frontend:

- Overview has no per-department collected / pending / payment-mode totals (only `visits_by_department[].visit_count`).
- `/visits` is paginated (`limit` max 100), so the ledger cannot be used to recompute page KPIs.
- Visit rows have no `payment_mode`, so the payment chart cannot be rebuilt client-side.

### What to change

`GET /admin/reports/overview` must accept optional `department_id` (same as `/visits`).

When `department_id` is set, filter **every** overview metric, not only the department chart:

| Field | Filter |
|---|---|
| `total_visits` | OPD visits in that department (and IPD admissions in that department when `source` is implemented) |
| `completed_visits` | same visit/admission set |
| `pending_payments` | unpaid count in that set |
| `total_revenue` / `collected_revenue` / `outstanding_revenue` | money for that department only |
| `new_patients_in_period` | distinct `patient_id` with a visit/admission in that department in range |
| `visits_by_department` | **only that department** (one row, or empty) |
| `revenue_by_payment_mode` | transactions whose visit/admission is in that department |

OPD join: `opd_visits.department_id`.  
IPD join (when source ships): `ipd_admissions.department_id`.

`total_patients` stays hospital-wide. Staff metrics stay on `/admin/dashboard` (not this API).

If `department_id` is omitted, keep today’s hospital-wide overview (Admin Reports must not change).

**Check:** Super Admin Reports → pick a department with **no** visits in the date range (e.g. Cardiology while all money is General Medicine). Collected, encounters, payment chart, department chart, and ledger must all go empty/zero. Picking General Medicine must match only that department’s visits.

---

## 2. Source filter All / OPD / IPD

Frontend already sends `source=all|opd|ipd` on both APIs (UI default **All**).

Until this ships, **IPD shows empty** (frontend will not treat unscoped OPD numbers as IPD). OPD and All still use the current OPD payload. After the API echoes `source`, IPD/All fill in automatically.

**Required:** both responses must include `source` matching the query (`all` | `opd` | `ipd`). Empty IPD is still valid: zeros, empty arrays, `source: "ipd"`.

**API default `source=opd`** so Admin Reports stays OPD-only when it omits `source`. Super Admin always sends it.

`source` and `department_id` must change **the whole overview payload**, not only `/visits`.

## Response shape

Keep existing field names. Echo `source` on **both** response objects (`all` | `opd` | `ipd`). Frontend uses that to know the payload is scoped; without it, IPD is shown empty.

Frontend already maps:

- volume KPI ← `total_visits`
- completed hint ← `completed_visits`
- billed ← `total_revenue`
- collected ← `collected_revenue` (and `revenue_by_payment_mode`)
- outstanding ← `outstanding_revenue`
- pending count ← `pending_payments`
- new patients ← `new_patients_in_period`
- dept chart ← `visits_by_department[].visit_count`
- payment chart ← `revenue_by_payment_mode`

Add on each ledger row:

```text
source: "opd" | "ipd"
```

Make `token_number` and `department_id` optional (IPD admission may have no token / no department). For IPD rows send `admission_no` in `token_number` (or leave empty; UI falls back to `admission_no` if present).

Use `visit_id` for OPD visit id and IPD **admission** id. Sort mixed All ledger by date desc, then paginate the union.

## Date windows (IST, same `_period_bounds` as today)

| Metric | OPD | IPD |
|---|---|---|
| Volume / completed / new patients / ledger | `opd_visits.visit_date` | `ipd_admissions.admitted_at` |
| Billed / pending bills / outstanding | visit in range | `ipd_bills.generated_at` in range, `status != 'void'` |
| Collected / payment-mode chart | OPD `payment_transactions` for visits in range | `ipd_payment_transactions.paid_at` in range |

Join IPD bills/payments through `IpdAdmission` when `department_id` is set.

Skip cancelled IPD admissions (`status != 'cancelled'`).

## Field meaning by `source`

Compute OPD and IPD separately, then **All = OPD + IPD** (unique patients for new-patients). Do not net OPD overpay against IPD unpaid.

### `total_visits` (volume)

- `opd`: count OPD visits
- `ipd`: count IPD admissions
- `all`: visits + admissions

### `completed_visits`

- `opd`: visits with `status in ('completed', 'discharged')`
- `ipd`: admissions with `status = 'discharged'`
- `all`: both

### `new_patients_in_period`

Not `Patient.created_at`.

- `opd`: distinct `patient_id` on OPD visits in range
- `ipd`: distinct `patient_id` on IPD admissions in range
- `all`: unique union of those IDs

Keep `total_patients` as hospital-wide registered count (not source-scoped).

### `total_revenue` (billed)

- `opd`: sum `opd_visits.grand_total`
- `ipd`: sum `ipd_bills.grand_total` (non-void, in range)
- `all`: both

### `collected_revenue`

Use **payment transactions**, not `paid_amount`.

- `opd`: sum `PaymentTransaction.amount` for visits in range
- `ipd`: sum `IpdPaymentTransaction.amount` where `paid_at` in range
- `all`: both

This total must match `sum(revenue_by_payment_mode.total_amount)`.

If a side has no transactions, fallback for that side only: `min(sum(paid_amount), billed)`.

### `outstanding_revenue`

Unpaid money, **per visit/bill, never negative**. Do **not** use `billed - collected`.

- OPD visit: `max(grand_total - sum(OPD txns for that visit), 0)`
- IPD bill in range: `max(grand_total - sum(IPD txns for that bill), 0)`
- `all`: sum of both

### `pending_payments`

Keep as a **count**, not money.

- `opd`: visits with `payment_status != 'paid'`
- `ipd`: non-void bills in range with `payment_status != 'paid'`
- `all`: both counts

### `visits_by_department`

- `opd`: count visits per department (existing)
- `ipd`: count admissions per `ipd_admissions.department_id` (skip or label null dept)
- `all`: add counts for the same `department_id`

Keep using `visit_count` even for IPD admissions (no schema rename).

If `department_id` query is set, only that department’s numbers appear in KPIs **and** this chart.

### `revenue_by_payment_mode`

- `opd`: group OPD txns by `payment_mode`
- `ipd`: group IPD txns by `payment_mode`
- `all`: merge the same mode (Cash + Cash → one row, summed `total_amount` and `transaction_count`)

## Ledger (`/visits`)

- `opd`: current OPD visit rows + `source: "opd"`
- `ipd`: one row per admission in range: date = `admitted_at`, bill = latest/primary IPD bill number (or `—`), token = `admission_no`, amount = that bill `grand_total` (0 if none), status = bill `payment_status` or admission `status`, department from admission, `source: "ipd"`
- `all`: union, `source` on every row, paginate after merge

Department filter applies to this list too.

## Do not change

- `/admin/dashboard` (staff totals, active staff, departments, staff by role)
- Admin Reports UI default: omitting `source` must stay OPD-only

## Check after backend

1. Super Admin Reports, source **All** — KPIs, both charts, and ledger all include IPD + OPD for the same From–To.
2. Source **IPD** — volume = admissions, collected = IPD payments, ledger = IPD only with IPD badges.
3. Source **OPD** — same numbers as today’s OPD report (plus `source: "opd"` on rows).
4. Pick a department with no activity — cards, charts, and table all go empty/zero. Pick a department with activity — numbers match only that department.
5. Outstanding never negative; pending stays a count; collected equals payment-mode chart total.

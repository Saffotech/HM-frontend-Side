Backend developer ke liye yeh handoff use karo — copy-paste ready.

---

## OPD payment mismatch — backend fix

**Module:** OPD Billing  
**Permission:** `billing:view` / existing visit + pay APIs  
**Frontend:** no change required for this bug (profile already caps collected at bill total)

### Problem

Same patient shows different amounts:

| Screen | Amount | Source |
|--------|--------|--------|
| Patient profile (Total billed / Collected) | ~₹735 | `opd_visits.grand_total` (collected capped at bill total on UI) |
| Payment History row | ₹1,050 | `payment_transactions.amount` |

Hospital-wide Payment History cards can also show **₹2,100 / 2 transactions** while the table shows one **₹1,050** row (`1050 × 2 = 2100`). Cards sum **all** `payment_transactions`; the table lists paginated rows. The patient-level bug is **bill total ≠ payment row amount**.

Reproduced on: patient **Akash Sahani (P-1004)**, **BILL-002**.

### Root causes (code)

**1. `create_visit` records pay twice and can store a different paid amount than the bill**

File: `Services/opd_service.py` → `create_visit`

Flow today:

1. Backend **recalculates** fees from admin OPD settings (`resolve_visit_fees`) → `grand_total` (e.g. 200 + 500 + GST = **735**).
2. Visit is inserted with `paid_amount = paid` (frontend `amount_received`, e.g. **1050**).
3. Then `record_payment(visit, paid)` **adds** that amount again onto `visit.paid_amount`.

`record_payment` (`Services/opd_helpers.py`):

- inserts `payment_transactions.amount = paid` (1050)
- sets `visit.paid_amount = (existing paid_amount or 0) + amount` → **doubled** on the visit

Result:

- Profile billed = **735** (`grand_total`)
- Profile collected looks like **735** because UI uses `billCollectedAmount` (never show more than bill when balance is 0)
- Payment History = **1050** (transaction amount)
- Visit `paid_amount` in DB can be **735 + 1050** or **1050 + 1050**

This path is used by **register patient**, **OPD revisit**, and **generate bill** (all call `create_visit`).  
`collect_payment` is OK — it only calls `record_payment`.

**2. `amount_received` is not capped to `grand_total`**

If the client sends `amount_received` from UI preview (1050) but the server recomputes the bill (735), the payment row stores **1050** and the visit stores **735**.

**3. Aggregates use `opd_visits.paid_amount`**

- `GET /opd/dashboard` → `_today_bills_aggregates` → `sum(OpdVisit.paid_amount)`
- `GET /opd/bills` summary `total_collected` → same

After the double-add, these totals are inflated vs Payment History (which sums `payment_transactions`).

**4. Existing rows are already wrong**

A code-only fix does not repair old visits/transactions. Need a one-time data repair.

---

### Required fixes

#### A. `create_visit` — single source of truth for payment

On insert, **do not** set paid fields to the received amount.

- `paid_amount = None` (or 0)
- `balance_due = grand_total`
- `payment_status = "pending"`
- `payment_mode = None`
- `paid_at = None`

If `pay_later` or `paid <= 0`: do not call `record_payment`.

If `paid > 0`: call **only** `record_payment(...)`. That function already:

- writes `payment_transactions`
- updates `paid_amount`, `balance_due`, `payment_status`, `payment_mode`, `paid_at`

#### B. Cap `amount_received` to the server bill

After computing `grand_total`:

```text
paid = min(amount_received, grand_total)   # if amount_received is set
# else paid = grand_total (full pay)
```

Never persist a payment `amount` greater than `grand_total` for a full/overpay-at-create. (If you later support true overpay, do it explicitly; current UI/profile assume collected ≤ billed.)

#### C. Data repair (existing DB)

For each non-cancelled `opd_visits` row:

1. `txn_sum = SUM(payment_transactions.amount)` for that `visit_id`
2. `paid_amount = min(txn_sum, grand_total)` **or** align transactions to `grand_total` if they were overstated at create (product decision — prefer: **cap transactions + visit to grand_total** so profile and history match)
3. `balance_due = max(grand_total - paid_amount, 0)`
4. Set `payment_status` to `paid` / `partial` / `pending` from balance

Also fix orphaned / doubled rows for the reported patient (P-1004 / BILL-002).

#### D. Aggregates (recommended)

Prefer **sum of `payment_transactions`** (join non-cancelled visits) for:

- dashboard `today_collected`
- bills list `summary.total_collected`

so KPIs match Payment History.

#### E. Optional

`GET /opd/payments/history`: exclude payments whose visit `status = cancelled`, and use the **same filter** for summary cards and the `payments` list so `transaction_count` matches visible rows.

---

### Do not change

- `record_payment` add-on-top logic (needed for Collect Payment / partial pays)
- `collect_payment` (already correct)
- Frontend Payment History / profile pages for this ticket

---

### API contract (unchanged)

- `GET /opd/patient/{id}/profile` — `summary.total_billed` / visits[].`grand_total`
- `GET /opd/payments/history` — `payments[].amount`, `summary.total_collected`, `transaction_count`

After fix, for one fully paid visit:

`profile.total_billed == profile collected == history row amount`  
(e.g. all **735**, not 735 vs 1050)

---

### How to verify

1. Generate a new OPD bill, pay cash in full (no pay-later).  
   - Visit `grand_total` = `paid_amount` = one `payment_transactions.amount`  
   - Profile billed = collected = that amount  
   - Payment History one row, same amount  
2. Partial collect, then remaining collect — two history rows, sum = `grand_total`.  
3. Old patient P-1004 / BILL-002: profile and history match after repair.  
4. Dashboard “Collected today” ≈ today’s payment transaction sum (not 2× visit paid).

---

### Files

| File | Change |
|------|--------|
| `Services/opd_service.py` | `create_visit` paid init + cap `amount_received`; optionally `_today_bills_aggregates` / `list_bills` collected |
| `Services/opd_helpers.py` | no change to `record_payment` unless you add a guard `amount <= remaining balance` |
| New migration or one-off script | repair existing `opd_visits` + `payment_transactions` |

---

Isse backend dev ko bill vs payment row mismatch + double `paid_amount` dono clear ho jayenge.
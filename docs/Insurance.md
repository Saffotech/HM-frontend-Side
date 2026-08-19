# IPD Billing & Insurance — Backend Integration / API Requirements

**Document type:** Backend integration contract (frontend reference)  
**Audience:** Backend developers  
**Scope:** APIs and data required so the **existing** IPD billing and insurance UI can remove dummy data, `sessionStorage`, and local-only persistence.

**Important:** This document describes what the **current frontend already uses or clearly requires**. It does **not** change frontend code, UI, routes, or business logic.

---

## 1. Document purpose

The IPD billing and insurance screens are already built. Today they work as follows:

| Payment flow | Billing UI data today |
|---|---|
| **Self / Pay & Claim** | Mix of **live** `/ipd/billing/*` APIs + **sessionStorage** for daily charges & hospital charge heads |
| **Insurance / Cashless** | **Dummy data** + **sessionStorage** (wired through `billing/` repository layer, not direct UI imports) |

When backend APIs listed as **BACKEND API REQUIRED** are available, the frontend will:

1. Connect the endpoint in `src/features/ipd/api/` or `src/features/ipd/api/ipdBilling.js`
2. Map the response in `src/features/ipd/billing/ipdBillingMapper.js`
3. Remove the corresponding dummy / `sessionStorage` source
4. Use existing React Query hooks in `src/features/ipd/hooks/useIpdBillingQuery.js`

---

## 2. Frontend routes (unchanged — do not rename)

| Route | Purpose |
|---|---|
| `/ipd/billing` | Bills list (Self / Insurance Cashless / Pay & Claim filters) |
| `/ipd/billing/preview/:admissionId` | Self & Pay-and-Claim billing (daily charges, hospital heads, payment) |
| `/ipd/billing/insurance/:patientId` | Insurance / Cashless billing |
| `/ipd/billing/bills/:billId` | Generated bill invoice view |
| `/ipd/patients?paymentType=insurance_cashless` | Insurance patient list |
| `/ipd/patients/insurance/:patientId` | Insurance patient profile |
| `/ipd/insurance-claim/view/:claimId` | Insurance claim detail |
| `/ipd/admissions/:admissionId` | Patient profile / admission detail (billing summary) |
| `/ipd/payments/history` | Payment history |

---

## 3. Data relationship the frontend must preserve

```text
Patient (patient_id / patient_uid)
   ↓
IPD Admission (admission_id)   ← billing MUST link here, not patient_id alone
   ↓
Billing records (daily + final)
   ↓
Insurance Claim (claim_id)     ← insurance cashless only; linked to admission
```

**Frontend admission resolution (insurance):** `claim.id`, `claim.ipdId`, `NEW-{admissionId}`, or `insuranceAdmit` session context.

---

## A. Patient / IPD Admission Context

### A.1 List IPD patients / admissions

| | |
|---|---|
| **API Name** | List IPD Patients (Admissions) |
| **Status** | **EXISTING API** |
| **HTTP Method** | `GET` |
| **Endpoint** | `/ipd/patients` |
| **Frontend file** | `src/features/ipd/api/patients.js` → `getIpdPatients` |
| **Hook** | `useIpdPatientsQuery` |

**Purpose:** Patient list, bills list (self), discharge list, dashboard.

**Query parameters (used by frontend):**

| Parameter | Type | Required |
|---|---|---|
| `status` | string | No (`admitted`, `discharged`, …) |
| `ward` | string | No |
| `doctor_id` | number | No |
| `search` | string | No |
| `admission_date` | string | No |
| `page` | number | No |
| `limit` | number | No |

**Response (used fields):**

```json
{
  "total": 0,
  "page": 1,
  "limit": 20,
  "items": [
    {
      "id": 0,
      "admission_no": "IPD-1003",
      "patient_id": 0,
      "patient_uid": "P-…",
      "patient_name": "…",
      "bed_id": 0,
      "bed_number": "G-102",
      "ward_name": "General",
      "doctor_id": 0,
      "doctor_name": "…",
      "status": "admitted",
      "admitted_at": "ISO datetime",
      "discharged_at": "ISO datetime | null",
      "length_of_stay_days": 8
    }
  ]
}
```

---

### A.2 Get admission detail (patient profile + running bill)

| | |
|---|---|
| **API Name** | Get IPD Admission Detail |
| **Status** | **EXISTING API** |
| **HTTP Method** | `GET` |
| **Endpoint** | `/ipd/admissions/{admission_id}` |
| **Frontend file** | `src/features/ipd/api/patients.js` → `getIpdPatientDetail` |
| **Hook** | `useIpdAdmissionDetailQuery` |

**Purpose:**

- Patient profile page (`IpdPatientDetailPage`) — admission info, doctor visits, running bill summary, generated bills
- Bill preview page — `admitted_at`, `doctor_visits` for per-day bed/doctor daily charge generation
- Discharge wizard

**Path parameters:**

| Parameter | Type | Required |
|---|---|---|
| `admission_id` | integer | Yes |

**Response (used fields):**

```json
{
  "admission": { /* IpdAdmissionOut — same fields as list item */ },
  "doctor_visits": [
    {
      "id": 0,
      "admission_id": 0,
      "doctor_id": 0,
      "doctor_name": "…",
      "visited_at": "ISO datetime",
      "charge": 500.0,
      "notes": "…"
    }
  ],
  "bills": [ /* IpdBillOut[] — see B.6 */ ],
  "running_bill": { /* IpdBillPreviewOut — see B.2 */ }
}
```

---

### A.3 Create IPD admission

| | |
|---|---|
| **API Name** | Admit Patient |
| **Status** | **EXISTING API** |
| **HTTP Method** | `POST` |
| **Endpoint** | `/ipd/admissions` |
| **Frontend file** | `src/features/ipd/api/admissions.js` → `createIpdAdmission` |

**Purpose:** Real admission on admit form. Insurance metadata is still stored locally after admit (see audit).

**Request body (used fields):**

```json
{
  "patient_id": 0,
  "bed_id": 0,
  "doctor_id": 0,
  "department_id": 0,
  "admission_date": "ISO datetime (optional)",
  "diagnosis": "…",
  "notes": "…"
}
```

---

### A.4 Add doctor visit

| | |
|---|---|
| **API Name** | Add Doctor Visit |
| **Status** | **EXISTING API** |
| **HTTP Method** | `POST` |
| **Endpoint** | `/ipd/admissions/{admission_id}/visits` |
| **Frontend file** | Not wrapped in dedicated frontend API file; exists on backend |

**Purpose:** Doctor visit charges feed into bill preview (`item_type: "visit"`) and daily charges (visit date from `visited_at`).

**Request body:**

```json
{
  "doctor_id": 0,
  "charge": 500.0,
  "visited_at": "ISO datetime (optional)",
  "notes": "…"
}
```

**Response:** `IpdDoctorVisitOut` (see A.2).

---

### A.5 Transfer bed

| | |
|---|---|
| **API Name** | Transfer Bed |
| **Status** | **EXISTING API** |
| **HTTP Method** | `POST` |
| **Endpoint** | `/ipd/beds/transfer` |
| **Frontend file** | `src/features/ipd/api/beds.js` |

**Purpose:** Changes current ward/bed on admission. **Does not** provide historical room periods for billing.

**BACKEND API REQUIRED** for room/bed **history per admission** (see D.1).

---

### A.6 Insurance patient list (cashless)

| | |
|---|---|
| **API Name** | List Insurance Cashless Patients |
| **Status** | **BACKEND API REQUIRED** |
| **HTTP Method** | `GET` (expected) |
| **Endpoint** | Not implemented — frontend uses `getDummyInsuranceBills` / `DUMMY_INSURANCE_PATIENTS` |

**Purpose:** `/ipd/billing?paymentType=insurance_cashless` bills table and insurance patient list filter.

**Required linkage:** Each row must include `patientId` (route key), `admissionId`, `claimId`, and display fields currently in dummy rows (`ipdId`, `patientName`, `netBill`, `approved`, `claimLabel`, …).

---

### A.7 Insurance admit context (cashless profile after admit)

| | |
|---|---|
| **API Name** | Get / Create Insurance Admission Context |
| **Status** | **BACKEND API REQUIRED** |
| **HTTP Method** | `GET` / `POST` (expected) |
| **Endpoint** | Not implemented |

**Purpose:** Replace `sessionStorage` key `ipd-ins-admit-ctx:{routePatientId}` created on insurance admission (`AdmitPatientForm` → `buildInsuranceAdmitContext`).

**Must link:** `patient_id`, `admission_id`, `claim_id`, insurer, policy fields (see F).

---

## B. IPD Billing (Self / Pay & Claim — live APIs)

### B.1 List running bills

| | |
|---|---|
| **API Name** | List Running IPD Bills |
| **Status** | **EXISTING API** |
| **HTTP Method** | `GET` |
| **Endpoint** | `/ipd/billing/running` |
| **Frontend file** | `src/features/ipd/api/billing.js` → `getIpdRunningBills` |
| **Hook** | `useIpdRunningBillsQuery` |

**Purpose:** Bills list when filter = **Self** or **Pay & Claim**.

**Query parameters:**

| Parameter | Type |
|---|---|
| `page` | number |
| `limit` | number |

**Response (used fields):**

```json
{
  "total": 0,
  "page": 1,
  "limit": 20,
  "items": [
    {
      "admission": { /* IpdAdmissionOut */ },
      "running_total": 4200.0,
      "balance": 3150.0,
      "paid_amount": 1050.0,
      "open_bill_id": 0
    }
  ]
}
```

---

### B.2 Bill preview (running charges)

| | |
|---|---|
| **API Name** | Get IPD Bill Preview |
| **Status** | **EXISTING API** |
| **HTTP Method** | `GET` |
| **Endpoint** | `/ipd/billing/preview/{admission_id}` |
| **Frontend file** | `src/features/ipd/api/billing.js` → `getIpdBillPreview` |
| **Hook** | `useIpdBillPreviewQuery` |

**Purpose:**

- Bill preview / self billing page payment totals
- Patient profile running bill summary
- **Auto daily charge lines** for room (`item_type: "bed"`) and doctor (`item_type: "visit"`) — frontend splits bed into **one row per stay day** using `admitted_at` + `length_of_stay_days`

**Path parameters:**

| Parameter | Type | Required |
|---|---|---|
| `admission_id` | integer | Yes |

**Response (used fields):**

```json
{
  "admission_id": 0,
  "admission_no": "IPD-1003",
  "patient_name": "…",
  "ward_name": "General",
  "bed_number": "G-102",
  "length_of_stay_days": 8,
  "bed_rate": 500.0,
  "items": [
    {
      "id": null,
      "description": "Bed Charge (G-102)",
      "qty": 8,
      "unit_price": 500.0,
      "amount": 4000.0,
      "item_type": "bed"
    },
    {
      "id": 0,
      "description": "Doctor Visit — Dr. …",
      "qty": 1,
      "unit_price": 500.0,
      "amount": 500.0,
      "item_type": "visit"
    }
  ],
  "subtotal": 4500.0,
  "gst_percent": 5.0,
  "gst_amount": 225.0,
  "grand_total": 4725.0
}
```

**Note:** Preview currently includes **bed + doctor visits only**. Pharmacy, laboratory, and procedure lines are **not** returned.

---

### B.3 Generate bill

| | |
|---|---|
| **API Name** | Generate IPD Bill |
| **Status** | **EXISTING API** |
| **HTTP Method** | `POST` |
| **Endpoint** | `/ipd/billing/generate` |
| **Frontend file** | `src/features/ipd/api/billing.js` → `generateIpdBill` |
| **Hook** | `useGenerateIpdBillMutation` |

**Purpose:** Collect payment / generate bill from preview page and discharge wizard.

**Request body (used fields):**

```json
{
  "admission_id": 0,
  "extra_items": [],
  "gst_percent": null,
  "pay_later": false,
  "payment_mode": "cash",
  "amount_received": 1050.0,
  "transaction_reference": "…"
}
```

**Response:** `IpdBillOut` (see B.6).

---

### B.4 Pay bill

| | |
|---|---|
| **API Name** | Collect IPD Bill Payment |
| **Status** | **EXISTING API** |
| **HTTP Method** | `POST` |
| **Endpoint** | `/ipd/billing/{bill_id}/pay` |
| **Frontend file** | `src/features/ipd/api/billing.js` → `payIpdBill` |
| **Hook** | `usePayIpdBillMutation` |

**Request body:**

```json
{
  "amount": 500.0,
  "payment_mode": "cash",
  "transaction_reference": "…"
}
```

---

### B.5 Payment history

| | |
|---|---|
| **API Name** | IPD Payment History |
| **Status** | **EXISTING API** |
| **HTTP Method** | `GET` |
| **Endpoint** | `/ipd/payments/history` |
| **Frontend file** | `src/features/ipd/api/billing.js` → `getIpdPaymentHistory` |
| **Hook** | `useIpdPaymentHistoryQuery` |

**Query parameters:** `search`, `payment_mode`, `page`, `limit`

---

### B.6 Bill invoice

| | |
|---|---|
| **API Name** | Get IPD Bill Invoice |
| **Status** | **EXISTING API** |
| **HTTP Method** | `GET` |
| **Endpoint** | `/ipd/billing/{bill_id}/invoice` |
| **Frontend file** | `src/features/ipd/api/billing.js` → `getIpdBillInvoice` |
| **Hook** | `useIpdBillInvoiceQuery` |

**Response (used fields):** Invoice print layout — `bill_number`, `bill_items[]` (`description`, `qty`, `unit_price`, `amount`), totals, patient/admission info.

---

### B.7 Unified IPD billing bundle (daily + final + manual)

| | |
|---|---|
| **API Name** | Get IPD Billing Bundle |
| **Status** | **BACKEND API REQUIRED** (`IPD_BILLING_USE_LIVE_API = false` in frontend) |
| **HTTP Method** | `GET` |
| **Endpoint** | `/ipd/admissions/{admission_id}/billing` *(planned in frontend stub only — not deployed)* |
| **Frontend file** | `src/features/ipd/api/ipdBilling.js` → `getIpdBillingBundle` |
| **Repository** | `src/features/ipd/billing/ipdBillingRepository.js` |

**Purpose:** Replace `sessionStorage` (`ipd-self-pay-billing-{admissionId}`) and insurance dummy billing persistence with one admission-scoped bundle.

**Path parameters:** `admission_id` (required)

**Response fields required by frontend mapper** (`mapBackendBillingBundleResponse`):

The mapper accepts a flexible object. Minimum fields the UI needs:

```json
{
  "admission_id": 0,
  "patient_id": 0,
  "claim_id": "CLM-…",
  "transactions": [
    {
      "id": "…",
      "admission_id": 0,
      "patient_id": 0,
      "charge_date": "2026-08-12",
      "category": "room",
      "particulars": "Bed Charge (G-102)",
      "quantity": 1,
      "unit": null,
      "rate": 500.0,
      "amount": 500.0,
      "source": "room",
      "source_id": "…",
      "status": "active"
    }
  ],
  "charge_heads": [
    {
      "id": "room",
      "charge_category": "room",
      "label": "Room Charges",
      "amount": 4000,
      "is_default": true,
      "sort_order": 1
    }
  ],
  "claim": { /* insurance only — see F */ },
  "patient": { /* insurance profile snapshot — see F */ }
}
```

**`source` values used by frontend:** `room` | `doctor` | `pharmacy` | `laboratory` | `procedure` | `manual`

---

### B.8 Get daily billing

| | |
|---|---|
| **API Name** | Get IPD Daily Billing |
| **Status** | **BACKEND API REQUIRED** |
| **HTTP Method** | `GET` |
| **Endpoint** | `/ipd/admissions/{admission_id}/billing/daily` *(frontend stub only)* |
| **Frontend file** | `src/features/ipd/api/ipdBilling.js` → `getIpdDailyBilling` |

**Purpose:** Date-wise daily charge lines for Daily Charges UI.

---

### B.9 Save daily billing (manual + persisted auto lines)

| | |
|---|---|
| **API Name** | Update IPD Daily Billing |
| **Status** | **BACKEND API REQUIRED** |
| **HTTP Method** | `PUT` |
| **Endpoint** | `/ipd/admissions/{admission_id}/billing/daily` *(frontend stub only)* |
| **Frontend file** | `src/features/ipd/api/ipdBilling.js` → `updateIpdDailyBilling` |
| **Hook** | `useSaveIpdDailyBillingMutation` / `useSaveIpdSelfPayDailyBillingMutation` |

**Purpose:** Persist manual daily entries; auto module lines should be stored or recomputable server-side.

**Request body (logical shape — daily row UI model):**

```json
{
  "daily_charges": [
    {
      "id": "…",
      "charge_date": "2026-08-12",
      "head": "Pharmacy",
      "charge_category": "pharmacy",
      "item_name": "IV Normal Saline 500ml",
      "quantity": 2,
      "amount": 1200,
      "source": "manual"
    }
  ]
}
```

---

### B.10 Get / save final billing (hospital charge heads)

| | |
|---|---|
| **API Name** | Get / Update IPD Final Billing |
| **Status** | **BACKEND API REQUIRED** |
| **HTTP Method** | `GET` / `PUT` |
| **Endpoint** | `/ipd/admissions/{admission_id}/billing/final` *(frontend stub only)* |
| **Frontend file** | `src/features/ipd/api/ipdBilling.js` |
| **Hooks** | `useSaveIpdFinalBillingMutation`, `useSaveIpdSelfPayFinalBillingMutation` |

**Purpose:** Persist hospital charge head amounts and custom heads.

**Charge head shape (used by UI today):**

```json
{
  "id": "room",
  "charge_category": "room",
  "label": "Room Charges",
  "amount": 4000,
  "is_default": true,
  "sort_order": 1
}
```

Default categories: `room`, `doctor`, `laboratory`, `pharmacy`, `procedure`, `miscellaneous`, `discount`, `custom`

---

## C. Daily Charges

### C.1 UI daily row shape (existing — do not change)

The Daily Charges screen uses this row model (`insuranceDailyCharges.js`):

| Field | Type | Description |
|---|---|---|
| `id` | string | Row id |
| `charge_date` | string | `YYYY-MM-DD` — **one calendar day per group** |
| `head` | string | Typed charge head label (e.g. `Pharmacy`, `Room Charges`) |
| `charge_category` | string | `room` \| `doctor` \| `laboratory` \| `pharmacy` \| `procedure` \| `miscellaneous` |
| `item_name` | string | Medicine / test / treatment / bed description |
| `quantity` | number | **Count on that date** (e.g. 2 medicines same day → qty 2) |
| `amount` | number | Line total |
| `source` | string | Optional — `room` \| `doctor` \| … \| `manual` |
| `source_id` | string | Optional — upstream module record id |
| `isAuto` | boolean | Optional — system-generated row |

### C.2 Business rules (existing frontend logic)

1. **Daily billing is date-wise** — UI groups rows by `charge_date`.
2. **One bed charge row per day** — qty `1`, amount = daily bed rate (not qty = total stay days).
3. **Multiple items same day** — separate rows; qty reflects count on that date only.
4. **Saving daily charges** rolls up into hospital charge heads by category (room, doctor, pharmacy, …).
5. **Manual rows** are persisted; **auto rows** (bed/doctor from preview) are regenerated from APIs when no backend daily API exists.

### C.3 Data source today

| Flow | Daily charges source |
|---|---|
| Self / Pay & Claim | Auto from `GET /ipd/billing/preview/{id}` + `admitted_at` / `doctor_visits`; manual in `sessionStorage` |
| Insurance / Cashless | Dummy seed + `sessionStorage` via claim overrides |

### C.4 BACKEND API REQUIRED

`GET/PUT /ipd/admissions/{admission_id}/billing/daily` (or equivalent) returning rows in **C.1** shape, scoped to `admission_id`.

---

## D. Module-Based Automatic Charges

### D.1 Room / Bed

| | |
|---|---|
| **Existing API** | `GET /ipd/billing/preview/{admission_id}` — one aggregated bed line (`item_type: "bed"`, `qty` = stay days) |
| **Supporting API** | `GET /ipd/admissions/{admission_id}` — `admitted_at`, `length_of_stay_days`, `ward_name`, `bed_number` |
| **Bed transfer** | `POST /ipd/beds/transfer` — updates current bed only |

**BACKEND API REQUIRED:**

- **Room/bed stay history** per admission (date ranges, ward, bed, rate) for correct daily rows when patient moves ward/ICU mid-stay.
- Ideally daily bed rows returned directly from billing daily API with `source: "room"` and `source_id` = bed allocation record id.

**Frontend today:** Splits preview bed line into per-day rows using `admitted_at` + `length_of_stay_days`. Cannot represent multiple ward periods without history API.

---

### D.2 Doctor

| | |
|---|---|
| **Existing API** | `POST /ipd/admissions/{admission_id}/visits` — create visit |
| **Existing API** | `GET /ipd/admissions/{admission_id}` — `doctor_visits[]` with `visited_at`, `charge` |
| **Existing API** | Preview includes one line per visit (`item_type: "visit"`) |

**BACKEND API REQUIRED:** None for basic doctor daily lines if visits API is used. Billing daily API should emit visit rows with `charge_date = visited_at` and `source: "doctor"`.

---

### D.3 Pharmacy

| | |
|---|---|
| **Existing API for IPD billing** | **None** |

**BACKEND API REQUIRED:** IPD pharmacy charge feed per admission (dispensing lines with date, item, qty, amount) → billing daily transactions with `source: "pharmacy"`.

Pharmacy module APIs exist elsewhere in the hospital app but are **not connected** to IPD billing UI today.

---

### D.4 Laboratory

| | |
|---|---|
| **Existing API for IPD billing** | **None** |

**BACKEND API REQUIRED:** IPD lab order/report charges per admission → daily rows with `source: "laboratory"`.

---

### D.5 Procedure / Treatment

| | |
|---|---|
| **Existing API for IPD billing** | **None** |

**BACKEND API REQUIRED:** Procedure/treatment charges per admission → daily rows with `source: "procedure"` (UI label: **Treatment**).

---

## E. Final Billing (Hospital Charge Heads)

### E.1 UI categories (existing)

```text
Room & Bed Charges      (room)
Doctor Charges          (doctor)
Laboratory              (laboratory)
Pharmacy                (pharmacy)
Treatment               (procedure)
Miscellaneous           (miscellaneous)
Discount                (discount)
Additional custom heads (custom)
Gross bill / Net bill
```

### E.2 Who calculates totals?

| Component | Calculated by |
|---|---|
| **Hospital charge head amounts** | **Frontend** — `calculateInsuranceChargeTotals()` from charge head rows |
| **Daily → head rollup** | **Frontend** — `rollupDailyChargesToChargeHeads()` / `mergeSelfPayChargeHeads()` on save |
| **Preview payment totals (self)** | **Backend** — `subtotal`, `gst_amount`, `grand_total` from preview/generate APIs |
| **Insurance claim financials** | **Frontend** — `recalculateClaimFinancials()` on dummy/session claim |

**Backend should either:**

- Return persisted `charge_heads` matching UI shape, **or**
- Return `transactions[]` and let frontend mapper build heads (current mapper supports both via `mapBackendBillingBundleResponse`)

Do **not** change frontend calculation rules without a coordinated change.

---

## F. Insurance / Cashless Billing

All insurance screens below currently use **`dummyInsuranceClaim.js`** and/or **`sessionStorage`** unless noted.

### F.1 Insurance billing page

**Route:** `/ipd/billing/insurance/:patientId`  
**Data path:** `useIpdInsuranceBillingBundleQuery` → `ipdBillingRepository` → `ipdBillingDummyAdapter`

**BACKEND API REQUIRED** — replace bundle with admission-linked insurance billing + claim data.

### F.2 Claim record (used across billing, claim detail, profile)

Fields the frontend **already reads/writes** on claim object:

| Field | Used for |
|---|---|
| `id` | `claimId` |
| `ipdId` | Admission display / linkage |
| `patientName`, `uhid`, `ageGender` | Display |
| `admissionDate`, `dischargeDate` | Display |
| `doctor`, `wardRoom` | Display |
| `insurer`, `policyNo`, `tpa` | Policy |
| `policyHolder`, `relationship` | Policy |
| `sumInsured`, `availableSi` | Policy limits |
| `validTill`, `memberId`, `cardNumber` | Policy |
| `policyStatus`, `coverage` | Display |
| `grossBill`, `discount`, `netBill` | Billing totals |
| `claimed`, `estimateAmount` | Claim amounts |
| `approved`, `notApproved` | Approval |
| `patientResponsibility`, `patientPaid`, `patientOutstanding` | Patient liability |
| `insReceived`, `insOutstanding` | Settlement |
| `status`, `statusLabel` | Claim workflow |
| `insPaymentStatus`, `patientPaymentStatus` | Payment badges |
| `charges[]` | Hospital charge heads (same shape as E) |
| `dailyCharges[]` | Daily rows (same shape as C.1) |
| `responsibilityLines[]` | Claim detail — patient responsibility breakdown |
| `insurancePayments[]` | Claim detail — insurance payment log |
| `patientPayments[]` | Claim detail — patient payment log |

### F.3 Insurance patient profile

**Route:** `/ipd/patients/insurance/:patientId`  
**Source:** `resolveInsurancePatientContext` — dummy patients + `ipd-ins-admit-ctx:*` sessionStorage

**BACKEND API REQUIRED:**

| API | Purpose |
|---|---|
| Get insurance patient profile by `patientId` + `admissionId` | Profile header, policy details |
| List insurance history / claims for patient | Insurance history section |

### F.4 Insurance claim detail

**Route:** `/ipd/insurance-claim/view/:claimId`  
**Source:** `getInsuranceClaim(claimId)` — dummy + `ipd-ins-claim-override:{claimId}` sessionStorage

**BACKEND API REQUIRED:**

| API | Purpose |
|---|---|
| `GET` claim by `claimId` | Load claim detail |
| `PATCH/PUT` claim | Update status, approved amount, payments, responsibility lines |

### F.5 Insurance billing save operations (no backend today)

| Frontend action | Repository method | Backend needed |
|---|---|---|
| Save hospital charge heads | `saveIpdInsuranceFinalCharges` | `PUT …/billing/final` or claim billing endpoint |
| Save daily charges | `saveIpdInsuranceDailyCharges` | `PUT …/billing/daily` |
| Save claim / estimate / patient pay | `saveIpdInsuranceClaimAmounts` | Claim update endpoint |

### F.6 Pay-and-claim insurance metadata

**Route:** Same as self billing — `/ipd/billing/preview/:admissionId`  
**Source:** `sessionStorage` key `ipd-pay-claim-ins:{admissionId}`

**Fields stored:** `insurer`, `policyNo`, `memberId`, `policyHolder`, `relationship`, `claimedAmount`, `estimateAmount`, `coverage`, …

**BACKEND API REQUIRED:** Persist pay-and-claim insurance profile on admission (linked to `admission_id`).

---

## G. Patient Profile Billing

**Route:** `/ipd/admissions/:admissionId` (`IpdPatientDetailPage`)

### G.1 What profile shows today

| Section | Data source |
|---|---|
| Running charges table | `running_bill.items` from **EXISTING** `GET /ipd/admissions/{id}` |
| Bill summary | `running_bill.subtotal/gst/grand_total` + payment view from `bills[]` |
| Generated bills list | `bills[]` on admission detail |
| Link to full billing | Navigate to `/ipd/billing/preview/:admissionId` |

**Note:** Daily Charges UI is on the **billing page**, not the profile summary (by design). Profile includes a hint to open billing for daily breakdown.

### G.2 BACKEND API REQUIRED for full profile billing

| Need | Reason |
|---|---|
| Admission-scoped daily + final billing bundle | Profile hook `useIpdPatientBillingContext` prepared but profile UI is summary-only |
| Insurance claim link on profile | When admission is insurance cashless |

**Required IDs on all billing responses:** `patient_id` + `admission_id` (+ `claim_id` for insurance).

---

## H. Dummy / SessionStorage Audit

| Current source | Storage key / location | Used for | Backend API needed |
|---|---|---|---|
| `DUMMY_INSURANCE_CLAIMS` | In-memory module | Demo claims (e.g. CLM-2001) | Insurance claim CRUD + list |
| `DUMMY_INSURANCE_PATIENTS` | In-memory module | Demo insurance patients | Insurance patient list API |
| `ipd-ins-claim-override:{claimId}` | sessionStorage | Persisted claim edits | Claim update API |
| `ipd-ins-admit-ctx:{routePatientId}` | sessionStorage | Cashless admit → profile + billing context | Insurance admission context API |
| `ipd-pay-claim-ins:{admissionId}` | sessionStorage | Pay-and-claim policy metadata | Admission insurance profile API |
| `ipd-self-pay-billing-{admissionId}` | sessionStorage | Self/P&C daily charges (manual) + charge heads | `GET/PUT …/billing/daily` + `…/final` |
| `buildInsuranceAdmitContext` | Created on admit | Seeds patient + claim after real admit | Insurance claim create API |
| `getDummyInsuranceBills` | In-memory | Insurance bills list table | Insurance bills list API |
| `isCashlessAdmission(patientUid)` | Checks sessionStorage | Payment type filter on lists | Admission payment/insurance type on API |
| `isPayAndClaimAdmission(admissionId)` | Checks sessionStorage | Payment type filter | Admission insurance type on API |
| `DEFAULT_INSURANCE_CHARGE_HEADS` | Hardcoded template | Default hospital heads when no data | Optional — can stay as UI template |
| Auto bed/doctor daily rows | Derived from preview API | Self daily charges (auto) | Daily billing API with per-day rows |
| Bill preview bed aggregation | `GET /ipd/billing/preview` | Single line qty=days | Prefer daily API or per-day bed records |

---

## I. Canonical billing transaction (mapper target)

When backend returns unified billing, the frontend mapper normalizes to:

| Field | Description |
|---|---|
| `id` | Transaction id |
| `admissionId` | Required |
| `patientId` | Required |
| `chargeDate` | `YYYY-MM-DD` |
| `category` | Charge category |
| `particulars` | Item / service name |
| `quantity` | Number |
| `unit` | Optional |
| `rate` | Unit rate |
| `amount` | Line total |
| `source` | `room` \| `doctor` \| `pharmacy` \| `laboratory` \| `procedure` \| `manual` |
| `sourceId` | Upstream module id |
| `status` | `active` \| `void` \| `draft` |

---

## J. Final Backend Checklist

### J.1 Backend already available (usable today)

- [x] `GET /ipd/patients` — admission list
- [x] `GET /ipd/admissions/{admission_id}` — detail + visits + bills + running_bill
- [x] `POST /ipd/admissions` — admit
- [x] `PUT /ipd/admissions/{admission_id}` — update admission
- [x] `POST /ipd/admissions/{admission_id}/visits` — doctor visit
- [x] `POST /ipd/admissions/{admission_id}/discharge` — discharge
- [x] `POST /ipd/beds/transfer` — bed transfer (current bed only)
- [x] `GET /ipd/billing/running` — open bills list
- [x] `GET /ipd/billing/preview/{admission_id}` — preview (bed + visits)
- [x] `POST /ipd/billing/generate` — generate bill
- [x] `POST /ipd/billing/{bill_id}/pay` — collect payment
- [x] `GET /ipd/billing/{bill_id}/invoice` — invoice
- [x] `GET /ipd/payments/history` — payment history

### J.2 Backend API required (blocking full backend-driven billing/insurance)

**Billing (all payment types)**

- [ ] `GET /ipd/admissions/{admission_id}/billing` — unified bundle
- [ ] `GET /ipd/admissions/{admission_id}/billing/daily` — date-wise daily rows
- [ ] `PUT /ipd/admissions/{admission_id}/billing/daily` — save manual daily rows
- [ ] `GET /ipd/admissions/{admission_id}/billing/final` — hospital charge heads
- [ ] `PUT /ipd/admissions/{admission_id}/billing/final` — save charge heads

**Module feeds (auto charges)**

- [ ] Room/bed **stay history** per admission (ward/ICU changes)
- [ ] Pharmacy charges per admission
- [ ] Laboratory charges per admission
- [ ] Procedure/treatment charges per admission

**Insurance / Cashless**

- [ ] Insurance patient list / bills list
- [ ] Insurance patient profile (`GET` by patient + admission)
- [ ] Insurance claim create on admit
- [ ] Insurance claim `GET` / `PUT` by `claimId`
- [ ] Claim payments & responsibility lines persistence
- [ ] Pay-and-claim insurance profile on admission

**Admission metadata**

- [ ] `payment_type` / insurance flags on admission API (replace sessionStorage filters)

### J.3 Dummy data to remove after backend is ready

| Remove when API exists |
|---|
| `DUMMY_INSURANCE_CLAIMS`, `DUMMY_INSURANCE_PATIENTS` → insurance claim/patient APIs |
| `ipd-ins-claim-override:*` → claim update API |
| `ipd-ins-admit-ctx:*` → insurance admission context API |
| `ipd-pay-claim-ins:*` → admission insurance profile API |
| `ipd-self-pay-billing-*` → daily + final billing APIs |
| `getDummyInsuranceBills()` → insurance bills list API |
| Frontend preview-only bed split logic → daily API returns per-day bed rows |

### J.4 Frontend connection work after backend is ready

```text
1. Connect endpoint in src/features/ipd/api/ or ipdBilling.js
2. Map response in src/features/ipd/billing/ipdBillingMapper.js
3. Set IPD_BILLING_USE_LIVE_API = true (when bundle endpoints are live)
4. Remove dummy/sessionStorage source from repository adapter
5. Verify React Query hooks invalidate admission + billing keys
6. Test Daily Billing (per-day rows, qty rules)
7. Test Final Billing (charge head rollup)
8. Test Insurance Cashless billing + claim detail
9. Test Pay & Claim + Self on /ipd/billing/preview/:admissionId
10. Test Patient Profile summary still loads running_bill + bills
```

---

## K. Frontend integration files (reference for backend team)

| File | Role |
|---|---|
| `src/features/ipd/api/billing.js` | **Existing** self-pay billing APIs |
| `src/features/ipd/api/ipdBilling.js` | **Planned** unified billing stubs (`IPD_BILLING_USE_LIVE_API`) |
| `src/features/ipd/billing/ipdBillingRepository.js` | API vs dummy/session routing |
| `src/features/ipd/billing/ipdBillingMapper.js` | Response → UI models |
| `src/features/ipd/billing/ipdBillingModel.js` | Canonical transaction shape |
| `src/features/ipd/hooks/useIpdBillingQuery.js` | React Query hooks |
| `src/features/ipd/utils/dummyInsuranceClaim.js` | **To be retired** — insurance dummy + session |
| `src/features/ipd/billing/ipdSelfPayBillingStorage.js` | **To be retired** — self daily/final session |

---

*Last updated from frontend codebase inspection. Endpoint paths marked as frontend stubs are not deployed on backend until explicitly implemented.*

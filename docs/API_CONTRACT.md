# SaffoCare — API Contract

Backend developers implement these endpoints so the React frontend works with `VITE_USE_MOCK_DATA=false`.

## Overview

| Item | Value |
|------|--------|
| Base URL | `{VITE_API_BASE_URL}` (default `http://127.0.0.1:8000`; no `/api` prefix) |
| Auth | `Authorization: Bearer <access_token>` on protected routes |
| Content-Type | `application/json` |
| Error format | `{ "detail": "message" }` or `{ "message": "message" }` |
| Dates | ISO 8601 (`YYYY-MM-DD` or full timestamp) preferred; UI displays `en-GB` short dates when mock |
| IDs | String identifiers (e.g. `P-1001`, `APT-001`) or integers/UUIDs — **be consistent**; frontend mappers accept all |

List endpoints may return:

- A JSON array: `[{ ... }, ...]`
- Or wrapped: `{ "results": [...] }` or `{ "data": [...] }`

---

## Auth

### POST `/auth/login`

**Request**

```json
{
  "email": "opd@saffocare.local",
  "password": "opd123"
}
```

**Response 200**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

**Response 401**

```json
{ "detail": "Invalid credentials" }
```

### GET `/auth/me` (Bearer required)

**Response 200**

```json
{
  "id": 1,
  "email": "opd@saffocare.local",
  "role": "opd",
  "full_name": "Billing Counter",
  "department": "OPD"
}
```

`role` must be exactly one of: `"opd"`, `"doctor"`, `"admin"`.

### POST `/auth/logout` (Bearer required)

**Response 200**

```json
{ "message": "Logged out successfully" }
```

### POST `/auth/register`

**Request**

```json
{
  "email": "user@example.com",
  "password": "secret",
  "full_name": "New User",
  "role": "opd"
}
```

### POST `/auth/refresh`

**Request**

```json
{ "refresh_token": "<refresh_token>" }
```

---

## Patients

Field mapping (API ↔ UI) is in `src/shared/api/mappers/patientMapper.js`.

### GET `/patients`

**Response 200** — array of patients (API shape):

```json
[
  {
    "id": "P-1001",
    "full_name": "Demo Patient Alpha",
    "age": 34,
    "gender": "Female",
    "phone_number": "9000000001",
    "email": null,
    "address": "1 Mock Street, Demo City",
    "blood_group": "B+",
    "date_of_birth": null,
    "created_at": "2024-01-15",
    "is_active": true,
    "dept_id": "DEP01",
    "doctor_id": "D001",
    "state": "Demo State",
    "aadhaar": "0000-0000-0001",
    "allergies": "Demo allergen A"
  }
]
```

### GET `/patients/:id`

Single patient object (same fields).

### POST `/patients`

**Request** — API shape (server may assign `id`):

```json
{
  "full_name": "Demo Patient Alpha",
  "age": 34,
  "gender": "Female",
  "phone_number": "9000000001",
  "address": "1 Mock Street, Demo City",
  "blood_group": "B+",
  "dept_id": "DEP01",
  "doctor_id": "D001",
  "state": "Demo State",
  "aadhaar": "0000-0000-0001",
  "allergies": "Demo allergen A"
}
```

**Response 201** — created patient (API shape).

### PUT `/patients/:id`

**Request** — partial or full API shape fields to update.

**Response 200** — updated patient.

### DELETE `/patients/:id`

**Response 204** — no body.

---

## Appointments

Mapper: `src/shared/api/mappers/appointmentMapper.js`.

### GET `/appointments`

**Response 200** — example item (API shape):

```json
{
  "id": "APT-001",
  "patient_id": "P-1001",
  "patient_name": "Demo Patient Alpha",
  "doctor_id": "D001",
  "doctor_name": "Dr. Mehta",
  "dept_id": "DEP01",
  "dept_name": "General Medicine",
  "appointment_date": "25 May 2026",
  "time_slot": "9:00 AM",
  "status": "Scheduled",
  "consult_status": "Waiting",
  "type": "Follow-up",
  "notes": "Follow-up review"
}
```

### GET `/appointments/:id`

Single appointment.

### POST `/appointments`

**Request**

```json
{
  "patient_id": "P-1001",
  "patient_name": "Demo Patient Alpha",
  "doctor_id": "D001",
  "doctor_name": "Dr. Mehta",
  "dept_id": "DEP01",
  "dept_name": "General Medicine",
  "appointment_date": "26 May 2026",
  "time_slot": "10:00 AM",
  "status": "Scheduled",
  "consult_status": "Waiting",
  "type": "New",
  "notes": "General checkup"
}
```

### PUT `/appointments/:id`

Update fields (date, time, status, etc.).

### DELETE `/appointments/:id`

Cancel appointment (frontend treats as cancel).

---

## Bills

Mapper: `src/shared/api/mappers/billMapper.js`.

### GET `/bills`

**Response 200** — example (API shape):

```json
{
  "id": "BILL-001",
  "patient_id": "P-1001",
  "patient_name": "Demo Patient Alpha",
  "bill_date": "2026-05-10",
  "items": [
    { "name": "Consultation", "qty": 1, "unitPrice": 500 },
    { "name": "Blood Test", "qty": 2, "unitPrice": 600 }
  ],
  "total_amount": 3500,
  "paid": 3500,
  "balance": 0,
  "status": "Paid",
  "payment_method": "Cash",
  "payments": [
    { "date": "2026-05-10", "amount": 3500, "mode": "Cash" }
  ]
}
```

### GET `/bills/:id`

Single bill.

### POST `/bills`

**Request** — full bill (API shape); server may assign `id`.

### PUT `/bills/:id`

Update bill.

### DELETE `/bills/:id`

Delete bill.

### POST `/bills/:id/payments`

**Request**

```json
{
  "date": "2026-05-11",
  "amount": 2000,
  "mode": "Cash",
  "ref": "optional-reference"
}
```

**Response 200** — updated bill or payment record.

### GET `/bills/payments`

Payment history list (array).

---

## Beds

### GET `/beds`

All beds (array).

### GET `/beds/ward/:wardName`

Beds for ward (`General`, `ICU`, `Private`, `Pediatric`).

### POST `/beds/assign`

**Request**

```json
{
  "bedNo": "G-02",
  "ward": "General",
  "patientId": "P-1001",
  "patientName": "Demo Patient Alpha",
  "department": "General Medicine",
  "admittedDate": "2026-05-25",
  "notes": ""
}
```

### POST `/beds/:bedId/release`

Release bed (empty body or `{}`).

### GET `/beds/wards`

List of ward names.

---

## Doctor — clinical

Mappers: `src/shared/api/mappers/clinicalMapper.js`.

### EMR records

| Method | Path | Body |
|--------|------|------|
| GET | `/doctor/records` | — |
| POST | `/doctor/records` | `{ "patient_id", "chief_complaint", "diagnosis", "notes", "vital_signs": {} }` |
| PATCH | `/doctor/records/:id` | Same fields (partial OK) |

**POST example**

```json
{
  "patient_id": "P-1001",
  "chief_complaint": "Fever, fatigue",
  "diagnosis": "Viral fever",
  "notes": "Rest + hydration\nMonitor temperature",
  "vital_signs": {}
}
```

### Prescriptions

| Method | Path | Body |
|--------|------|------|
| GET | `/doctor/prescriptions` | — |
| POST | `/doctor/prescriptions` | `{ "patient_id", "medication", "dosage", "frequency", "duration", "notes" }` |
| PATCH | `/doctor/prescriptions/:id` | `{ "medication", "dosage", "frequency", "duration", "notes", "active" }` |

**End prescription:** `PATCH` with `{ "active": false }`.

UI may send multiple medicines; frontend maps the first to API fields and appends extras in `notes`.

### Lab orders

| Method | Path | Body |
|--------|------|------|
| GET | `/doctor/labs` | — |
| POST | `/doctor/labs` | `{ "patient_id", "test_name", "priority", "notes" }` |
| PATCH | `/doctor/labs/:id` | `{ "status", "notes", "result" }` |

**Status values (API):** `ordered`, `processing`, `completed`, `cancelled`

UI statuses map as: `Ordered` → `ordered`, `Sample Collected` → `processing`, `Completed` → `completed`.

### Notifications

| Method | Path | Body |
|--------|------|------|
| GET | `/doctor/notifications` | — |
| PATCH | `/doctor/notifications/:id` | `{ "read": true }` |
| PATCH | `/doctor/notifications` | `{ "read": true }` (mark all read) |

**Notification item (API shape)**

```json
{
  "id": "N1",
  "kind": "emergency",
  "title": "Emergency case",
  "body": "Check high-priority appointments",
  "created_at": "2026-05-25",
  "read": false
}
```

---

## Doctors (admin CRUD)

| Method | Path |
|--------|------|
| GET | `/doctors` |
| GET | `/doctors/:id` |
| POST | `/doctors` |
| PUT | `/doctors/:id` |
| DELETE | `/doctors/:id` |

---

## Roles (admin)

| Method | Path |
|--------|------|
| GET | `/roles` |
| GET | `/roles/:id` |
| POST | `/roles` |
| PUT | `/roles/:id` |
| DELETE | `/roles/:id` |

---

## Out of scope (skip for now)

- Patient portal login (`/patient-login`) — UI only, no API
- Landing page marketing stats — hardcoded
- Lab, Pharmacy, Nurse modules — not built in frontend yet
- Departments / doctors dropdown lists — still from frontend `mockData` until `GET /departments` is added

---

## CORS

Backend must allow the frontend origin:

- `http://localhost:5173` (Vite dev server)

Include `Authorization` in allowed headers.

---

## HTTP status codes

| Code | Usage |
|------|--------|
| 200 | Success with body |
| 201 | Created |
| 204 | Success, no body (DELETE) |
| 401 | Unauthorized → frontend logs out and redirects to `/login` |
| 403 | Forbidden |
| 404 | Not found |
| 422 | Validation error |

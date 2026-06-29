# Backend Integration Guide — SaffoCare Frontend

Step-by-step instructions for connecting a real API to this React app.

## Prerequisites

- Node.js 18+
- Frontend: `cd frontend && npm install && npm run dev` → http://localhost:5173
- Backend: running at http://localhost:8000 (or update env URL)
- API implements [API_CONTRACT.md](./API_CONTRACT.md)

---

## Step 1 — Environment setup

Copy the example env file:

```bash
cd frontend
cp .env.example .env
```

Edit `.env` if needed (optional direct API URL):

```env
# VITE_API_BASE_URL=http://127.0.0.1:8000
```

Restart the dev server after changing env vars.

| Variable | Mock (`true`) | Live (`false`) |
|----------|---------------|----------------|
| Auth | Always `POST /auth/login` + `GET /auth/me` | (no mock auth) |
| `VITE_USE_MOCK_DATA` | In-memory `mock/store` for OPD/doctor lists | HTTP via `apiClient` |

---

## Step 2 — Verify auth first

Test login with curl:

```bash
curl -X POST http://127.0.0.1:8000/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"opd@saffocare.local\",\"password\":\"opd123\"}"
```

**Expected:**

```json
{
  "access_token": "<jwt>",
  "token_type": "bearer"
}
```

Then test current user:

```bash
curl http://127.0.0.1:8000/auth/me \
  -H "Authorization: Bearer <access_token>"
```

**Expected:** user object with `"role": "opd"` (or `doctor` / `admin`).

Open http://localhost:5173/login and sign in with the same credentials.

---

## Step 3 — Integration test checklist

- [ ] Login returns `access_token`
- [ ] `GET /auth/me` returns user with correct `role` field (`opd`, `doctor`, or `admin`)
- [ ] Patient list loads on OPD dashboard
- [ ] Create patient → appears in list after refresh
- [ ] Book appointment → appears in appointments list
- [ ] Create bill → appears in billing list
- [ ] Collect payment on a bill updates balance/status
- [ ] Doctor prescriptions / labs / records load (doctor role)
- [ ] `401` response → app redirects to `/login` automatically
- [ ] CORS: no blocked requests in browser console on localhost:5173

---

## Step 4 — If field names differ

The UI uses camelCase mock shapes. The backend may use snake_case.

Mappers translate automatically on the **live** path only:

| Resource | Mapper file |
|----------|-------------|
| Patients | `src/shared/api/mappers/patientMapper.js` |
| Appointments | `src/shared/api/mappers/appointmentMapper.js` |
| Bills | `src/shared/api/mappers/billMapper.js` |
| Doctor clinical | `src/shared/api/mappers/clinicalMapper.js` |

**Do not change React pages.** Adjust mappers if your API uses different names.

Mock mode (`VITE_USE_MOCK_DATA=true`) bypasses mappers.

---

## Step 5 — Architecture (where code lives)

```
Pages / components
  → @/shared/hooks/queries/*
    → @/shared/api/services/*
      → callApi({ mock, live })
        → features/*/api/*.js  (HTTP)
          → apiClient  →  {API_BASE_URL}{endpoint}
```

- Never import `shared/mock/store` from UI — only services may use it.
- Never check `VITE_USE_MOCK_DATA` in components — use services only.

---

## Step 6 — Common errors and fixes

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| CORS error in console | Backend blocks browser origin | Allow `http://localhost:5173`, methods, `Authorization` header |
| 401 on every request | Missing or invalid Bearer token | Ensure login stores token; check `Authorization: Bearer ...` |
| Empty lists, no error | Response shape not recognized | Return array, or `{ "results": [] }`, or `{ "data": [] }` |
| Login works but wrong dashboard | Wrong `role` value | Must be exactly `opd`, `doctor`, or `admin` |
| Network error toast | Server down or wrong URL | Check `VITE_API_BASE_URL` and backend is running |
| Doctor saves fail | Wrong clinical endpoints | See doctor section in API_CONTRACT.md (POST/PATCH per resource) |
| Patient fields blank | snake_case not mapped | Extend `patientMapper.js` |

---

## Step 7 — Recommended implementation order

1. Auth (`/auth/login`, `/auth/me`)
2. Patients CRUD
3. Appointments CRUD
4. Bills + payments
5. Beds
6. Doctor clinical (records, prescriptions, labs, notifications)

---

## Local scripts

```bash
npm run lint              # ESLint
npm run verify:features   # No cross-feature imports
npm run build             # Production build
```

---

## Questions?

See [API_CONTRACT.md](./API_CONTRACT.md) for full endpoint and payload details.

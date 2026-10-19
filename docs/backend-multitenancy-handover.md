# Backend multi-tenancy handover

This document is for the backend developer. It records what the current FastAPI source does, what the React frontend already assumes, and what the backend still has to change.

Repositories inspected:

- Frontend: `HM-frontend-Side` (React, Vite, JavaScript)
- Backend: `HM-System-Backend` (FastAPI, SQLAlchemy, PostgreSQL models)

Inspection date: 15 October 2026. Findings below come from reading the current source. They are not the result of a live cross-tenant API test. Where a leak depends on a request that was not executed, the status says so.

The frontend does not send `X-Tenant`, `X-Hospital-ID`, or a client-supplied `tenant_id`. Hospital identity is taken from the Bearer token and from `GET /auth/me`.

---

## A. Backend findings

### BE-01 — A user with no tenant skips the inactive-hospital check

1. Finding ID: BE-01
2. Severity: P0
3. Location:
   - `HM-System-Backend/dependencies.py`, `get_current_user` (about lines 40–45) and `PermissionChecker.__call__` (about lines 90–95)
   - `HM-System-Backend/Routers/auth.py`, `_hospital_blocked` (lines 25–28), used by `login` and `refresh_tokens`
   - `HM-System-Backend/Models/user.py`, `User.tenant_id` is `nullable=True`
4. Current behavior: the inactive-hospital check runs only when `user.tenant_id is not None`. `_hospital_blocked` returns `False` immediately when `tenant_id` is `None`. Login, refresh, and authenticated requests therefore succeed for an active user who has no hospital.
5. Why it matters: a missing tenant must not mean “all hospitals.” Combined with BE-02, those requests are not limited to one hospital’s rows.
6. Required change: reject login, refresh, and protected hospital routes when `tenant_id` is null, unless the account is an explicitly designed platform operator with a separate authorization path. Do not treat null as a wildcard inside hospital modules.
7. Expected behavior: `POST /auth/login` and `POST /auth/refresh` return 403 for a hospital user with no tenant. `GET /auth/me` is not issued a usable hospital session. Protected OPD, IPD, doctor, nurse, pharmacy, lab, receptionist, and hospital-admin routes return 403.
8. Tests: create a user with `tenant_id = NULL` and `is_active = true`. Login must fail. A forged or leftover access token for that user must fail on `GET /patients` (or the equivalent list) and must not return another hospital’s rows.
9. Frontend impact: the frontend already refuses to enter hospital routes when `/auth/me` has a missing or invalid `tenant_id`, and it clears the local session. That does not stop a direct API call.
10. Status: confirmed from source. Not executed against a running server.

### BE-02 — The automatic tenant filter does nothing when tenant id is missing

1. Finding ID: BE-02
2. Severity: P0
3. Location: `HM-System-Backend/Models/tenant_filter.py`, `_filter_by_tenant` (lines 20–47) and `_assign_tenant_id` (lines 10–17)
4. Current behavior: on SELECT, the listener adds `tenant_id == <session tenant>` only when `session.info["tenant_id"]` is truthy. If it is missing, the listener returns and the query is unchanged. `get_current_user` sets `db.info["tenant_id"] = user.tenant_id`, so a null user tenant stores null and the filter is skipped. The same listener also returns immediately for relationship loads and column loads, and it does not apply to UPDATE or DELETE.
5. Why it matters: hospital isolation currently depends on this listener. A null tenant disables it for every `TenantScoped` model (patients, visits, admissions, lab tests, dispensing, handovers, and the other subclasses).
6. Required change: fail closed. If a hospital request has no tenant in the session, do not run the query. Apply the same ownership rule to updates, deletes, and relationship loads. Keep `include_all_tenants` only on the few platform operations that intentionally cross hospitals, and require a platform role there.
7. Expected behavior: a hospital request without a tenant returns 403 and reads or writes zero rows. A request with tenant A never updates or deletes tenant B’s row by primary key.
8. Tests: with `db.info["tenant_id"]` unset, a `SELECT` on `Patient` returns no hospital rows (or the request is rejected before the query). An `UPDATE` of patient id belonging to tenant B, while the session tenant is A, changes zero rows.
9. Frontend impact: the UI cannot compensate for an unfiltered query. Cache clearing only protects the browser.
10. Status: confirmed from source. The cross-tenant result was not executed against PostgreSQL in this pass.

### BE-03 — Several clinical and billing tables are not tenant-scoped

1. Finding ID: BE-03
2. Severity: P1
3. Location: models that extend `Base` rather than `TenantScoped`, including:
   - `Models/opd_billing.py`: `BillItem`, `PaymentTransaction`
   - `Models/ipd.py`: `IpdAdmissionCareTeam`, `IpdAdmissionBilling`, `IpdInsuranceClaim`, `IpdDoctorVisit`, `IpdBill`, `IpdBillItem`, `IpdPaymentTransaction`
   - `Models/pharmacy_dispensing.py`: `DispensingItem`
   - `Models/lab_result.py`: `LabResultParameter`
   - `Models/nurse_shift_handover.py`: `ShiftHandoverPatient`
   - `Models/nurse_workforce.py`: `NurseWorkforceRoster`
   - `Models/hospital_settings.py`: `HospitalSettings` (has its own `tenant_id` column and an explicit filter in `hospital_settings_service._require_tenant_id`)
4. Current behavior: `with_loader_criteria` in `tenant_filter.py` applies to `TenantScoped`, `User`, and `AuditLog` only. A query such as `db.query(IpdBill).filter(IpdBill.id == bill_id)` is not rewritten with a tenant predicate. `Services/ipd_service.py` loads `IpdBill` by id and then calls `ipd_helpers.get_admission`, which queries `IpdAdmission` (tenant-scoped). When a tenant is present, the admission lookup can 404 before the invoice is returned. When BE-01/BE-02 apply, that second check is also unfiltered.
5. Why it matters: child rows are hospital data. Any endpoint that returns them without a parent ownership check can cross hospitals. New endpoints can miss the parent check because the model itself does not enforce it.
6. Required change: give every hospital-owned row a `tenant_id`, or resolve every child read and write through a parent that is tenant-checked and abort when the parent is outside the caller’s tenant. Do this for list, get, update, delete, export, and bulk routes.
7. Expected behavior: `GET` or `PATCH` of a bill, bill item, payment, lab parameter, dispensing line, handover patient, or roster row from another hospital returns 404.
8. Tests: insert the same child primary key shape in tenant A and tenant B. Authenticate as tenant A and request tenant B’s id. Expect 404 and no changed row.
9. Frontend impact: the frontend sends the id it received from a previous response. It cannot know whether that id belongs to another hospital.
10. Status: the missing `TenantScoped` base class is confirmed. A full endpoint-by-endpoint exploit list was not executed; treat cross-tenant responses on these tables as a confirmed design gap and verify each route with the test above.

### BE-04 — Logout does not revoke tokens

1. Finding ID: BE-04
2. Severity: P1
3. Location: `HM-System-Backend/Routers/auth.py`, `logout` (lines 154–171). `jwt_token.py` issues stateless JWTs. `create_refresh_token` stores only `sub`, `type`, and `exp`.
4. Current behavior: `POST /auth/logout` writes an `auth.logout` audit event and returns `{"message": "Logged out successfully"}`. It does not store a revocation entry, rotate a token family, or reject the presented access or refresh token on a later request.
5. Why it matters: after a user signs out, the same tokens still authorize API calls until they expire. A stolen token remains valid. The frontend deletes its copy; that does not invalidate a copy held elsewhere.
6. Required change: document and implement a revocation policy. Minimum: reject the refresh token used at logout, and reject access tokens issued before logout for that user (denylist, version counter on the user, or equivalent). Refresh must check that the token is still active.
7. Expected behavior: after a successful logout, the old access token receives 401 on `GET /auth/me`, and the old refresh token receives 401 on `POST /auth/refresh`.
8. Tests: login, call logout with the access token, then call `/auth/me` with the same access token and `/auth/refresh` with the old refresh token. Both fail.
9. Frontend impact: the frontend already calls `POST /auth/logout` with the current Bearer token before it clears local storage, and it still clears local storage if that call fails. It will keep doing that. It cannot make revocation real.
10. Status: confirmed from source.

### BE-05 — Access-token tenant claims are not the authorization source

1. Finding ID: BE-05
2. Severity: P1
3. Location:
   - `Routers/auth.py`, `_issue_token_pair` (lines 40–63) puts `tenant_id` and `hospital` on the access token and on the login JSON
   - `jwt_token.py`, `create_refresh_token` does not include `tenant_id`
   - `dependencies.py`, `get_current_user` loads `User` by `sub` and uses the database row, not the JWT `tenant_id`
   - `POST /auth/refresh` returns only `access_token`, `refresh_token`, and `token_type` (lines 213–218)
4. Current behavior: login and `GET /auth/me` both return `user_id`, `tenant_id`, `hospital: {id, name, code}`, `role`, and `permissions`. Refresh reloads the user and puts the current database tenant into the new access token, but the refresh JSON itself has no `tenant_id` or `hospital`. Nothing compares the JWT `tenant_id` claim to the database value before the request proceeds.
5. Why it matters: the frontend treats `/auth/me` as the source of hospital identity after login, restore, and refresh. That is safe only if `/auth/me` and every later query use the same database tenant. A stale access token still works until expiry (BE-04). A client cannot switch hospital by sending a different `tenant_id`, which is correct, but a null database tenant still authorizes (BE-01).
6. Required change: keep resolving the tenant from the database user, not from a client header. On every authenticated request, reject a null tenant for hospital roles. If the user’s `tenant_id` changes, old access tokens must fail (BE-04). Keep `GET /auth/me` as the profile contract. Refresh may stay token-only if the frontend continues to call `/auth/me` afterward.
7. Expected contract: see section B.
8. Tests: change `users.tenant_id` after issuing a token. The next hospital request must not keep serving the old hospital’s data under the new row, and the old token must not remain valid if revocation-on-change is the chosen policy. `GET /auth/me` must return the new `tenant_id` and `hospital`.
9. Frontend impact: `AuthContext` adopts the latest `/auth/me` profile, drops the session when `tenant_id` is missing, and clears cached hospital data when `user_id` or `tenant_id` changes. It does not read the JWT to choose a hospital.
10. Status: confirmed from source.

### BE-06 — Invoice payloads use a hardcoded hospital

1. Finding ID: BE-06
2. Severity: P2
3. Location:
   - `Services/opd_service.py`, `build_invoice` (line 695)
   - `Services/ipd_service.py`, the IPD invoice builder (line 1789)
4. Current behavior: both return `"hospital": {"name": "CarePoint Hospital", "address": "", "gstin": ""}` instead of the caller’s tenant or `HospitalSettings`.
5. Why it matters: every hospital’s invoice is labeled CarePoint. Address and GSTIN are empty even when `hospital_settings` has them.
6. Required change: set `hospital` from the authenticated tenant’s `HospitalSettings` (name, address lines, city, state, pincode, phone, email, gstin). Do not accept a hospital object from the client.
7. Expected behavior: tenant A’s invoice `hospital.name` equals tenant A’s settings name, and tenant B’s invoice does not contain tenant A’s name, address, or GSTIN.
8. Tests: two tenants with different settings. `GET` the OPD invoice and the IPD invoice as each tenant. Assert the hospital block matches that tenant only.
9. Frontend impact: the bill screens no longer print a fake Mumbai address or GSTIN. They show the SaffoCare wordmark and the hospital name from the signed-in `/auth/me` profile. They do not display `invoice.hospital` from these payloads, because that object is not tenant-specific. Address, phone, and GSTIN stay off the page until this payload is trustworthy. Billing roles cannot call `GET /admin/settings` (BE-07), so the frontend cannot load the real letterhead itself.
10. Status: confirmed from source.

### BE-07 — Hospital branding is stored, but billing roles cannot read it

1. Finding ID: BE-07
2. Severity: P2
3. Location:
   - `Models/hospital_settings.py`, columns `name`, address, `phone`, `email`, `gstin`, and `tenant_id`
   - `Services/hospital_settings_service.py`, `get_settings_row` filters `HospitalSettings.tenant_id == resolved` and returns 400 when the tenant is missing
   - `Routers/admin_router.py`, `GET /admin/settings` and `PATCH /admin/settings` require `settings:manage`
4. Current behavior: settings are stored per tenant and the service rejects a missing tenant. Only a caller with `settings:manage` can read them. Invoice builders do not use this row (BE-06).
5. Why it matters: OPD billing, IPD billing, and lab print need the hospital’s legal name, address, and GSTIN. Those users should not need permission to edit hospital settings.
6. Required change: expose a read-only hospital profile for any authenticated hospital user, or embed that profile on invoice and lab-report payloads. Keep `PATCH /admin/settings` behind `settings:manage`. The read model must still be limited to the caller’s tenant.
7. Expected behavior: a receptionist or lab technician can render the correct letterhead. They cannot change settings. A user from tenant A cannot read tenant B’s GSTIN.
8. Tests: user with billing permission and without `settings:manage` can fetch the letterhead for their own tenant and receives 404 or 403 for another tenant’s id. `PATCH` still requires `settings:manage`.
9. Frontend impact: the frontend will bind invoice and lab letterheads to that contract after it exists. Until then it shows only `user.hospital.name` from `/auth/me`.
10. Status: confirmed from source. This is a contract gap, not a second hardcoded address in the frontend.

### BE-08 — Uploaded files share one directory; ownership follows the database row

1. Finding ID: BE-08
2. Severity: P2
3. Location: `Services/lab_service.py`, `_resolve_report_path` (lines 172–185). Callers include lab report download and `Services/doctor_lab_test_service.py`, `get_doctor_lab_report_file_by_test_service`.
4. Current behavior: the resolver accepts a stored path only when the resolved file is inside the upload directory. `LabResult` is `TenantScoped`, so a normal select is filtered when a tenant is present. The upload directory itself is not split by tenant. Profile image uploads are separate routes under each role’s `/profile/image`.
5. Why it matters: if BE-02 is active, a file id or stored path can be resolved for another hospital. Even with the filter, a bug that loads `LabResult` by id without the listener would return another hospital’s file from the shared folder.
6. Required change: authorize the file only after the owning report, order, or profile row is loaded for the caller’s tenant. Store objects under a tenant prefix. Apply the same rule to nurse and doctor file routes.
7. Expected behavior: tenant A receives 404 for tenant B’s report file and profile image. A path that escapes the upload root still returns 400.
8. Tests: upload a file as tenant B, then download it as tenant A with the same id. Expect 404. Repeat for doctor lab-report file and nurse lab-report file.
9. Frontend impact: uploads and downloads already send the current Bearer token and discard a response that arrives after logout. They do not send a tenant id. Paths are unchanged.
10. Status: path confinement is confirmed. Cross-tenant download when the ORM filter is active was not executed; it depends on BE-02 and on each route loading a `TenantScoped` row first.

### BE-09 — Hospital provisioning exists on the API and is not what Platform Admin calls

1. Finding ID: BE-09
2. Severity: P2
3. Location: `Routers/tenant_router.py`, `POST /tenants`, permission `hospitals:create`, implemented by `Services/tenant_service.py`, `register_tenant`. The handler uses `include_all_tenants=True` when checking whether the administrator email already exists.
4. Current behavior: an authenticated user with `hospitals:create` can create a tenant, its settings, and an admin user. There is no suspend or reactivate route in this router. The frontend Platform Admin area (`/platform/*`, storage key `saffocare.platform.v1`) is a separate local demo. It does not call `POST /tenants`.
5. Why it matters: creating, suspending, and switching hospitals from the platform UI is not a live integration. A hospital user who is granted `hospitals:create` could also call `POST /tenants` unless that permission is limited to a platform role.
6. Required change: define a platform operator that is not a hospital tenant, restrict `hospitals:create` to that operator, and add explicit suspend and reactivate behavior that sets `tenants.is_active`. Inactive hospitals must fail login and refresh with `Hospital is inactive` (already returned when `tenant_id` is set and the tenant is inactive).
7. Expected behavior: only a platform operator can create or suspend a hospital. A suspended hospital’s users receive 403 on login and refresh. Hospital users cannot list or edit other tenants.
8. Tests: hospital admin token calling `POST /tenants` is 403. Platform operator can create a tenant. After `is_active` is false, that hospital’s login returns 403 with detail `Hospital is inactive`.
9. Frontend impact: do not point the current Platform Admin demo at `POST /tenants` until this role split exists. The hospital UI already clears the session when `/auth/me` or a request returns `Hospital is inactive`.
10. Status: confirmed from source. No live provisioning test was run.

### BE-10 — Login email lookup is global

1. Finding ID: BE-10
2. Severity: P3
3. Location: `Routers/auth.py`, `login` (lines 83–91). The user query uses `include_all_tenants` indirectly only if the listener is active; this query runs before `get_current_user`, so `db.info["tenant_id"]` is unset and BE-02 already leaves the query unfiltered. Email is matched with `func.lower(User.email) == email`.
4. Current behavior: one email identifies one user across the whole database. The same email cannot belong to two hospitals.
5. Why it matters: that is a product rule, not by itself a cross-tenant read of clinical data. It becomes a problem if two hospitals must employ the same email, or if the error response reveals that the email exists in another hospital. The current failure response for a bad password is the generic `Invalid email or password`.
6. Required change: keep the generic login error. If emails must be unique per hospital rather than globally, change the unique constraint and require a hospital code on login. Do not add that field until both sides agree; the frontend login forms do not send a hospital code today.
7. Expected behavior: unchanged until a hospital-code contract is agreed. Failed login stays generic.
8. Tests: duplicate email in two tenants is rejected by the current unique email constraint. Document the chosen rule before changing the frontend.
9. Frontend impact: none until the contract changes. Login pages post email and password only.
10. Status: confirmed from source. Uniqueness is a schema concern; the `User.email` unique constraint was not re-checked in a migration file during this pass. Treat global uniqueness as observed query behavior, and confirm the database constraint separately.

---

## B. Required API contract

Recommendations in the “Proposed” lines are not implemented endpoints. Do not build the frontend against them until the backend ships them.

### Authenticated hospital identity

| | |
|---|---|
| Frontend expects | `tenant_id` as a positive id, and `hospital` as `{id, name, code}` on the login body and on `GET /auth/me`. Missing or null `tenant_id` is not a hospital session. |
| Backend returns today | `_issue_token_pair` and `get_me` return those fields from `User` and `Tenant`. `tenant_id` may be null. `hospital` is null when `user.tenant` is null. |
| Gap | Null is accepted by the API (BE-01). |
| Proposed | Hospital roles always have a non-null `tenant_id` and a hospital object. The server resolves the tenant from the user row. Clients do not send a tenant header or a tenant id. |

### Login and `/auth/me`

| | |
|---|---|
| Frontend expects | `POST /auth/login` with email and password. Response includes `access_token`, `refresh_token`, `token_type`, `role`, `permissions`, `user_id`, `tenant_id`, `hospital`. The frontend then relies on `GET /auth/me` for the profile it stores: `user_id`, `email`, names, `role`, `permissions`, `tenant_id`, `hospital`, `profile_image_url`, `is_active`. |
| Backend returns today | Login returns `_issue_token_pair`. `/auth/me` returns the profile above, including `tenant_id` and `hospital`. |
| Gap | Login succeeds without a tenant. |
| Proposed | Keep the current JSON shape. Reject a hospital login that has no tenant. Keep using `/auth/me` as the profile after login, restore, and refresh. |

### Refresh and logout

| | |
|---|---|
| Frontend expects | `POST /auth/refresh` with `{refresh_token}` returns a new access token and refresh token. The frontend then calls `GET /auth/me` and replaces the profile. `POST /auth/logout` is called with the current Bearer token. Local cleanup runs even if logout fails. 401 refreshes once; a failed refresh ends the session. |
| Backend accepts today | Refresh body is the refresh token only. Response is `access_token`, `refresh_token`, `token_type`. Logout audits and returns a message. Tokens keep working. |
| Gap | BE-04. Refresh JSON has no hospital identity; the frontend covers that by calling `/auth/me`. |
| Proposed | Revoke the refresh token and invalidate outstanding access tokens on logout. Keep the refresh response token-only if `/auth/me` remains mandatory after refresh. |

### Permissions and membership

| | |
|---|---|
| Frontend expects | `permissions` is a string array on login and `/auth/me`. 403 whose detail contains `Permission denied` keeps the user signed in and shows an access-denied state. |
| Backend returns today | `PermissionChecker` loads live role permissions and returns `Permission denied: {name} required`. Role permissions come from the user’s role. |
| Gap | Membership in a tenant is only `users.tenant_id`. There is no separate membership table in the paths inspected. A null tenant still passes the checker when the role permission matches (BE-01). |
| Proposed | Permission checks run only after the caller is an active member of an active tenant. Do not let the client submit a role or a tenant id. |

### Hospital settings and branding

| | |
|---|---|
| Frontend expects | Shell and sidebar show `user.hospital.name` from `/auth/me` under the SaffoCare wordmark. Invoices and lab prints need a legal name, address, phone, and GSTIN that belong to that hospital. |
| Backend returns today | `/auth/me` hospital object is `{id, name, code}` only. `GET /admin/settings` returns the full letterhead but requires `settings:manage`. Invoice `hospital` is the CarePoint placeholder (BE-06). |
| Gap | BE-06 and BE-07. |
| Proposed | Add the letterhead to invoice and lab-report payloads, or add a read-only `GET` that any hospital user can call for their own tenant. Fields: `name`, `address_line1`, `address_line2`, `city`, `state`, `pincode`, `phone`, `email`, `gstin`. No client-supplied tenant id. |

### Patients and clinical records

| | |
|---|---|
| Frontend expects | Existing list and detail URLs, with the Bearer token. Ids in the response can be sent back on update, delete, and nested routes. |
| Backend returns today | Many parent models are `TenantScoped` and are filtered when `db.info["tenant_id"]` is set. Child tables in BE-03 are not. |
| Gap | BE-01, BE-02, BE-03. |
| Proposed | Every id the frontend receives is reachable only by the tenant that owns it. Nested routes check the parent and the child. |

### Billing and invoices

| | |
|---|---|
| Frontend expects | Existing OPD and IPD invoice URLs and the current item, payment, and summary fields. |
| Backend returns today | Those fields, plus `hospital.name = "CarePoint Hospital"`. |
| Gap | BE-06. The frontend does not print that name. |
| Proposed | Replace the hospital block with the authenticated tenant’s settings. Leave the rest of the invoice body as it is unless a field is actually wrong. |

### Files

| | |
|---|---|
| Frontend expects | Multipart field name `file` on the existing profile-image and lab upload URLs. Downloads return the file bytes plus `Content-Disposition`. No JSON content type is sent on those requests. |
| Backend accepts today | Those routes. Downloads resolve a path inside the shared upload directory after loading the report row. |
| Gap | BE-08, and BE-02 when the row load is unfiltered. |
| Proposed | Same URLs and the same `file` field. Authorize by tenant-owned row. 404 for another tenant’s file. |

### Suspension and inactive accounts

| | |
|---|---|
| Frontend expects | 403 detail `Hospital is inactive` ends the session and returns to login. 403 detail `Account is deactivated` or `Account is inactive` does the same. Other 403 responses, including `Permission denied`, do not. |
| Backend returns today | Login, refresh, `get_current_user`, and `PermissionChecker` return those details when `tenant_id` is set and the tenant or user is inactive. They do not return `Hospital is inactive` when `tenant_id` is null. |
| Gap | BE-01. There is no platform suspend API in `tenant_router.py` (BE-09). |
| Proposed | Keep the current detail strings so the frontend policy keeps working. Apply them whenever the user’s tenant is missing or inactive. |

### Platform Admin provisioning

| | |
|---|---|
| Frontend expects | Nothing from `POST /tenants`. `/platform/*` uses its own local store. |
| Backend accepts today | `POST /tenants` with `hospitals:create`. |
| Gap | BE-09. The demo UI and the API are not the same feature. |
| Proposed | A platform role, create/suspend/reactivate endpoints, and a written decision before the frontend replaces the demo. Do not add a hospital switcher to hospital sessions. |

---

## C. Backend security requirements

These are acceptance criteria for the backend. The frontend items are already the browser’s job and are listed only so they are not reassigned.

Backend must:

- Deny login, refresh, and hospital APIs when tenant identity is missing or invalid. Null is not “all tenants.”
- Ensure hospital A cannot read, update, delete, or export hospital B’s patients, visits, admissions, notes, orders, bills, files, or settings.
- Enforce tenant ownership on nested resources, related-object lookups, file operations, and bulk endpoints, including the tables in BE-03.
- Enforce user membership and role permissions on the server. A client role or permission list is not authority.
- Keep `tenant_id` and `hospital` from `GET /auth/me` consistent with the tenant used for later queries in that session.
- Deny inactive tenants and deactivated users with the existing 403 details.
- Revoke refresh tokens on logout and reject access tokens that logout was supposed to end.
- Put the authenticated tenant’s name, address, and GSTIN on invoices, reports, and settings. Remove `CarePoint Hospital`.

Frontend already:

- Drops a session whose `/auth/me` tenant is missing.
- Clears the React Query cache, consultation drafts, and hospital-scoped browser keys when the user or tenant changes, and on logout, idle timeout, and failed refresh.
- Sends logout before deleting the local token.
- Ignores a response that finishes after the session epoch changes, including multipart uploads and file downloads.
- Does not send a tenant header or a tenant id.
- Leaves Platform Admin on `saffocare.platform.v1` and outside hospital route guards.

---

## D. Backend task list

### P0

**BE-01 and BE-02. Close null-tenant access.**  
Evidence: `dependencies.py`, `auth.py` `_hospital_blocked`, `tenant_filter.py`.  
Expected result: a null `tenant_id` cannot call hospital APIs and cannot read other hospitals’ rows.  
Modules: auth and every hospital module.  
Depends on: a decision about whether any platform operator may have a null tenant. That operator must not use hospital routes.  
Test: null-tenant user login fails; a token with no tenant gets an empty or rejected patient list.

### P1

**BE-04. Revoke tokens on logout.**  
Evidence: `logout` only audits.  
Expected result: old access and refresh tokens receive 401.  
Modules: auth.  
Depends on: a revocation store or user token version.  
Test: logout, then `/auth/me` and `/auth/refresh` with the old tokens.

**BE-05. Keep identity on `/auth/me` and invalidate tokens when membership changes.**  
Evidence: access token carries `tenant_id`, but authorization reads the user row; refresh does not return the hospital.  
Expected result: `/auth/me` matches the tenant used for queries; a membership change kills old tokens.  
Modules: auth.  
Depends on: BE-04.  
Test: change `users.tenant_id` and show the old token no longer reads the previous hospital.

**BE-03. Scope child billing, lab, pharmacy, and nurse rows.**  
Evidence: models listed in BE-03.  
Expected result: another tenant’s child id returns 404 on read and write.  
Modules: OPD billing, IPD, pharmacy, lab, nurse.  
Depends on: BE-02 so the parent filter cannot be skipped.  
Test: cross-tenant id for `IpdBill`, `BillItem`, `DispensingItem`, and `LabResultParameter`.

### P2

**BE-06 and BE-07. Tenant letterhead on invoices and a read path for billing users.**  
Evidence: CarePoint literals; `GET /admin/settings` requires `settings:manage`.  
Expected result: invoice `hospital` matches `HospitalSettings` for the caller. Billing users can read it. They cannot edit it.  
Modules: OPD, IPD, admin settings, lab print.  
Depends on: settings rows existing per tenant (seed already creates them in `tenant_service`).  
Test: two tenants, two invoice payloads, no shared GSTIN.

**BE-08. Tenant-owned files.**  
Evidence: shared upload directory and path check in `lab_service.py`.  
Expected result: cross-tenant file download is 404.  
Modules: lab, doctor lab files, nurse lab files, profile images.  
Depends on: BE-02.  
Test: download tenant B’s report file as tenant A.

**BE-09. Platform create and suspend.**  
Evidence: `POST /tenants` only; Platform Admin UI is local.  
Expected result: only a platform role can provision; suspend sets `is_active` and login returns `Hospital is inactive`.  
Modules: tenants, auth.  
Depends on: a platform principal that is not a hospital user.  
Test: hospital admin cannot call `POST /tenants`; suspended hospital cannot log in.

### P3

**BE-10. Confirm the email uniqueness rule.**  
Evidence: login looks up one email globally.  
Expected result: a written rule, either one email system-wide or email plus hospital code.  
Modules: auth.  
Depends on: product decision. Do not change the frontend login body until that decision is implemented.  
Test: document the constraint, then add a migration test only if the rule changes.

**Regression suite.**  
Add the P0–P2 tests to the backend test run. Include one nested route, one bulk or export route, and one file route per clinical module.

---

## What the frontend is not asking the backend to change

- Do not add `X-Tenant` or `X-Hospital-ID`.
- Do not trust `tenant_id` from a request body or query string.
- Do not change existing upload field name `file`, or the current login, refresh, logout, and `/auth/me` paths, except to reject invalid tenants and to revoke tokens.
- Do not expect the Platform Admin demo storage key `saffocare.platform.v1` to become a server session.

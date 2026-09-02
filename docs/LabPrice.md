Backend change required (pick one)
Option A — Recommended: Extend GET /ipd/pricing in HM-System-Backend/Routers/ipd.py

Keep ipd:pricing permission (no new permission).
After get_pricing(db), also load active lab tests via lab_test_catalog_service.list_lab_tests(db, active=True).
Return:
{
  "pricing": { ... },
  "lab_catalog_tests": {
    "total": <count>,
    "tests": [ ... LabTestResponse ... ]
  }
}
Frontend already prefers lab_catalog_tests from this response when present.

Option B — Simpler: Grant lab_catalog:view to the IPD role

In HM-System-Backend/seed.py, add lab_catalog:view under the ipd role permissions.
Re-seed or update role permissions in DB.
Existing GET /lab-catalog will work; no new API shape.
Option C: New read-only route, e.g. GET /ipd/pricing/lab-charges

Permission: ipd:pricing.
Returns the same lab catalog list as Option A, separate from pricing payload.
After backend fix
Restart the backend and refresh IPD Pricing → Lab Charges. You should see all active tests from Admin → Lab catalog, not just the 4 OPD bill items.

If you want Option A, B, or C implemented on the backend, say which one.
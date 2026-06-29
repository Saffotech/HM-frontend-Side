# Frontend architecture

## Feature boundaries

Code under `src/features/<name>/` is isolated by department/module:

| Feature   | Path                    |
|-----------|-------------------------|
| OPD       | `src/features/opd/`     |
| Doctor    | `src/features/doctor/`  |
| Lab       | `src/features/lab/`     |
| Nurse     | `src/features/nurse/`   |
| Pharmacy  | `src/features/pharmacy/`|

### Import rules (enforced by ESLint + `npm run verify:features`)

**Allowed from any feature file:**

- `@/shared/*` — APIs, hooks, components, utils, types, constants
- Same feature only — e.g. `src/features/opd/billing/` may import from `src/features/opd/pages/`

**Never allowed:**

- `src/features/opd/` importing from `src/features/doctor/` (or lab, nurse, pharmacy)
- Any cross-feature import in any direction

**If two features need the same code:** move it to `src/shared/` (correct subfolder), then import from `@/shared/...`.

### Entry points (may import any feature)

- `src/App.jsx`
- `src/pages/**` (public landing, not under `features/`)

## Verify locally

```bash
npm run verify:features   # boundary scan
npm run lint              # includes import/no-restricted-paths zones
npm run build
```
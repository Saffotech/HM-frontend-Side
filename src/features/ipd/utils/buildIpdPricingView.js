/**
 * Transform existing OPD/IPD pricing settings into read-only view models.
 * No invented prices — only maps data that exists in settings + bed inventory.
 */

import { resolveBedRate } from '@/features/ipd/utils/resolveBedRate';

const BUILTIN_WARDS = new Set(['general', 'private', 'icu']);

function builtinTariffField(wardName) {
  const key = String(wardName || '').trim().toLowerCase();
  if (key === 'general') return 'general_ward_charge';
  if (key === 'private') return 'private_ward_charge';
  if (key === 'icu') return 'icu_charge';
  return null;
}

function getWardDailyRate(bedTariff, wardName) {
  if (!bedTariff) return null;
  const field = builtinTariffField(wardName);
  if (field) {
    const n = Number(bedTariff[field]);
    return Number.isFinite(n) ? n : null;
  }
  const wardKey = String(wardName || '').trim().toLowerCase();
  const match = (bedTariff.ward_rates ?? []).find(
    (row) => String(row.ward_name || '').trim().toLowerCase() === wardKey,
  );
  if (match && match.charge_per_day != null && match.charge_per_day !== '') {
    const n = Number(match.charge_per_day);
    return Number.isFinite(n) ? n : null;
  }
  return resolveBedRate(bedTariff, { wardName });
}

export function inferWardType(wardName) {
  const key = String(wardName || '').trim().toLowerCase();
  if (key.includes('double')) {
    if (key.includes('general')) return 'General';
    if (key.includes('icu')) return 'ICU';
    if (key.includes('private')) return 'Private';
    if (key.includes('maternity')) return 'Maternity';
    if (key.includes('pediatric')) return 'Pediatric';
    return 'Double Bed';
  }
  if (key === 'general' || key === 'general ward' || key.includes('general')) return 'General';
  if (key.includes('icu') || key.includes('critical')) return 'ICU';
  if (key === 'private' || key === 'private room' || key.includes('private')) return 'Private';
  if (key.includes('maternity')) return 'Maternity';
  if (key.includes('pediatric') || key.includes('neonatal') || key.includes('nicu')) {
    return 'Pediatric';
  }
  if (key.includes('hdu')) return 'HDU';
  if (key.includes('single')) return 'Single Bed';
  return 'Ward';
}

/** Single vs double bed — used for ward tariff filter. */
export function inferBedCategory(wardName, wardType) {
  const key = String(wardName || '').trim().toLowerCase();
  const type = String(wardType || '').trim().toLowerCase();
  if (key.includes('double') || type.includes('double bed')) return 'double';
  return 'single';
}

/** Merge alias ward names (General / General Ward, Private / Private Room). */
export function canonicalWardKey(wardName) {
  const key = String(wardName || '').trim().toLowerCase();
  if (key.includes('double')) {
    if (key.includes('general')) return 'general-double-bed';
    if (key.includes('icu')) return 'icu-double-bed';
    if (key.includes('private')) return 'private-double-bed';
    if (key.includes('maternity')) return 'maternity-double-bed';
    if (key.includes('pediatric')) return 'pediatric-double-bed';
    return key.replace(/\s+/g, '-');
  }
  if (key === 'general' || key === 'general ward') return 'general';
  if (key === 'private' || key === 'private room') return 'private';
  if (key === 'icu') return 'icu';
  const field = builtinTariffField(wardName);
  if (field === 'general_ward_charge') return 'general';
  if (field === 'private_ward_charge') return 'private';
  if (field === 'icu_charge') return 'icu';
  return key.replace(/\s+/g, '-');
}

function enrichWardRow(row) {
  const type = row.type ?? inferWardType(row.name);
  return {
    ...row,
    type,
    bedCategory: row.bedCategory ?? inferBedCategory(row.name, type),
  };
}

/** One row per tariff — drops General/General Ward and Private/Private Room duplicates. */
export function dedupeWardPricingRows(rows = []) {
  const byCanonical = new Map();

  for (const raw of rows) {
    const row = enrichWardRow(raw);
    if (row.kind === 'special') {
      byCanonical.set(`special:${row.id}`, row);
      continue;
    }
    const canonical = canonicalWardKey(row.name);
    const existing = byCanonical.get(canonical);
    if (!existing || String(row.name).length < String(existing.name).length) {
      byCanonical.set(canonical, row);
    }
  }

  return [...byCanonical.values()].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true }),
  );
}

export function filterWardRowsByBedCategory(rows, bedCategory) {
  if (!bedCategory || bedCategory === 'all') return rows;
  return rows.filter((row) => row.bedCategory === bedCategory);
}

function activeBillItems(pricing) {
  return (pricing?.bill_items ?? []).filter(
    (item) => item?.is_active !== false && String(item?.name || '').trim(),
  );
}

const DIAG_PATTERN =
  /x-?ray|blood\s*test|urine|ecg|laboratory|lab\b|scan|imaging|radiology|pathology|cbc|diagnostic/i;

const PHARMACY_PATTERN = /medicine|pharmacy|drug|consumable|syringe|tablet|capsule/i;

function matchesSearch(row, search, fields) {
  if (!search) return true;
  const q = search.trim().toLowerCase();
  if (!q) return true;
  return fields.some((f) => String(f ?? '').toLowerCase().includes(q));
}

/** Ward + special bed tariff rows from inventory + bed_tariff. */
export function buildWardPricingRows(bedTariff, wardNames = [], specialBedRates = []) {
  const rows = [];
  const seenWards = new Set();

  for (const wardName of wardNames) {
    const name = String(wardName || '').trim();
    if (!name) continue;
    const canonical = canonicalWardKey(name);
    if (seenWards.has(canonical)) continue;
    seenWards.add(canonical);

    const rate = getWardDailyRate(bedTariff, name);
    if (rate == null) continue;

    const isBuiltin = ['general', 'private', 'icu'].includes(canonical);
    const type = inferWardType(name);
    rows.push(enrichWardRow({
      id: `ward-${canonicalWardKey(name)}`,
      name,
      type,
      rate,
      basis: 'Per day',
      status: 'Active',
      kind: isBuiltin ? 'builtin' : 'ward',
    }));
  }

  for (const row of specialBedRates) {
    const bedNo = String(row.bed_number || '').trim();
    if (!bedNo) continue;
    const ward = String(row.ward_name || '').trim();
    const rate = Number(row.charge_per_day);
    if (!Number.isFinite(rate)) continue;
    rows.push(enrichWardRow({
      id: `bed-${bedNo.toLowerCase()}`,
      name: ward ? `${ward} — Bed ${bedNo}` : `Bed ${bedNo}`,
      type: 'Special Bed',
      rate,
      basis: 'Per day (override)',
      status: 'Active',
      kind: 'special',
    }));
  }

  return rows.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
}

/** OPD consultation fee reference grouped by department. */
export function buildDoctorPricingSections(pricing) {
  if (!pricing) return [];

  const deptFees = pricing.department_consultation_fees ?? [];
  const doctorFees = pricing.doctor_consultation_fees ?? [];
  const sections = new Map();

  for (const dept of deptFees) {
    const id = dept.department_id ?? dept.department_name;
    sections.set(String(id), {
      id: String(id),
      department: dept.department_name || 'Department',
      departmentFee: Number(dept.fee),
      doctors: [],
    });
  }

  for (const doc of doctorFees) {
    const id = doc.department_id ?? doc.department_name ?? 'other';
    const key = String(id);
    if (!sections.has(key)) {
      sections.set(key, {
        id: key,
        department: doc.department_name || 'Other',
        departmentFee: null,
        doctors: [],
      });
    }
    sections.get(key).doctors.push({
      id: String(doc.doctor_id),
      name: doc.doctor_name || `Doctor #${doc.doctor_id}`,
      visitType: 'Consultation',
      rate: Number(doc.fee),
    });
  }

  return [...sections.values()]
    .map((section) => ({
      ...section,
      doctors: section.doctors.sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.department.localeCompare(b.department));
}

/** Include every hospital department; attach fees where configured in OPD settings. */
export function mergeDoctorPricingWithHospitalDepartments(sections = [], departments = []) {
  if (!departments.length) return sections;

  const byDeptId = new Map(sections.map((section) => [String(section.id), section]));
  const hospitalIds = new Set(departments.map((dept) => String(dept.id)));

  const merged = departments.map((dept) => {
    const id = String(dept.id);
    const existing = byDeptId.get(id);
    if (existing) {
      return { ...existing, department: dept.name || existing.department };
    }
    return {
      id,
      department: dept.name || 'Department',
      departmentFee: null,
      doctors: [],
    };
  });

  for (const section of sections) {
    if (!hospitalIds.has(String(section.id))) {
      merged.push(section);
    }
  }

  return merged.sort((a, b) => a.department.localeCompare(b.department));
}

export function buildBillItemRows(pricing, kind) {
  const items = activeBillItems(pricing);
  return items
    .filter((item) => {
      const name = String(item.name || '');
      const isDiag = DIAG_PATTERN.test(name);
      const isPharm = PHARMACY_PATTERN.test(name);
      if (kind === 'diagnostics') return isDiag;
      if (kind === 'pharmacy') return isPharm;
      if (kind === 'procedures') return !isDiag && !isPharm;
      return true;
    })
    .map((item) => ({
      id: item.id || item.name,
      name: String(item.name).trim(),
      category: kind === 'diagnostics' ? 'Diagnostic' : 'Service',
      price: Number(item.price) || 0,
      status: item.is_active === false ? 'Inactive' : 'Active',
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function buildOtherChargeRows(pricing) {
  if (!pricing) return [];
  const rows = [];
  const reg = Number(pricing.registration_fee);
  if (Number.isFinite(reg) && reg > 0) {
    rows.push({
      id: 'registration',
      charge: 'Registration',
      description: 'Patient registration fee (OPD reference)',
      amount: reg,
      status: 'Active',
    });
  }
  const consult = Number(pricing.consultation_fee);
  if (
    Number.isFinite(consult)
    && consult > 0
    && !(pricing.department_consultation_fees?.length)
    && !(pricing.doctor_consultation_fees?.length)
  ) {
    rows.push({
      id: 'consult-default',
      charge: 'Default consultation',
      description: 'Hospital default consultation fee',
      amount: consult,
      status: 'Active',
    });
  }
  return rows;
}

/** Standard IPD stay lengths shown as room packages (daily rate × days). */
export const STAY_PACKAGE_DURATIONS = [2, 3, 5, 10];

/**
 * Build room-stay packages from ward daily rates (e.g. Double Bed — 10 Day Package).
 * Excludes per-bed overrides — only ward-level tariffs.
 */
export function buildStayPackageRows(wardRows, durations = STAY_PACKAGE_DURATIONS) {
  const wards = (wardRows ?? []).filter(
    (w) => w.kind !== 'special' && Number.isFinite(Number(w.rate)) && Number(w.rate) > 0,
  );

  const rows = [];
  for (const ward of wards) {
    const dailyRate = Number(ward.rate);
    for (const days of durations) {
      const durationLabel = `${days} day${days === 1 ? '' : 's'}`;
      rows.push({
        id: `pkg-${ward.id}-${days}d`,
        name: `${ward.name} — ${durationLabel} Package`,
        category: ward.type,
        wardName: ward.name,
        dailyRate,
        stayDays: days,
        duration: durationLabel,
        price: dailyRate * days,
        status: ward.status ?? 'Active',
        bedCategory: ward.bedCategory ?? inferBedCategory(ward.name, ward.type),
      });
    }
  }

  return rows.sort((a, b) => {
    const byWard = a.wardName.localeCompare(b.wardName, undefined, { numeric: true });
    if (byWard !== 0) return byWard;
    return a.stayDays - b.stayDays;
  });
}

/** Group flat stay packages into one row per ward for matrix display. */
export function groupStayPackagesByWard(
  packageRows,
  durations = STAY_PACKAGE_DURATIONS,
) {
  const groups = new Map();

  for (const row of packageRows ?? []) {
    const key = row.wardName || row.name;
    if (!groups.has(key)) {
      groups.set(key, {
        id: `ward-pkg-${String(key).toLowerCase().replace(/\s+/g, '-')}`,
        wardName: row.wardName,
        category: row.category,
        dailyRate: row.dailyRate,
        status: row.status ?? 'Active',
        packagesByDays: Object.fromEntries(durations.map((d) => [d, null])),
      });
    }
    if (row.stayDays != null) {
      groups.get(key).packagesByDays[row.stayDays] = row;
    }
  }

  return [...groups.values()].sort((a, b) =>
    a.wardName.localeCompare(b.wardName, undefined, { numeric: true }),
  );
}

export function filterWardRows(rows, search) {
  return rows.filter((r) =>
    matchesSearch(r, search, [r.name, r.type, r.basis, String(r.rate)]),
  );
}

export function filterDoctorSections(sections, search) {
  if (!search?.trim()) return sections;
  const q = search.trim().toLowerCase();
  return sections
    .map((section) => {
      const deptMatch = section.department.toLowerCase().includes(q);
      const doctors = section.doctors.filter((d) =>
        [d.name, d.visitType, String(d.rate)].some((f) =>
          String(f).toLowerCase().includes(q),
        ),
      );
      if (deptMatch) return section;
      if (doctors.length) return { ...section, doctors };
      return null;
    })
    .filter(Boolean);
}

export function filterSimpleRows(rows, search, fields) {
  return rows.filter((r) => matchesSearch(r, search, fields.map((f) => r[f])));
}

export function collectWardNames(wardStats, beds = []) {
  const fromStats = (wardStats?.wards ?? []).map((w) => w.ward_name);
  const fromBeds = beds.map((b) => b.ward_name);
  return [...new Set([...fromStats, ...fromBeds].map((n) => String(n || '').trim()).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b, undefined, { numeric: true }),
  );
}

const BUILTIN_PRICING_WARDS = [
  { name: 'General', field: 'general_ward_charge' },
  { name: 'Private', field: 'private_ward_charge' },
  { name: 'ICU', field: 'icu_charge' },
];

/** Inventory wards plus every ward with a configured bed tariff (incl. Double Bed in ward_rates). */
export function collectPricingWardNames(wardStats, beds = [], bedTariff = null) {
  const inventory = collectWardNames(wardStats, beds);
  const seen = new Set(inventory.map((n) => n.toLowerCase()));
  const names = [...inventory];

  if (!bedTariff) return names;

  for (const { name, field } of BUILTIN_PRICING_WARDS) {
    const charge = Number(bedTariff[field]);
    if (!Number.isFinite(charge) || charge <= 0) continue;
    const covered = names.some((existing) => builtinTariffField(existing) === field);
    if (!covered && !seen.has(name.toLowerCase())) {
      names.push(name);
      seen.add(name.toLowerCase());
    }
  }

  for (const row of bedTariff.ward_rates ?? []) {
    const name = String(row.ward_name || '').trim();
    const charge = Number(row.charge_per_day);
    if (!name || !Number.isFinite(charge) || charge <= 0) continue;
    const key = name.toLowerCase();
    // Legacy generic label — prefer ward-specific double bed names.
    if (key === 'double bed') continue;
    if (seen.has(key)) continue;
    names.push(name);
    seen.add(key);
  }

  return names.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

/** @deprecated Use dedupeWardPricingRows — kept for compatibility. */
export function mergeWardPricingRows(primaryRows = [], supplementalRows = []) {
  return dedupeWardPricingRows([...primaryRows, ...supplementalRows]);
}

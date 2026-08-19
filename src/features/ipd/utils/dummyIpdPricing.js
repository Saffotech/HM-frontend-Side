/**
 * Sample IPD pricing data for UI preview.
 * Mirrors project defaults (bed tariff, QUICK_BILL_ITEMS, consultation fees).
 * Replace with live API data when hospital settings are connected.
 */

import { QUICK_BILL_ITEMS } from '@/shared/constants/billing';
import { buildStayPackageRows } from '@/features/ipd/utils/buildIpdPricingView';

/** Full pricing object compatible with buildIpdPricingView helpers. */
export function getDummyPricingSettings() {
  return {
    gst_percent: 5,
    registration_fee: 200,
    consultation_fee: 500,
    allow_manual_price_entry: true,
    bed_tariff: {
      general_ward_charge: 500,
      private_ward_charge: 2000,
      icu_charge: 5000,
      ward_rates: [
        { ward_name: 'Maternity', charge_per_day: 1500 },
        { ward_name: 'Pediatric', charge_per_day: 1200 },
        { ward_name: 'General Double Bed', charge_per_day: 900 },
        { ward_name: 'Private Double Bed', charge_per_day: 3500 },
        { ward_name: 'ICU Double Bed', charge_per_day: 7500 },
        { ward_name: 'Maternity Double Bed', charge_per_day: 2500 },
        { ward_name: 'Pediatric Double Bed', charge_per_day: 2000 },
      ],
      special_bed_rates: [
        { bed_number: '204', ward_name: 'Ward A', charge_per_day: 1800 },
        { bed_number: 'ICU-02', ward_name: 'ICU', charge_per_day: 6500 },
      ],
    },
    department_consultation_fees: [
      { department_id: 1, department_name: 'General Medicine', fee: 500 },
      { department_id: 2, department_name: 'Cardiology', fee: 800 },
      { department_id: 3, department_name: 'Orthopedics', fee: 700 },
    ],
    doctor_consultation_fees: [
      {
        doctor_id: 101,
        doctor_name: 'Dr. Meera Iyer',
        department_id: 1,
        department_name: 'General Medicine',
        fee: 600,
      },
      {
        doctor_id: 102,
        doctor_name: 'Dr. Rajesh Kumar',
        department_id: 1,
        department_name: 'General Medicine',
        fee: 550,
      },
      {
        doctor_id: 201,
        doctor_name: 'Dr. Anita Desai',
        department_id: 2,
        department_name: 'Cardiology',
        fee: 900,
      },
    ],
    bill_items: [
      ...QUICK_BILL_ITEMS.filter((item) => item.name !== 'Medicines').map((item, i) => ({
        id: `dummy-bill-${i}`,
        name: item.name,
        price: item.price,
        is_active: true,
      })),
      { id: 'dummy-bill-cbc', name: 'CBC Panel', price: 450, is_active: true },
      { id: 'dummy-bill-usg', name: 'Ultrasound Scan', price: 1200, is_active: true },
      { id: 'dummy-bill-dress', name: 'Wound Dressing', price: 250, is_active: true },
      { id: 'dummy-bill-iv', name: 'IV Fluid Setup', price: 350, is_active: true },
    ],
  };
}

/** Pre-built ward rows when bed inventory API also unavailable. */
export const DUMMY_WARD_ROWS = [
  {
    id: 'ward-general',
    name: 'General',
    type: 'General',
    bedCategory: 'single',
    rate: 500,
    basis: 'Per day',
    status: 'Active',
    kind: 'builtin',
  },
  {
    id: 'ward-private',
    name: 'Private',
    type: 'Private',
    bedCategory: 'single',
    rate: 2000,
    basis: 'Per day',
    status: 'Active',
    kind: 'builtin',
  },
  {
    id: 'ward-icu',
    name: 'ICU',
    type: 'ICU',
    bedCategory: 'single',
    rate: 5000,
    basis: 'Per day',
    status: 'Active',
    kind: 'builtin',
  },
  {
    id: 'ward-maternity',
    name: 'Maternity',
    type: 'Maternity',
    bedCategory: 'single',
    rate: 1500,
    basis: 'Per day',
    status: 'Active',
    kind: 'ward',
  },
  {
    id: 'ward-pediatric',
    name: 'Pediatric',
    type: 'Pediatric',
    bedCategory: 'single',
    rate: 1200,
    basis: 'Per day',
    status: 'Active',
    kind: 'ward',
  },
  {
    id: 'ward-general-double',
    name: 'General Double Bed',
    type: 'General',
    bedCategory: 'double',
    rate: 900,
    basis: 'Per day',
    status: 'Active',
    kind: 'ward',
  },
  {
    id: 'ward-private-double',
    name: 'Private Double Bed',
    type: 'Private',
    bedCategory: 'double',
    rate: 3500,
    basis: 'Per day',
    status: 'Active',
    kind: 'ward',
  },
  {
    id: 'ward-icu-double',
    name: 'ICU Double Bed',
    type: 'ICU',
    bedCategory: 'double',
    rate: 7500,
    basis: 'Per day',
    status: 'Active',
    kind: 'ward',
  },
  {
    id: 'ward-maternity-double',
    name: 'Maternity Double Bed',
    type: 'Maternity',
    bedCategory: 'double',
    rate: 2500,
    basis: 'Per day',
    status: 'Active',
    kind: 'ward',
  },
  {
    id: 'ward-pediatric-double',
    name: 'Pediatric Double Bed',
    type: 'Pediatric',
    bedCategory: 'double',
    rate: 2000,
    basis: 'Per day',
    status: 'Active',
    kind: 'ward',
  },
];

/** Room stay packages (2 / 3 / 5 / 10 days) derived from ward daily rates. */
export const DUMMY_PACKAGE_ROWS = buildStayPackageRows(
  DUMMY_WARD_ROWS.filter((row) => row.kind !== 'special'),
);

export const DUMMY_WARD_NAMES = [
  'General',
  'Private',
  'ICU',
  'Maternity',
  'Pediatric',
  'General Double Bed',
  'Private Double Bed',
  'ICU Double Bed',
  'Maternity Double Bed',
  'Pediatric Double Bed',
  'Ward A',
];

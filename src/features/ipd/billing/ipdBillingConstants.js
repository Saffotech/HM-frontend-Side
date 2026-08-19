/**
 * Canonical IPD billing constants — shared across self-pay and insurance flows.
 */

/** Origin of a billing line (hospital module or manual entry). */
export const BILLING_SOURCE = {
  ROOM: 'room',
  DOCTOR: 'doctor',
  PHARMACY: 'pharmacy',
  LABORATORY: 'laboratory',
  PROCEDURE: 'procedure',
  MANUAL: 'manual',
};

export const BILLING_SOURCE_LIST = Object.values(BILLING_SOURCE);

/** Lifecycle of a billing transaction row. */
export const BILLING_STATUS = {
  ACTIVE: 'active',
  VOID: 'void',
  DRAFT: 'draft',
};

/** Summary category aligned with hospital charge heads / final billing. */
export const BILLING_CATEGORY = {
  ROOM: 'room',
  DOCTOR: 'doctor',
  LABORATORY: 'laboratory',
  PHARMACY: 'pharmacy',
  PROCEDURE: 'procedure',
  MISCELLANEOUS: 'miscellaneous',
  DISCOUNT: 'discount',
  CUSTOM: 'custom',
};

/** Maps insurance daily-charge `head` text to billing source. */
export function resolveBillingSourceFromHead(head) {
  const value = String(head ?? '').trim().toLowerCase();
  if (value.includes('room') || value.includes('bed') || value.includes('ward')) {
    return BILLING_SOURCE.ROOM;
  }
  if (value.includes('doctor') || value.includes('visit') || value.includes('consult')) {
    return BILLING_SOURCE.DOCTOR;
  }
  if (value.includes('pharmacy') || value.includes('medicine')) {
    return BILLING_SOURCE.PHARMACY;
  }
  if (value.includes('lab') || value.includes('test')) {
    return BILLING_SOURCE.LABORATORY;
  }
  if (value.includes('treatment') || value.includes('procedure') || value.includes('nursing')) {
    return BILLING_SOURCE.PROCEDURE;
  }
  return BILLING_SOURCE.MANUAL;
}

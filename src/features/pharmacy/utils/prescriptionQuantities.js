/**
 * Resolve item quantities — backend fields take priority over client calculation.
 */

import { computePrescribedQuantity } from '@/features/pharmacy/utils/prescriptionQuantity';

export function hasBackendQuantityFields(item) {
  return item?.quantity_prescribed != null;
}

export function resolveItemQuantities(item) {
  if (hasBackendQuantityFields(item)) {
    const quantity_prescribed = Number(item.quantity_prescribed) || 0;
    const quantity_dispensed = Number(item.quantity_dispensed) || 0;
    const quantity_remaining =
      item.quantity_remaining != null
        ? Number(item.quantity_remaining) || 0
        : Math.max(0, quantity_prescribed - quantity_dispensed);
    return { quantity_prescribed, quantity_dispensed, quantity_remaining };
  }

  const quantity_prescribed = computePrescribedQuantity(item);
  return {
    quantity_prescribed,
    quantity_dispensed: 0,
    quantity_remaining: quantity_prescribed,
  };
}

export function getQuantityPrescribed(item) {
  return resolveItemQuantities(item).quantity_prescribed;
}

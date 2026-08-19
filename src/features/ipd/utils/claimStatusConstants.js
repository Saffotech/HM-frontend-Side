/** IPD Insurance Claim — status values, labels, and transition rules. */

export const CLAIM_STATUS = {
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  PARTIALLY_APPROVED: 'partially_approved',
  REJECTED: 'rejected',
  CLOSED: 'closed',
};

export const CLAIM_STATUS_LABELS = {
  [CLAIM_STATUS.SUBMITTED]: 'Submitted',
  [CLAIM_STATUS.APPROVED]: 'Approved',
  [CLAIM_STATUS.PARTIALLY_APPROVED]: 'Partially Approved',
  [CLAIM_STATUS.REJECTED]: 'Rejected',
  [CLAIM_STATUS.CLOSED]: 'Closed',
};

/** Manual transitions allowed from each status. */
export const ALLOWED_CLAIM_TRANSITIONS = {
  [CLAIM_STATUS.SUBMITTED]: [
    CLAIM_STATUS.APPROVED,
    CLAIM_STATUS.PARTIALLY_APPROVED,
    CLAIM_STATUS.REJECTED,
  ],
  [CLAIM_STATUS.APPROVED]: [CLAIM_STATUS.CLOSED],
  [CLAIM_STATUS.PARTIALLY_APPROVED]: [CLAIM_STATUS.CLOSED],
  [CLAIM_STATUS.REJECTED]: [CLAIM_STATUS.CLOSED],
  [CLAIM_STATUS.CLOSED]: [],
};

export function getClaimStatusLabel(status) {
  return CLAIM_STATUS_LABELS[status] ?? status ?? '—';
}

export function canTransitionClaimStatus(fromStatus, toStatus) {
  const allowed = ALLOWED_CLAIM_TRANSITIONS[fromStatus] ?? [];
  return allowed.includes(toStatus);
}

export function claimStatusChipClass(status) {
  if (status === CLAIM_STATUS.APPROVED || status === CLAIM_STATUS.CLOSED) {
    return 'ipd-ins-chip--active';
  }
  if (status === CLAIM_STATUS.REJECTED) return 'ipd-ins-chip--pending';
  return 'ipd-ins-chip--warn';
}

export function validateApproveTransition(claimedAmount, approvedAmount) {
  const claimed = Number(claimedAmount);
  const approved = Number(approvedAmount);
  if (Number.isNaN(claimed) || claimed <= 0) {
    return 'Enter a valid claimed amount before approving.';
  }
  if (Number.isNaN(approved) || approved <= 0) {
    return 'Enter a valid approved amount.';
  }
  if (approved !== claimed) {
    return 'For full approval, approved amount must equal claimed amount.';
  }
  return null;
}

export function validatePartiallyApprovedTransition(
  claimedAmount,
  approvedAmount,
  changeReason,
) {
  const claimed = Number(claimedAmount);
  const approved = Number(approvedAmount);
  if (Number.isNaN(claimed) || claimed <= 0) {
    return 'Enter a valid claimed amount.';
  }
  if (Number.isNaN(approved) || approved <= 0) {
    return 'Enter a valid approved amount.';
  }
  if (approved >= claimed) {
    return 'Partial approval requires approved amount less than claimed amount.';
  }
  if (!String(changeReason ?? '').trim()) {
    return 'Reason is required for partial approval.';
  }
  return null;
}

export function validateRejectTransition(changeReason) {
  if (!String(changeReason ?? '').trim()) {
    return 'Rejection reason is required.';
  }
  return null;
}

export function validateUpdateApprovedAmount(claimedAmount, approvedAmount, changeReason) {
  const claimed = Number(claimedAmount);
  const approved = Number(approvedAmount);
  if (Number.isNaN(claimed) || claimed <= 0) {
    return 'Enter a valid claimed amount.';
  }
  if (Number.isNaN(approved) || approved <= 0) {
    return 'Enter a valid approved amount.';
  }
  if (approved > claimed) {
    return 'Approved amount cannot exceed claimed amount.';
  }
  if (approved < claimed && !String(changeReason ?? '').trim()) {
    return 'Reason is required when approved amount is less than claimed amount.';
  }
  return null;
}

export function validateAddApprovedAmount(
  claimedAmount,
  currentApprovedAmount,
  additionalAmount,
  changeReason,
) {
  const claimed = Number(claimedAmount);
  const currentApproved = Number(currentApprovedAmount) || 0;
  const additional = Number(additionalAmount);

  if (Number.isNaN(claimed) || claimed <= 0) {
    return 'Enter a valid claimed amount.';
  }
  if (Number.isNaN(additional) || additional <= 0) {
    return 'Enter a valid amount to add.';
  }

  const nextApproved = currentApproved + additional;
  return validateUpdateApprovedAmount(claimed, nextApproved, changeReason);
}

/** Derive claim status from approved vs claimed after an amount update. */
export function resolveStatusFromApprovedAmount(claimedAmount, approvedAmount) {
  const claimed = Number(claimedAmount);
  const approved = Number(approvedAmount);
  if (approved >= claimed) return CLAIM_STATUS.APPROVED;
  return CLAIM_STATUS.PARTIALLY_APPROVED;
}

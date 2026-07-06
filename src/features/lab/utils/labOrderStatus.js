/** Lab test request lifecycle — backend status values */

export const LAB_ORDER_STATUS = {
  ORDERED: 'ordered',
  SAMPLE_COLLECTED: 'sample_collected',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

/** Human-readable stage info shown in UI */
export const LAB_STATUS_META = {
  ordered: {
    label: 'Waiting',
    shortLabel: 'Ordered',
    description: 'Doctor ordered the test. Sample not collected yet.',
    nextStep: 'Collect sample, then save report details.',
    badgeClass: 'pending',
    isOpen: true,
  },
  sample_collected: {
    label: 'Sample Collected',
    shortLabel: 'Sample Collected',
    description: 'Sample collected — ready for processing.',
    nextStep: 'Mark processing and enter report parameters.',
    badgeClass: 'in-progress',
    isOpen: true,
  },
  processing: {
    label: 'Processing',
    shortLabel: 'Processing',
    description: 'Test is running. Report not finalized yet.',
    nextStep: 'Save report and complete the test.',
    badgeClass: 'in-progress',
    isOpen: true,
  },
  completed: {
    label: 'Completed',
    shortLabel: 'Completed',
    description: 'Test completed. View in report archive.',
    nextStep: 'View in Completed Reports archive.',
    badgeClass: 'completed',
    isOpen: false,
  },
  cancelled: {
    label: 'Cancelled',
    shortLabel: 'Cancelled',
    description: 'Order was cancelled by the doctor.',
    nextStep: 'No action required.',
    badgeClass: 'cancelled',
    isOpen: false,
  },
};

export function isOpenStatus(status) {
  return (
    status === LAB_ORDER_STATUS.ORDERED ||
    status === LAB_ORDER_STATUS.SAMPLE_COLLECTED ||
    status === LAB_ORDER_STATUS.PROCESSING
  );
}

export function statusLabel(status) {
  return LAB_STATUS_META[status]?.shortLabel ?? status;
}

/** Map dashboard / URL view keys to a single backend status filter (undefined = all). */
export function viewToApiStatus(view) {
  switch (view) {
    case 'ordered':
    case 'pending':
      return LAB_ORDER_STATUS.ORDERED;
    case 'sample_collected':
      return LAB_ORDER_STATUS.SAMPLE_COLLECTED;
    case 'processing':
    case 'in_progress':
      return LAB_ORDER_STATUS.PROCESSING;
    case 'completed':
      return LAB_ORDER_STATUS.COMPLETED;
    case 'cancelled':
      return LAB_ORDER_STATUS.CANCELLED;
    default:
      return undefined;
  }
}

/** Action button on orders table */
export function uploadActionLabel(status) {
  if (status === LAB_ORDER_STATUS.COMPLETED) return 'View Report';
  if (status === LAB_ORDER_STATUS.PROCESSING) return 'Complete Report';
  if (status === LAB_ORDER_STATUS.SAMPLE_COLLECTED) return 'Continue';
  return 'Start / Upload';
}

export function uploadActionVariant(status) {
  return status === LAB_ORDER_STATUS.COMPLETED ? 'secondary' : 'primary';
}

/** Badge class for CSS — maps backend status to existing lab.css classes */
export function statusBadgeClass(status) {
  const meta = LAB_STATUS_META[status];
  return meta?.badgeClass ?? status?.replace(/_/g, '-');
}

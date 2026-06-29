/** Lab test request lifecycle — single source of truth for status meaning */

export const LAB_ORDER_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
};

/** Human-readable stage info shown in UI */
export const LAB_STATUS_META = {
  pending: {
    label: 'Waiting',
    shortLabel: 'Pending',
    description: 'Doctor ordered the test. Lab has not started yet.',
    nextStep: 'Collect sample or open upload form and save as In Progress.',
    badgeClass: 'pending',
    isOpen: true,
  },
  in_progress: {
    label: 'In Progress',
    shortLabel: 'In Progress',
    description: 'Sample collected or test is running. Report not uploaded yet.',
    nextStep: 'Finish the test and upload the report as Completed.',
    badgeClass: 'in-progress',
    isOpen: true,
  },
  completed: {
    label: 'Completed',
    shortLabel: 'Completed',
    description: 'Report uploaded. Test leaves the open worklist.',
    nextStep: 'View in Completed Reports archive.',
    badgeClass: 'completed',
    isOpen: false,
  },
};

export function isOpenStatus(status) {
  return status === LAB_ORDER_STATUS.PENDING || status === LAB_ORDER_STATUS.IN_PROGRESS;
}

export function statusLabel(status) {
  return LAB_STATUS_META[status]?.shortLabel ?? status;
}

/** Dashboard / list views */
export function filterOrdersByView(orders, view) {
  switch (view) {
    case 'open':
      return orders.filter((o) => isOpenStatus(o.status));
    case 'pending':
      return orders.filter((o) => o.status === LAB_ORDER_STATUS.PENDING);
    case 'in_progress':
      return orders.filter((o) => o.status === LAB_ORDER_STATUS.IN_PROGRESS);
    case 'completed':
      return orders.filter((o) => o.status === LAB_ORDER_STATUS.COMPLETED);
    default:
      return orders;
  }
}

export function countByStatus(orders) {
  return orders.reduce(
    (acc, o) => {
      acc[o.status] = (acc[o.status] ?? 0) + 1;
      acc.all += 1;
      if (isOpenStatus(o.status)) acc.open += 1;
      return acc;
    },
    { all: 0, open: 0, pending: 0, in_progress: 0, completed: 0 }
  );
}

/** Action button on orders table — depends on current status */
export function uploadActionLabel(status) {
  if (status === LAB_ORDER_STATUS.PENDING) return 'Start / Upload';
  if (status === LAB_ORDER_STATUS.IN_PROGRESS) return 'Continue Upload';
  return 'View Report';
}

export function uploadActionVariant(status) {
  return status === LAB_ORDER_STATUS.COMPLETED ? 'secondary' : 'primary';
}

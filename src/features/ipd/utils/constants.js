/** IPD UI constants — no backend coupling. */

export const IPD_ADMISSION_STATUS = {
  ADMITTED: 'admitted',
  DISCHARGED: 'discharged',
};

export const IPD_ADMISSION_STATUS_LABELS = {
  admitted: 'Admitted',
  discharged: 'Discharged',
};

export const IPD_DISCHARGE_STEPS = [
  { id: 'review_stay', label: 'Review Stay' },
  { id: 'review_charges', label: 'Review Charges' },
  { id: 'payment', label: 'Payment' },
  { id: 'confirmation', label: 'Confirmation' },
];

export const IPD_PAGE_SIZE = 20;

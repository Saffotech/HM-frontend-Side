/**
 * Display-only claim amount helpers for the claim-detail form.
 * Authoritative totals must come from the billing/claim API when available.
 */

export function recalculateClaimFinancials(claim, patch = {}) {
  const claimed = Number(patch.claimed ?? claim?.claimed ?? 0);
  const approved = Number(patch.approved ?? claim?.approved ?? 0);
  const netBill = Number(claim?.netBill ?? 0);
  const lines = patch.responsibilityLines ?? claim?.responsibilityLines ?? [];
  const insReceived = Number(claim?.insReceived ?? 0);
  const patientPaid = Number(claim?.patientPaid ?? 0);

  const notApproved = Math.max(0, claimed - approved);
  const patientResponsibility =
    lines.length > 0
      ? lines.reduce((sum, line) => sum + Number(line.amount || 0), 0)
      : Math.max(0, netBill - approved);
  const insOutstanding = Math.max(0, approved - insReceived);
  const patientOutstanding = Math.max(0, patientResponsibility - patientPaid);

  return {
    claimed,
    approved,
    notApproved,
    patientResponsibility,
    insOutstanding,
    patientOutstanding,
  };
}

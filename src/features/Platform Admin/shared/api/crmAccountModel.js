const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** GET /crm/account/profile. Email is shown and is not editable. */
export function mapCrmProfile(body) {
  if (!body || typeof body !== "object" || Array.isArray(body) || body.user_id == null || !body.email) return null;
  const name = [body.first_name, body.last_name].filter(Boolean).join(" ").trim();
  return {
    userId: body.user_id,
    firstName: body.first_name || "",
    lastName: body.last_name || "",
    name,
    email: body.email,
    role: body.role || "crm",
    isActive: typeof body.is_active === "boolean" ? body.is_active : null,
    createdAt: body.created_at || "",
    photoUrl: body.profile_image_url || "",
    phone: body.phone || "",
    phoneCode: body.phone_code || "",
    address: body.address || "",
    city: body.city || "",
    state: body.state || "",
    postalCode: body.postal_code || "",
    jobTitle: body.job_title || "",
  };
}

function whole(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export function monthLabel(year, month) {
  const name = MONTHS[Number(month) - 1] || String(month || "");
  return `${name} ${year || ""}`.trim();
}

/** GET /crm/revenue. Pending invoices are not part of these amounts. */
export function mapCrmRevenue(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { ok: false, revenue: null };
  if (!("collected_amount" in body) || !Array.isArray(body.hospitals) || !Array.isArray(body.months)) {
    return { ok: false, revenue: null };
  }
  return {
    ok: true,
    revenue: {
      collectedAmount: whole(body.collected_amount),
      collectedCount: whole(body.collected_count),
      hospitals: body.hospitals.map((row) => ({
        tenantId: row?.tenant_id,
        hospitalName: row?.hospital_name || "",
        plan: row?.plan || "",
        paidAmount: whole(row?.paid_amount),
        paidCount: whole(row?.paid_count),
      })),
      months: body.months.map((row) => ({
        year: whole(row?.year),
        month: whole(row?.month),
        amount: whole(row?.amount),
        label: monthLabel(row?.year, row?.month),
      })),
    },
  };
}

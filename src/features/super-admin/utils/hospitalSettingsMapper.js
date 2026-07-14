/** Map between Super Admin settings form state and GET/PATCH /super-admin/settings */

export function settingsApiToForm(api = {}) {
  const addressParts = [
    api.address_line1,
    api.address_line2,
    api.city,
    api.state,
    api.pincode,
  ].filter(Boolean);

  return {
    hospital_name: api.name ?? '',
    tagline: api.tagline ?? '',
    address_line1: api.address_line1 ?? '',
    address_line2: api.address_line2 ?? '',
    city: api.city ?? '',
    state: api.state ?? '',
    pincode: api.pincode ?? '',
    address: addressParts.join(', '),
    contact_email: api.email ?? '',
    contact_phone: api.phone ?? '',
    website: api.website ?? '',
    gstin: api.gstin ?? '',
    pan: api.pan ?? '',
    registration_number: api.registration_number ?? '',
    registration_fee: api.default_registration_fee ?? 0,
    default_consultation_fee: api.default_consultation_fee ?? 0,
    gst_percent: api.default_gst_percent ?? 0,
    currency_code: api.currency ?? 'INR',
    timezone: api.timezone ?? 'Asia/Kolkata',
    updated_at: api.updated_at ?? null,
    updated_by: api.updated_by ?? null,
  };
}

export function settingsFormToApi(form = {}) {
  const payload = {};

  if (form.hospital_name !== undefined) payload.name = form.hospital_name || '';
  if (form.tagline !== undefined) payload.tagline = form.tagline || null;
  if (form.address_line1 !== undefined) payload.address_line1 = form.address_line1 || null;
  if (form.address_line2 !== undefined) payload.address_line2 = form.address_line2 || null;
  if (form.city !== undefined) payload.city = form.city || null;
  if (form.state !== undefined) payload.state = form.state || null;
  if (form.pincode !== undefined) payload.pincode = form.pincode || null;
  if (form.contact_email !== undefined) payload.email = form.contact_email || null;
  if (form.contact_phone !== undefined) payload.phone = form.contact_phone || null;
  if (form.website !== undefined) payload.website = form.website || null;
  if (form.gstin !== undefined) payload.gstin = form.gstin || null;
  if (form.pan !== undefined) payload.pan = form.pan || null;
  if (form.registration_number !== undefined) {
    payload.registration_number = form.registration_number || null;
  }
  if (form.registration_fee !== undefined) {
    payload.default_registration_fee = Number(form.registration_fee) || 0;
  }
  if (form.default_consultation_fee !== undefined) {
    payload.default_consultation_fee = Number(form.default_consultation_fee) || 0;
  }
  if (form.gst_percent !== undefined) {
    payload.default_gst_percent = Number(form.gst_percent) || 0;
  }
  if (form.currency_code !== undefined) payload.currency = form.currency_code || 'INR';
  if (form.timezone !== undefined) payload.timezone = form.timezone || 'Asia/Kolkata';

  return payload;
}

/** Request bodies accepted by the current FastAPI registration schemas. */

export const TENANT_FIELD_MAP = {
  name: "name",
  code: "code",
  hospital_type: "type",
  email: "email",
  phone: "phone",
  address: "address",
  city: "city",
  state: "state",
  pincode: "postalCode",
  admin_full_name: "adminName",
  admin_email: "adminEmail",
  admin_phone: "adminPhone",
  admin_password: "adminPassword",
  plan: "plan",
  billing_cycle: "billingCycle",
  trial_period: "trialPeriod",
  tenant_status: "tenantStatus",
};

export const LEAD_FIELD_MAP = {
  code: "code",
  address: "address",
  pincode: "postalCode",
  admin_password: "adminPassword",
  plan: "plan",
  billing_cycle: "billingCycle",
  trial_period: "trialPeriod",
  tenant_status: "tenantStatus",
  email: "email",
  admin_email: "adminEmail",
};

function text(value) {
  return String(value ?? "").trim();
}

export function tenantRegisterBody(values) {
  return {
    name: text(values.name),
    code: text(values.code),
    hospital_type: values.type,
    email: text(values.email),
    phone: text(values.phone),
    address: text(values.address),
    city: text(values.city),
    state: text(values.state),
    pincode: text(values.postalCode),
    admin_full_name: text(values.adminName),
    admin_email: text(values.adminEmail),
    admin_phone: text(values.adminPhone),
    admin_password: values.adminPassword,
    plan: values.plan,
    billing_cycle: values.billingCycle,
    trial_period: values.trialPeriod,
    tenant_status: values.tenantStatus,
  };
}

export function leadRegisterBody(values) {
  return {
    code: text(values.code),
    address: text(values.address),
    pincode: text(values.postalCode),
    admin_password: values.adminPassword,
    plan: values.plan,
    billing_cycle: values.billingCycle,
    trial_period: values.trialPeriod,
    tenant_status: values.tenantStatus,
  };
}

export function mapRegistration(lead) {
  return {
    id: lead.id,
    hospitalName: lead.hospital_name || "",
    type: lead.hospital_type || "",
    city: lead.city || "",
    state: lead.state || "",
    hospitalEmail: lead.hospital_email || "",
    contactPerson: lead.contact_person || "",
    designation: lead.designation || "",
    contactPhone: lead.contact_phone || "",
    contactEmail: lead.contact_email || "",
    plan: lead.plan || "",
    billingCycle: lead.billing_cycle || "",
    source: lead.source || "",
    agreedAt: lead.agreed_at || "",
    agreedBy: lead.agreed_by_name || "",
    handoverNote: lead.handover_note || "",
    status: lead.status || "",
    hospitalId: lead.hospital_id ?? null,
    hospitalCode: lead.hospital_code || "",
    registeredAt: lead.registered_at || "",
    registeredBy: lead.registered_by_name || "",
  };
}

export function isNumericLeadId(value) {
  return /^\d+$/.test(String(value ?? ""));
}

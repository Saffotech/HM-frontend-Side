import { useQuery } from '@tanstack/react-query';
import { getOpdBillingSettings } from '@/features/opd/api/opdSettings';
import { opdSettingsApiToForm } from '@/features/admin/utils/opdSettingsMapper';
import { queryKeys } from '@/shared/api/queryKeys';
import { QUICK_BILL_ITEMS } from '@/shared/constants/billing';
import { TAX_RATE } from '@/shared/constants';

/**
 * OPD Billing Counter reads Admin-controlled OPD settings (delete gates, pricing).
 */
export function useOpdBillingSettingsQuery(options = {}) {
  const { enabled = true } = options;
  return useQuery({
    queryKey: queryKeys.opd.settings,
    enabled,
    queryFn: async () => {
      const data = await getOpdBillingSettings();
      return opdSettingsApiToForm({ ...data, _source: 'api' });
    },
    staleTime: 30_000,
  });
}

export function useOpdDeleteControls() {
  const query = useOpdBillingSettingsQuery();
  const controls = query.data?.delete_controls ?? {
    allow_patient_delete: true,
    allow_appointment_delete: true,
    allow_unpaid_bill_delete: true,
  };

  return {
    ...query,
    allowPatientDelete: Boolean(controls.allow_patient_delete),
    allowAppointmentDelete: Boolean(controls.allow_appointment_delete),
    allowUnpaidBillDelete: Boolean(controls.allow_unpaid_bill_delete),
  };
}

/** Same priority as backend: doctor → department → hospital default. */
export function resolveConsultationFee(pricing, { doctorId, departmentId } = {}) {
  const doctorFees = pricing?.doctor_consultation_fees ?? [];
  const deptFees = pricing?.department_consultation_fees ?? [];
  const hospitalDefault = Number(pricing?.consultation_fee ?? 500);

  if (doctorId != null && doctorId !== '') {
    const match = doctorFees.find(
      (row) => String(row.doctor_id) === String(doctorId),
    );
    if (match && match.fee !== '' && match.fee != null) {
      return Number(match.fee);
    }
  }

  if (departmentId != null && departmentId !== '') {
    const match = deptFees.find(
      (row) => String(row.department_id) === String(departmentId),
    );
    if (match && match.fee !== '' && match.fee != null) {
      return Number(match.fee);
    }
  }

  return Number.isFinite(hospitalDefault) ? hospitalDefault : 500;
}

export function useOpdPaymentControls() {
  const query = useOpdBillingSettingsQuery();
  const pm = query.data?.payment_modes;
  const modes = pm?.modes ?? [];

  const enabledModes = modes
    .filter((m) => m.enabled !== false)
    .map((m) => {
      const code = (m.code || '').toLowerCase();
      if (code === 'upi') return 'UPI';
      return code.charAt(0).toUpperCase() + code.slice(1);
    });

  return {
    ...query,
    enabledPaymentModes: enabledModes.length ? enabledModes : ['Cash', 'Card', 'UPI', 'Insurance'],
    bankDetails: pm?.bank_details ?? {},
    insuranceProviders: (pm?.insurance_providers ?? []).filter((p) => p.is_active),
  };
}

export function resolveBedRate(pricing, { bedNumber, wardName } = {}) {
  const bedTariff = pricing?.bed_tariff ?? {};
  const specialRates = bedTariff.special_bed_rates ?? [];
  const wardRates = bedTariff.ward_rates ?? [];
  const bedKey = String(bedNumber || '').trim().toLowerCase();
  const wardKey = String(wardName || '').trim().toLowerCase();

  if (bedKey) {
    const special = specialRates.find(
      (row) => String(row?.bed_number || '').trim().toLowerCase() === bedKey,
    );
    if (special && Number.isFinite(Number(special.charge_per_day))) {
      return Number(special.charge_per_day);
    }
  }

  if (wardKey) {
    const ward = wardRates.find(
      (row) => String(row?.ward_name || '').trim().toLowerCase() === wardKey,
    );
    if (ward && Number.isFinite(Number(ward.charge_per_day))) {
      return Number(ward.charge_per_day);
    }
  }

  if (wardKey.includes('icu')) return Number(bedTariff.icu_charge ?? 5000);
  if (wardKey.includes('private')) return Number(bedTariff.private_ward_charge ?? 2000);
  return Number(bedTariff.general_ward_charge ?? 500);
}

export function calculateBedDays(admittedAtIso) {
  if (!admittedAtIso) return 1;
  const admittedAt = new Date(admittedAtIso);
  if (Number.isNaN(admittedAt.getTime())) return 1;
  const diffMs = Math.max(0, Date.now() - admittedAt.getTime());
  return Math.max(1, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
}

export function useOpdPricingControls() {
  const query = useOpdBillingSettingsQuery();
  const pricing = query.data?.pricing;

  const gstPercent = Number(pricing?.gst_percent ?? TAX_RATE * 100);
  const registrationFee = Number(pricing?.registration_fee ?? 200);
  const consultationFeeDefault = Number(pricing?.consultation_fee ?? 500);
  const allowManualPriceEntry = pricing?.allow_manual_price_entry !== false;

  const billItems = (() => {
    const fromSettings = (pricing?.bill_items ?? []).filter(
      (item) => item?.is_active !== false && String(item?.name || '').trim(),
    );
    if (fromSettings.length) {
      return fromSettings.map((item) => ({
        name: String(item.name).trim(),
        price: Number(item.price) || 0,
      }));
    }
    return QUICK_BILL_ITEMS.map((item) => ({ ...item }));
  })();

  return {
    ...query,
    pricing,
    gstPercent: Number.isFinite(gstPercent) ? gstPercent : 5,
    taxRate: (Number.isFinite(gstPercent) ? gstPercent : 5) / 100,
    registrationFee: Number.isFinite(registrationFee) ? registrationFee : 200,
    consultationFeeDefault: Number.isFinite(consultationFeeDefault)
      ? consultationFeeDefault
      : 500,
    allowManualPriceEntry,
    billItems,
    resolveConsultationFee: (doctorId, departmentId) =>
      resolveConsultationFee(pricing, { doctorId, departmentId }),
    resolveBedRate: (bedNumber, wardName) => resolveBedRate(pricing, { bedNumber, wardName }),
    calculateBedDays,
  };
}

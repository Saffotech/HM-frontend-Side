import { Stethoscope, Building2, Package, BedDouble } from 'lucide-react';
import PricingView from '@/shared/components/pricing/PricingView';

const TABS = [
  { id: 'department', label: 'Department Consultation Fees', icon: Building2 },
  { id: 'doctor', label: 'Doctor Consultation Fees', icon: Stethoscope },
  { id: 'items', label: 'Additional IPD Charges', icon: Package },
  { id: 'bed', label: 'Bed Tariff', icon: BedDouble },
];

const STATIC_DATA = {
  settings: {
    pricing: {
      registration_fee: 0,
      consultation_fee: 0,
      gst_percent: 0,
      allow_manual_price_entry: true,
      bed_tariff: {
        general_ward_charge: 0,
        private_ward_charge: 0,
        icu_charge: 0,
        ward_rates: [],
        special_bed_rates: [],
      },
      department_consultation_fees: [],
      doctor_consultation_fees: [],
      bill_items: [],
    },
  },
  departments: [],
  doctors: [],
};

export default function IpdPricingPage() {
  return (
    <PricingView
      title="IPD Pricing"
      subtitle="Hospital IPD charges — current configured pricing"
      tabs={TABS}
      data={STATIC_DATA}
    />
  );
}

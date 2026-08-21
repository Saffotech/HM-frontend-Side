import { Stethoscope, Building2, Package } from 'lucide-react';
import PricingView from '@/shared/components/pricing/PricingView';

const TABS = [
  { id: 'department', label: 'Department Consultation Fees', icon: Building2 },
  { id: 'doctor', label: 'Doctor Consultation Fees', icon: Stethoscope },
  { id: 'items', label: 'Additional OPD Charges', icon: Package },
];

const STATIC_DATA = {
  settings: {
    pricing: {
      registration_fee: 0,
      consultation_fee: 0,
      gst_percent: 0,
      allow_manual_price_entry: true,
      department_consultation_fees: [],
      doctor_consultation_fees: [],
      bill_items: [],
    },
  },
  departments: [],
  doctors: [],
};

export default function ReceptionistPricingPage() {
  return (
    <PricingView
      title="Pricing"
      subtitle="Hospital OPD charges — current configured pricing"
      tabs={TABS}
      data={STATIC_DATA}
    />
  );
}

import { Stethoscope, Building2, Microscope } from 'lucide-react';
import PricingView from '@/shared/components/pricing/PricingView';

const TABS = [
  { id: 'department', label: 'Department Consultation Fees', icon: Building2 },
  { id: 'doctor', label: 'Doctor Consultation Fees', icon: Stethoscope },
  { id: 'lab', label: 'Lab Charges', icon: Microscope },
];

export default function ReceptionistPricingPage() {
  return (
    <PricingView
      title="Pricing"
      subtitle="Hospital OPD charges — current configured pricing"
      tabs={TABS}
      dataSource="receptionist"
    />
  );
}

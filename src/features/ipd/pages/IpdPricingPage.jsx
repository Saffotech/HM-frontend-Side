import { Stethoscope, Building2, Microscope, BedDouble } from 'lucide-react';
import PricingView from '@/shared/components/pricing/PricingView';

const TABS = [
  { id: 'department', label: 'Department Consultation Fees', icon: Building2 },
  { id: 'doctor', label: 'Doctor Consultation Fees', icon: Stethoscope },
  { id: 'lab', label: 'Lab Charges', icon: Microscope },
  { id: 'bed', label: 'Bed Tariff', icon: BedDouble },
];

export default function IpdPricingPage() {
  return (
    <PricingView
      title="IPD Pricing"
      subtitle="Hospital IPD charges — current configured pricing"
      tabs={TABS}
      dataSource="ipd"
      showSummary={false}
      clinicalConsultFeesOnly
    />
  );
}

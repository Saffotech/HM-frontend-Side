/**
 * Admit Patient page — live admission form.
 */

import IpdPageHeader from '@/features/ipd/components/IpdPageHeader';
import AdmitPatientForm from '@/features/ipd/components/AdmitPatientForm';

export default function IpdAdmitPatientPage() {
  return (
    <div className="ipd-page ipd-page--admit">
      <IpdPageHeader title="Admit Patient" />
      <AdmitPatientForm />
    </div>
  );
}

import { FileText, Activity, Stethoscope } from 'lucide-react';

export default function PatientProfileMedicalTab({ uniqueDepts }) {
  return (
    <div className="pp-medical">
      <div className="pp-card">
        <h3 className="pp-card__title"><FileText size={16} /> Prescriptions</h3>
        <p className="pp-placeholder">No prescriptions uploaded. Connect EMR module to sync.</p>
      </div>
      <div className="pp-card">
        <h3 className="pp-card__title"><Activity size={16} /> Reports & Documents</h3>
        <p className="pp-placeholder">No lab reports on file.</p>
      </div>
      <div className="pp-card">
        <h3 className="pp-card__title"><Stethoscope size={16} /> Medical Notes</h3>
        <p className="pp-card__lead">
          Last visit departments: {uniqueDepts.join(', ') || 'N/A'}
        </p>
      </div>
    </div>
  );
}

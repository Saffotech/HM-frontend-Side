import {
  prescribedByName,
  resolvePrescribedDoctorDepartment,
} from '@/shared/api/mappers/nurseMapper';
import './NursePrescribedDoctorCell.css';

export default function NursePrescribedDoctorCell({ prescription, doctorDepartmentMap }) {
  if (!prescription) return '—';

  const name = prescribedByName(prescription);
  const department = resolvePrescribedDoctorDepartment(prescription, doctorDepartmentMap);

  if (!name && !department) return '—';

  return (
    <div className="nurse-prescribed-doctor-cell">
      <span className="nurse-prescribed-doctor-cell__name">{name || '—'}</span>
      {department ? (
        <span className="nurse-prescribed-doctor-cell__dept">{department}</span>
      ) : null}
    </div>
  );
}

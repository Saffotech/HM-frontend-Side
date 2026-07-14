import { useEffect, useMemo, useState } from 'react';
import { receptionistApi } from '../api/receptionist';

export default function DepartmentDoctorFilter({
  selectedDepartmentId = 'all',
  onDepartmentChange,
  selectedDoctorId,
  onDoctorChange,
  className = '',
  compact = false,
}) {
  const [doctors, setDoctors] = useState([]);

  useEffect(() => {
    let cancelled = false;
    receptionistApi
      .getDoctors()
      .then((list) => {
        if (!cancelled) setDoctors(list);
      })
      .catch(() => {
        if (!cancelled) setDoctors([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const departments = useMemo(() => {
    const byId = new Map();
    doctors.forEach((doctor) => {
      if (doctor.department_id != null && doctor.department) {
        byId.set(doctor.department_id, doctor.department);
      }
    });
    return Array.from(byId.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [doctors]);

  const filteredDoctors = useMemo(() => {
    if (selectedDepartmentId === 'all') return doctors;
    return doctors.filter(
      (doctor) => String(doctor.department_id) === String(selectedDepartmentId),
    );
  }, [doctors, selectedDepartmentId]);

  return (
    <div className={`rec-filter-group${compact ? ' rec-filter-group--compact' : ''}${className ? ` ${className}` : ''}`}>
      <div className="rec-filter-group__field">
        <select
          className={`rec-select${compact ? ' rec-select--compact' : ''}`}
          value={selectedDepartmentId}
          onChange={(e) => onDepartmentChange(e.target.value)}
          aria-label="Filter by department"
        >
          <option value="all">All Departments</option>
          {departments.map((dept) => (
            <option key={dept.id} value={String(dept.id)}>
              {dept.name}
            </option>
          ))}
        </select>
      </div>
      <div className="rec-filter-group__field">
        <select
          className={`rec-select${compact ? ' rec-select--compact' : ''}`}
          value={selectedDoctorId}
          onChange={(e) => onDoctorChange(e.target.value)}
          aria-label="Filter by doctor"
        >
          <option value="all">All Doctors</option>
          {filteredDoctors.map((doctor) => (
            <option key={doctor.id} value={String(doctor.id)}>
              {doctor.name}
            </option>
          ))}
          {filteredDoctors.length === 0 && (
            <option value="__none" disabled>
              No doctors found
            </option>
          )}
        </select>
      </div>
    </div>
  );
}

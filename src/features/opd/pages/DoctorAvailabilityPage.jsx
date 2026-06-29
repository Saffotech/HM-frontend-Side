import { useState } from 'react';
import {
  useDepartmentsQuery,
  useDoctorsByDepartmentQuery,
} from '@/shared/hooks/queries/useOpdReferenceQuery';
import { useDoctorSlotsQuery } from '@/shared/hooks/queries/useAppointmentQuery';
import { Input, Select, TimeSlotGrid } from '@/shared/components/common';
import './DoctorAvailabilityPage.css';

export default function DoctorAvailabilityPage() {
  const [deptId, setDeptId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [dateStr, setDateStr] = useState(new Date().toISOString().split('T')[0]);
  const { data: departments = [] } = useDepartmentsQuery();
  const { data: doctors = [] } = useDoctorsByDepartmentQuery(deptId);
  const selectedDoctor = doctors.find((d) => String(d.id) === String(doctorId));
  const dateObj = dateStr ? new Date(dateStr) : undefined;
  const {
    data: apiSlots = [],
    isLoading: slotsLoading,
    isError: slotsError,
  } = useDoctorSlotsQuery({
    doctorId,
    departmentId: deptId,
    date: dateStr,
    enabled: Boolean(dateStr && doctorId && deptId),
  });

  return (
    <div className="page-container availability-page page-stack">
      <h2 className="page-title">Doctor Availability</h2>
      <div className="card card__body availability-page__card">
        <div className="form-grid">
          <Select label="Department" value={deptId} onChange={(v) => { setDeptId(v); setDoctorId(''); }}
            options={departments.map((d) => ({ value: d.id, label: d.name }))} placeholder="Select..." />
          <Select label="Doctor" value={doctorId} onChange={setDoctorId} disabled={!deptId}
            options={doctors.map((d) => ({ value: d.id, label: `Dr. ${d.name}` }))} />
          <Input type="date" label="Date" value={dateStr} onChange={(e) => setDateStr(e.target.value)} min={new Date().toISOString().split('T')[0]} />
        </div>
        {doctorId && dateObj ? (
          <div className="availability-result">
            <h3>Slots for Dr. {selectedDoctor?.name}</h3>
            <p className="text-muted">{dateObj.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
            <TimeSlotGrid
              date={dateObj}
              doctorId={doctorId}
              departmentId={deptId}
              apiSlots={apiSlots}
              useApiSlots
              slotsLoading={slotsLoading}
              slotsError={slotsError}
            />
          </div>
        ) : (
          <p className="empty-hint">Select department and doctor to view slots.</p>
        )}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NurseLayout from '@/features/nurse/components/NurseLayout';
import NursePageHeader from '@/features/nurse/components/NursePageHeader';
import { useCreateHandoverMutation } from '@/shared/hooks/queries/useNurseQuery';
import { toast } from '@/shared/utils/toast';

const INITIAL = {
  ward_name: '',
  shift_date: new Date().toISOString().slice(0, 10),
  shift_start: '',
  shift_end: '',
  general_notes: '',
};

export default function NurseHandoverCreatePage() {
  const navigate = useNavigate();
  const createMut = useCreateHandoverMutation();
  const [form, setForm] = useState(INITIAL);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const onSubmit = (e) => {
    e.preventDefault();
    if (!form.ward_name.trim()) {
      toast.error('Ward name is required');
      return;
    }
    const payload = {
      ward_name: form.ward_name.trim(),
      shift_date: form.shift_date || undefined,
      shift_start: form.shift_start || undefined,
      shift_end: form.shift_end || undefined,
      general_notes: form.general_notes?.trim() || undefined,
    };
    createMut.mutate(payload, {
      onSuccess: (data) => {
        toast.success('Handover created');
        const id = data?.id ?? data?.handover_id;
        if (id) navigate(`/nurse/handover/${id}`);
        else navigate('/nurse/handover');
      },
      onError: (err) => toast.error(err?.message || 'Failed to create handover'),
    });
  };

  return (
    <NurseLayout>
      <div className="nurse-page nurse-max-w-form">
        <NursePageHeader title="New Shift Handover" />
        <form className="nurse-card nurse-card--padded nurse-form" onSubmit={onSubmit}>
          <div className="nurse-field">
            <label htmlFor="ward_name">Ward *</label>
            <input
              id="ward_name"
              className="nurse-input"
              value={form.ward_name}
              onChange={(e) => set('ward_name', e.target.value)}
              required
            />
          </div>
          <div className="nurse-field">
            <label htmlFor="shift_date">Shift Date</label>
            <input
              id="shift_date"
              type="date"
              className="nurse-input"
              value={form.shift_date}
              onChange={(e) => set('shift_date', e.target.value)}
            />
          </div>
          <div className="nurse-form-row">
            <div className="nurse-field">
              <label htmlFor="shift_start">Shift Start</label>
              <input
                id="shift_start"
                type="time"
                className="nurse-input"
                value={form.shift_start}
                onChange={(e) => set('shift_start', e.target.value)}
              />
            </div>
            <div className="nurse-field">
              <label htmlFor="shift_end">Shift End</label>
              <input
                id="shift_end"
                type="time"
                className="nurse-input"
                value={form.shift_end}
                onChange={(e) => set('shift_end', e.target.value)}
              />
            </div>
          </div>
          <div className="nurse-field">
            <label htmlFor="general_notes">General Notes</label>
            <textarea
              id="general_notes"
              className="nurse-textarea"
              rows={4}
              value={form.general_notes}
              onChange={(e) => set('general_notes', e.target.value)}
            />
          </div>
          <div className="nurse-form-actions">
            <button type="button" className="nurse-btn nurse-btn--secondary" onClick={() => navigate(-1)}>
              Cancel
            </button>
            <button type="submit" className="nurse-btn nurse-btn--primary" disabled={createMut.isPending}>
              {createMut.isPending ? 'Creating…' : 'Create Handover'}
            </button>
          </div>
        </form>
      </div>
    </NurseLayout>
  );
}

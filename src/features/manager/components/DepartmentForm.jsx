import { FlaskConical, Stethoscope } from 'lucide-react';
import { Input, Label } from '@/shared/components/common';

function KindCard({ selected, icon: Icon, title, onSelect }) {
  return (
    <button
      type="button"
      className={`dept-kind-card${selected ? ' is-selected' : ''}`}
      aria-pressed={selected}
      onClick={onSelect}
    >
      <span className="dept-kind-card__icon" aria-hidden>
        <Icon size={20} strokeWidth={2} />
      </span>
      <span className="dept-kind-card__text">
        <strong>{title}</strong>
      </span>
    </button>
  );
}

export default function DepartmentForm({
  form,
  onChange,
  showStatus = false,
  showKind = false,
  hideDescription = false,
  idPrefix = 'dept',
}) {
  const kind = form.kind === 'lab' ? 'lab' : 'doctor';

  const handleChange = (field) => (e) => {
    const value = field === 'is_active' ? e.target.checked : e.target.value;
    onChange((prev) => ({ ...prev, [field]: value }));
  };

  const setKind = (nextKind) => {
    onChange((prev) => ({ ...prev, kind: nextKind }));
  };

  return (
    <div className="dept-form">
      {showKind && (
        <div className="dept-form__section dept-form__section--type">
          <h3 className="dept-form__section-title">Department type</h3>
          <div className="dept-kind-grid" role="group" aria-label="Department type">
            <KindCard
              selected={kind === 'doctor'}
              icon={Stethoscope}
              title="Doctor department"
              onSelect={() => setKind('doctor')}
            />
            <KindCard
              selected={kind === 'lab'}
              icon={FlaskConical}
              title="Lab department"
              onSelect={() => setKind('lab')}
            />
          </div>
        </div>
      )}

      <div className="dept-form__section">
        <h3 className="dept-form__section-title">Department information</h3>
        <div className="dept-form__grid">
          <div>
            <Label htmlFor={`${idPrefix}_name`}>Department name *</Label>
            <Input
              id={`${idPrefix}_name`}
              value={form.name}
              onChange={handleChange('name')}
              required
              maxLength={100}
              autoComplete="off"
              placeholder={kind === 'lab' ? 'e.g. Pathology' : 'e.g. Cardiology'}
            />
          </div>
          <div>
            <Label htmlFor={`${idPrefix}_code`}>Department code</Label>
            <Input
              id={`${idPrefix}_code`}
              value={form.code}
              onChange={handleChange('code')}
              maxLength={10}
              autoComplete="off"
              placeholder={kind === 'lab' ? 'e.g. PATH' : 'e.g. CARD'}
            />
          </div>
        </div>
        {!hideDescription && (
          <div>
            <Label htmlFor={`${idPrefix}_description`}>Description</Label>
            <Input
              id={`${idPrefix}_description`}
              value={form.description}
              onChange={handleChange('description')}
              maxLength={500}
              placeholder="Optional description"
            />
          </div>
        )}
      </div>

      {showStatus && (
        <div className="dept-form__section">
          <h3 className="dept-form__section-title">Status</h3>
          <label className="admin-checkbox-row">
            <input
              type="checkbox"
              checked={Boolean(form.is_active)}
              onChange={handleChange('is_active')}
            />
            <span>Department is active</span>
          </label>
        </div>
      )}
    </div>
  );
}

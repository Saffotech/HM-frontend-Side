import { Input, Label } from '@/shared/components/common';

const EMPTY = {
  name: '',
  code: '',
  description: '',
  is_active: true,
};

export function emptyDepartmentForm() {
  return { ...EMPTY };
}

export function departmentToForm(department) {
  if (!department) return emptyDepartmentForm();
  return {
    name: department.name ?? '',
    code: department.code ?? '',
    description: department.description ?? '',
    is_active: department.is_active !== false,
  };
}

export function buildDepartmentPayload(form, { includeStatus = false } = {}) {
  const payload = {
    name: form.name.trim(),
    code: form.code.trim() || null,
    description: form.description.trim() || null,
  };
  if (includeStatus) {
    payload.is_active = Boolean(form.is_active);
  }
  return payload;
}

export default function DepartmentForm({
  form,
  onChange,
  showStatus = false,
  hideDescription = false,
  idPrefix = 'dept',
}) {
  const handleChange = (field) => (e) => {
    const value = field === 'is_active' ? e.target.checked : e.target.value;
    onChange((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="admin-form-grid">
      <div className="admin-form-section">
        <h3 className="admin-form-section__title">Department information</h3>
        <div className="admin-form-grid admin-form-grid--2">
          <div>
            <Label htmlFor={`${idPrefix}_name`}>Department name *</Label>
            <Input
              id={`${idPrefix}_name`}
              value={form.name}
              onChange={handleChange('name')}
              required
              maxLength={100}
            />
          </div>
          <div>
            <Label htmlFor={`${idPrefix}_code`}>Department code</Label>
            <Input
              id={`${idPrefix}_code`}
              value={form.code}
              onChange={handleChange('code')}
              maxLength={10}
              placeholder="e.g. CARD"
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
        <div className="admin-form-section">
          <h3 className="admin-form-section__title">Status</h3>
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

import { ClipboardList, Eraser, FileText, Stethoscope } from 'lucide-react';

export const NOTE_FIELDS = [
  { key: 'symptoms', label: 'Symptoms', icon: Stethoscope, accent: 'rose', placeholder: 'Describe patient symptoms…' },
  { key: 'treatment_response', label: 'Treatment Response', icon: ClipboardList, accent: 'blue', placeholder: 'Document treatment given and patient response…' },
  { key: 'additional_notes', label: 'Additional Notes', icon: FileText, accent: 'purple', placeholder: 'Any other observations or follow-up actions…' },
];

export const INITIAL_NOTE_FORM = {
  symptoms: '',
  treatment_response: '',
  additional_notes: '',
};

export function noteToForm(note) {
  return {
    symptoms: note?.symptoms || '',
    treatment_response: note?.treatment_response || '',
    additional_notes: note?.additional_notes || '',
  };
}

export default function NurseNoteFormFields({ form, onChange, idPrefix = 'note' }) {
  return (
    <div className="nurse-note-edit__fields">
      {NOTE_FIELDS.map(({ key, label, icon: Icon, accent, placeholder }) => (
        <div key={key} className={`nurse-note-edit__field nurse-note-edit__field--${accent}`}>
          <div className="nurse-note-edit__field-top">
            <div className="nurse-note-edit__field-label">
              <div className={`nurse-note-detail__card-icon nurse-note-detail__card-icon--${accent}`}>
                <Icon size={16} />
              </div>
              <label htmlFor={`${idPrefix}-${key}`}>{label}</label>
            </div>
            <button
              type="button"
              className="nurse-note-edit__clear"
              onClick={() => onChange(key, '')}
              disabled={!form[key]}
            >
              <Eraser size={14} />
              Clear
            </button>
          </div>
          <textarea
            id={`${idPrefix}-${key}`}
            rows={4}
            className="nurse-textarea nurse-note-edit__textarea"
            placeholder={placeholder}
            value={form[key]}
            onChange={(e) => onChange(key, e.target.value)}
          />
        </div>
      ))}
    </div>
  );
}

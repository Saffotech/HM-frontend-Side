import { ClipboardList, Eraser, FileText, Stethoscope } from 'lucide-react';
import { NurseClinicalFieldShell } from '@/features/nurse/components/NurseClinicalFieldCard';

export const NOTE_FIELDS = [
  {
    key: 'symptoms',
    label: 'Symptoms',
    icon: Stethoscope,
    accent: 'rose',
    placeholder: 'Onset, duration, severity, and associated complaints…',
  },
  {
    key: 'treatment_response',
    label: 'Treatment Response',
    icon: ClipboardList,
    accent: 'blue',
    placeholder: 'Improvement, no change, worsening, or side effects…',
  },
  {
    key: 'additional_notes',
    label: 'Additional Notes',
    icon: FileText,
    accent: 'green',
    placeholder: 'Other observations, allergies, or follow-up advice…',
  },
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
    <div className="nurse-clinical-fields nurse-clinical-fields--grid nurse-clinical-fields--notes">
      {NOTE_FIELDS.map(({ key, label, icon: Icon, accent, placeholder }) => (
        <NurseClinicalFieldShell
          key={key}
          accent={accent}
          icon={Icon}
          label={label}
          onClear={() => onChange(key, '')}
          clearDisabled={!form[key]}
          clearContent={
            <>
              <Eraser size={14} />
              Clear
            </>
          }
        >
          <textarea
            id={`${idPrefix}-${key}`}
            rows={5}
            className="nurse-textarea nurse-clinical-field__input nurse-clinical-field__input--notes"
            placeholder={placeholder}
            value={form[key]}
            onChange={(e) => onChange(key, e.target.value)}
          />
        </NurseClinicalFieldShell>
      ))}
    </div>
  );
}

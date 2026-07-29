import { ClipboardList, Eraser, FileText, Stethoscope } from 'lucide-react';
import { NurseClinicalFieldShell } from '@/features/nurse/components/NurseClinicalFieldCard';

export const NOTE_FIELDS = [
  {
    key: 'symptoms',
    label: 'Symptoms',
    icon: Stethoscope,
    accent: 'rose',
    placeholder:
      'Record all patient-reported symptoms accurately, including onset, duration, severity, and associated complaints. Multiple symptoms may be entered if applicable.',
  },
  {
    key: 'treatment_response',
    label: 'Treatment Response',
    icon: ClipboardList,
    accent: 'blue',
    placeholder:
      "Document the patient's response to the prescribed treatment, including improvement, no change, worsening condition, side effects, or any follow-up recommendations.",
  },
  {
    key: 'additional_notes',
    label: 'Additional Notes',
    icon: FileText,
    accent: 'green',
    placeholder:
      'Enter any additional clinical observations, special instructions, allergies, follow-up advice, or other relevant information not covered in the previous sections…',
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
    <div className="nurse-clinical-fields">
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
            rows={4}
            className="nurse-textarea nurse-clinical-field__input"
            placeholder={placeholder}
            value={form[key]}
            onChange={(e) => onChange(key, e.target.value)}
          />
        </NurseClinicalFieldShell>
      ))}
    </div>
  );
}

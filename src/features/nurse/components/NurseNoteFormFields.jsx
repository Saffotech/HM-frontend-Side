import { Eraser } from 'lucide-react';
import { NurseClinicalFieldShell } from '@/features/nurse/components/NurseClinicalFieldCard';
import { NOTE_FIELDS } from '@/features/nurse/utils/nurseNoteFields';

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

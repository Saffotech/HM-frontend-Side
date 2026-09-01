import { resolveMedicationSource, prescribedByName } from '@/shared/api/mappers/nurseMapper';
import './NurseMedicineCell.css';

/**
 * Medicine name with OPD/IPD source badge. Prescriber can be shown separately in a table column.
 */
export default function NurseMedicineCell({
  prescription,
  className = '',
  showPrescriber = true,
}) {
  if (!prescription) return '—';

  const source = resolveMedicationSource(prescription);
  const prescriber = prescribedByName(prescription);
  const sourceKey = source.toLowerCase();

  return (
    <div className={`nurse-med-cell${className ? ` ${className}` : ''}`}>
      <div className="nurse-med-cell__title-row">
        <span className="nurse-med-cell__name">{prescription.medicine_name || '—'}</span>
        <span
          className={`nurse-med-source-badge nurse-med-source-badge--${sourceKey}`}
          title={`Prescribed in ${source}`}
        >
          {source}
        </span>
      </div>
      {showPrescriber && prescriber ? (
        <span className="nurse-med-cell__prescriber">{prescriber}</span>
      ) : null}
    </div>
  );
}

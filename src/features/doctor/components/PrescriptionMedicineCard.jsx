import { Input, Label } from '@/shared/components/common';
import {
  MEDICINE_DURATION_UNIT_OPTIONS,
  MEDICINE_FORM_OPTIONS,
  MEDICINE_FREQUENCY_OPTIONS,
  MEDICINE_INSTRUCTIONS_MAX,
  MEDICINE_ROUTE_OPTIONS,
  MEDICINE_TIMING_OPTIONS,
} from '@/features/doctor/constants';

function optionList(values, { includeEmpty = false, emptyLabel = 'Select…', current } = {}) {
  const list = [...values];
  const cur = String(current ?? '').trim();
  if (cur && !list.includes(cur)) list.unshift(cur);
  return (
    <>
      {includeEmpty ? <option value="">{emptyLabel}</option> : null}
      {list.map((v) => (
        <option key={v} value={v}>
          {v}
        </option>
      ))}
    </>
  );
}

/**
 * One prescription medicine card.
 * Layout: 2 fields per row.
 */
export default function PrescriptionMedicineCard({
  medicine,
  index,
  fieldErrors = {},
  onChange,
  onRemove,
  onAdd = null,
  canRemove = false,
  showRequiredHints = true,
}) {
  const nameFilled = Boolean(String(medicine?.name ?? '').trim());
  const instrLen = String(medicine?.instructions ?? '').length;

  const patch = (partial) => {
    onChange({ ...medicine, ...partial });
  };

  const selectClass = (errorKey) =>
    `doc-med-row__select${fieldErrors[errorKey] ? ' doc-med-row__select--error' : ''}`;

  return (
    <div className="doc-med-row doc-med-row--consult doc-med-card">
      <div className="doc-med-card__head">
        <span className="doc-med-card__title">
          Medicine {index + 1}
          {nameFilled && medicine.name ? ` · ${medicine.name}` : ''}
        </span>
        <div className="doc-med-card__actions">
          {typeof onAdd === 'function' ? (
            <button
              type="button"
              className="doc-med-card__add"
              onClick={onAdd}
            >
              + Add medicine
            </button>
          ) : null}
          {canRemove ? (
            <button
              type="button"
              className="doc-med-card__remove"
              onClick={onRemove}
              aria-label={`Remove medicine ${index + 1}`}
            >
              Remove
            </button>
          ) : null}
        </div>
      </div>

      <div className="doc-med-row__pair">
        <Input
          className="doc-med-row__cell"
          label={showRequiredHints ? 'Medicine *' : 'Medicine'}
          placeholder="Medicine name"
          value={medicine.name ?? ''}
          onChange={(e) => patch({ name: e.target.value })}
        />
        <Input
          className="doc-med-row__cell"
          label={showRequiredHints && nameFilled ? 'Strength *' : 'Strength'}
          placeholder="e.g. 500 mg"
          value={medicine.dosage ?? ''}
          onChange={(e) => patch({ dosage: e.target.value })}
          error={fieldErrors[`medDosage_${index}`]}
        />
      </div>

      <div className="doc-med-row__pair">
        <div className="doc-med-row__cell">
          <Label htmlFor={`med-form-${index}`}>
            {showRequiredHints && nameFilled ? 'Form *' : 'Form'}
          </Label>
          <select
            id={`med-form-${index}`}
            className={selectClass(`medForm_${index}`)}
            value={medicine.form ?? ''}
            onChange={(e) => patch({ form: e.target.value })}
          >
            {optionList(MEDICINE_FORM_OPTIONS, { includeEmpty: true, current: medicine.form })}
          </select>
          {fieldErrors[`medForm_${index}`] ? (
            <p className="field__error">{fieldErrors[`medForm_${index}`]}</p>
          ) : null}
        </div>
        <Input
          className="doc-med-row__cell"
          label={showRequiredHints && nameFilled ? 'Quantity *' : 'Quantity'}
          type="number"
          min={1}
          placeholder="e.g. 10"
          value={medicine.quantity ?? ''}
          onChange={(e) => patch({ quantity: e.target.value })}
          error={fieldErrors[`medQuantity_${index}`]}
        />
      </div>

      <div className="doc-med-row__pair">
        <div className="doc-med-row__cell">
          <Label htmlFor={`med-freq-${index}`}>
            {showRequiredHints && nameFilled ? 'Frequency *' : 'Frequency'}
          </Label>
          <select
            id={`med-freq-${index}`}
            className={selectClass(`medFrequency_${index}`)}
            value={medicine.frequency ?? ''}
            onChange={(e) => patch({ frequency: e.target.value })}
          >
            {optionList(MEDICINE_FREQUENCY_OPTIONS, {
              includeEmpty: true,
              current: medicine.frequency,
            })}
          </select>
          {fieldErrors[`medFrequency_${index}`] ? (
            <p className="field__error">{fieldErrors[`medFrequency_${index}`]}</p>
          ) : null}
        </div>
        <div className="doc-med-row__cell">
          <Label htmlFor={`med-timing-${index}`}>Timing</Label>
          <select
            id={`med-timing-${index}`}
            className="doc-med-row__select"
            value={medicine.timing ?? ''}
            onChange={(e) => patch({ timing: e.target.value })}
          >
            {optionList(MEDICINE_TIMING_OPTIONS, {
              includeEmpty: true,
              emptyLabel: 'Optional',
              current: medicine.timing,
            })}
          </select>
        </div>
      </div>

      <div className="doc-med-row__pair">
        <Input
          className="doc-med-row__cell doc-med-row__duration-value"
          label={showRequiredHints && nameFilled ? 'Duration *' : 'Duration'}
          type="number"
          min={1}
          max={365}
          placeholder="e.g. 5"
          value={medicine.durationValue ?? ''}
          onChange={(e) => patch({ durationValue: e.target.value })}
          error={fieldErrors[`medDuration_${index}`]}
        />
        <div className="doc-med-row__cell">
          <Label htmlFor={`med-duration-unit-${index}`}>
            {showRequiredHints && nameFilled ? 'Duration unit *' : 'Duration unit'}
          </Label>
          <select
            id={`med-duration-unit-${index}`}
            className={`doc-med-row__duration-unit${
              fieldErrors[`medDurationUnit_${index}`] ? ' doc-med-row__duration-unit--error' : ''
            }`}
            value={medicine.durationUnit ?? 'Days'}
            onChange={(e) => patch({ durationUnit: e.target.value })}
            aria-label="Duration unit"
          >
            {optionList(MEDICINE_DURATION_UNIT_OPTIONS)}
          </select>
          {fieldErrors[`medDurationUnit_${index}`] ? (
            <p className="field__error">{fieldErrors[`medDurationUnit_${index}`]}</p>
          ) : null}
        </div>
      </div>

      <div className="doc-med-row__pair">
        <div className="doc-med-row__cell">
          <Label htmlFor={`med-route-${index}`}>
            {showRequiredHints && nameFilled ? 'Route *' : 'Route'}
          </Label>
          <select
            id={`med-route-${index}`}
            className={selectClass(`medRoute_${index}`)}
            value={medicine.route ?? ''}
            onChange={(e) => patch({ route: e.target.value })}
          >
            {optionList(MEDICINE_ROUTE_OPTIONS, { includeEmpty: true, current: medicine.route })}
          </select>
          {fieldErrors[`medRoute_${index}`] ? (
            <p className="field__error">{fieldErrors[`medRoute_${index}`]}</p>
          ) : null}
        </div>
        <div className="doc-med-row__cell">
          <Input
            label="Special instructions"
            placeholder="Optional notes"
            value={medicine.instructions ?? ''}
            maxLength={MEDICINE_INSTRUCTIONS_MAX}
            onChange={(e) => patch({ instructions: e.target.value })}
            error={fieldErrors[`medInstructions_${index}`]}
          />
          <p className="doc-med-card__counter text-muted">
            {instrLen}/{MEDICINE_INSTRUCTIONS_MAX}
          </p>
        </div>
      </div>
    </div>
  );
}

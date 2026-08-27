import { Input, Label, Textarea } from '@/shared/components/common';
import {
  MEDICINE_DURATION_UNIT_OPTIONS,
  MEDICINE_FORM_CUSTOM_MAX,
  MEDICINE_FORM_OPTIONS,
  MEDICINE_FORM_OTHER,
  MEDICINE_FREQUENCY_CUSTOM_MAX,
  MEDICINE_FREQUENCY_OPTIONS,
  MEDICINE_FREQUENCY_OTHER,
  MEDICINE_INSTRUCTIONS_MAX,
  MEDICINE_ROUTE_CUSTOM_MAX,
  MEDICINE_ROUTE_OPTIONS,
  MEDICINE_ROUTE_OTHER,
  MEDICINE_TIMING_CUSTOM_MAX,
  MEDICINE_TIMING_OPTIONS,
  MEDICINE_TIMING_OTHER,
  isMedicineFormPreset,
  isMedicineFrequencyPreset,
  isMedicineRoutePreset,
  isMedicineTimingPreset,
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

const DEFAULT_REQUIRED_WHEN_NAMED = [
  'dosage',
  'form',
  'quantity',
  'frequency',
  'duration',
  'durationUnit',
  'route',
];

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
  requiredWhenNamed = null,
}) {
  const nameFilled = Boolean(String(medicine?.name ?? '').trim());
  const instrLen = String(medicine?.instructions ?? '').length;
  const requiredKeys = requiredWhenNamed ?? DEFAULT_REQUIRED_WHEN_NAMED;
  const markRequired = (key) =>
    Boolean(showRequiredHints && nameFilled && requiredKeys.includes(key));
  const starMedicineName = showRequiredHints && requiredWhenNamed == null;

  const formValue = String(medicine.form ?? '').trim();
  const formIsOther = Boolean(
    medicine.formOther
    || (formValue && !isMedicineFormPreset(formValue)),
  );
  const formSelectValue = formIsOther
    ? MEDICINE_FORM_OTHER
    : (medicine.form ?? '');

  const routeValue = String(medicine.route ?? '').trim();
  const routeIsOther = Boolean(
    medicine.routeOther
    || (routeValue && !isMedicineRoutePreset(routeValue)),
  );
  const routeSelectValue = routeIsOther
    ? MEDICINE_ROUTE_OTHER
    : (medicine.route ?? '');

  const frequencyValue = String(medicine.frequency ?? '').trim();
  const frequencyIsOther = Boolean(
    medicine.frequencyOther
    || (frequencyValue && !isMedicineFrequencyPreset(frequencyValue)),
  );
  const frequencySelectValue = frequencyIsOther
    ? MEDICINE_FREQUENCY_OTHER
    : (medicine.frequency ?? '');

  const timingValue = String(medicine.timing ?? '').trim();
  const timingIsOther = Boolean(
    medicine.timingOther
    || (timingValue && !isMedicineTimingPreset(timingValue)),
  );
  const timingSelectValue = timingIsOther
    ? MEDICINE_TIMING_OTHER
    : (medicine.timing ?? '');

  const patch = (partial) => {
    onChange({ ...medicine, ...partial });
  };

  const selectClass = (errorKey) =>
    `doc-med-row__select${fieldErrors[errorKey] ? ' doc-med-row__select--error' : ''}`;

  const onFormSelect = (value) => {
    if (value === MEDICINE_FORM_OTHER) {
      patch({
        form: formIsOther ? medicine.form : '',
        formOther: true,
      });
      return;
    }
    patch({ form: value, formOther: false });
  };

  const onRouteSelect = (value) => {
    if (value === MEDICINE_ROUTE_OTHER) {
      patch({
        route: routeIsOther ? medicine.route : '',
        routeOther: true,
      });
      return;
    }
    patch({ route: value, routeOther: false });
  };

  const onFrequencySelect = (value) => {
    if (value === MEDICINE_FREQUENCY_OTHER) {
      patch({
        frequency: frequencyIsOther ? medicine.frequency : '',
        frequencyOther: true,
      });
      return;
    }
    patch({ frequency: value, frequencyOther: false });
  };

  const onTimingSelect = (value) => {
    if (value === MEDICINE_TIMING_OTHER) {
      patch({
        timing: timingIsOther ? medicine.timing : '',
        timingOther: true,
      });
      return;
    }
    patch({ timing: value, timingOther: false });
  };

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
          label={starMedicineName ? 'Medicine *' : 'Medicine'}
          placeholder="Medicine name"
          value={medicine.name ?? ''}
          onChange={(e) => patch({ name: e.target.value })}
        />
        <Input
          className="doc-med-row__cell"
          label={markRequired('dosage') ? 'Strength *' : 'Strength'}
          placeholder="e.g. 500 mg"
          value={medicine.dosage ?? ''}
          onChange={(e) => patch({ dosage: e.target.value })}
          error={fieldErrors[`medDosage_${index}`]}
        />
      </div>

      <div className="doc-med-row__pair">
        <div className="doc-med-row__cell">
          <Label htmlFor={`med-form-${index}`}>
            {markRequired('form') ? 'Form *' : 'Form'}
          </Label>
          <select
            id={`med-form-${index}`}
            className={selectClass(`medForm_${index}`)}
            value={formSelectValue}
            onChange={(e) => onFormSelect(e.target.value)}
          >
            <option value="">Select…</option>
            {MEDICINE_FORM_OPTIONS.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
            <option value={MEDICINE_FORM_OTHER}>{MEDICINE_FORM_OTHER}</option>
          </select>
          {formIsOther ? (
            <>
              <Textarea
                className="doc-med-row__form-other"
                label="Custom form"
                placeholder="Describe form"
                rows={2}
                value={medicine.form ?? ''}
                onChange={(e) =>
                  patch({
                    form: e.target.value.slice(0, MEDICINE_FORM_CUSTOM_MAX),
                    formOther: true,
                  })
                }
              />
              <p className="doc-med-card__counter text-muted">
                {String(medicine.form ?? '').length}/{MEDICINE_FORM_CUSTOM_MAX}
              </p>
              {fieldErrors[`medForm_${index}`] ? (
                <p className="field__error">{fieldErrors[`medForm_${index}`]}</p>
              ) : null}
            </>
          ) : fieldErrors[`medForm_${index}`] ? (
            <p className="field__error">{fieldErrors[`medForm_${index}`]}</p>
          ) : null}
        </div>
        <Input
          className="doc-med-row__cell"
          label={markRequired('quantity') ? 'Quantity *' : 'Quantity'}
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
            {markRequired('frequency') ? 'Frequency *' : 'Frequency'}
          </Label>
          <select
            id={`med-freq-${index}`}
            className={selectClass(`medFrequency_${index}`)}
            value={frequencySelectValue}
            onChange={(e) => onFrequencySelect(e.target.value)}
          >
            <option value="">Select…</option>
            {MEDICINE_FREQUENCY_OPTIONS.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
            <option value={MEDICINE_FREQUENCY_OTHER}>{MEDICINE_FREQUENCY_OTHER}</option>
          </select>
          {frequencyIsOther ? (
            <>
              <Textarea
                className="doc-med-row__frequency-other"
                label="Custom frequency"
                placeholder="Describe frequency"
                rows={2}
                value={medicine.frequency ?? ''}
                onChange={(e) =>
                  patch({
                    frequency: e.target.value.slice(0, MEDICINE_FREQUENCY_CUSTOM_MAX),
                    frequencyOther: true,
                  })
                }
              />
              <p className="doc-med-card__counter text-muted">
                {String(medicine.frequency ?? '').length}/{MEDICINE_FREQUENCY_CUSTOM_MAX}
              </p>
              {fieldErrors[`medFrequency_${index}`] ? (
                <p className="field__error">{fieldErrors[`medFrequency_${index}`]}</p>
              ) : null}
            </>
          ) : fieldErrors[`medFrequency_${index}`] ? (
            <p className="field__error">{fieldErrors[`medFrequency_${index}`]}</p>
          ) : null}
        </div>
        <div className="doc-med-row__cell">
          <Label htmlFor={`med-timing-${index}`}>
            {markRequired('timing') ? 'Timing *' : 'Timing'}
          </Label>
          <select
            id={`med-timing-${index}`}
            className={selectClass(`medTiming_${index}`)}
            value={timingSelectValue}
            onChange={(e) => onTimingSelect(e.target.value)}
          >
            <option value="">Select…</option>
            {MEDICINE_TIMING_OPTIONS.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
            <option value={MEDICINE_TIMING_OTHER}>{MEDICINE_TIMING_OTHER}</option>
          </select>
          {timingIsOther ? (
            <>
              <Textarea
                className="doc-med-row__timing-other"
                label="Custom timing"
                placeholder="Describe timing"
                rows={2}
                value={medicine.timing ?? ''}
                onChange={(e) =>
                  patch({
                    timing: e.target.value.slice(0, MEDICINE_TIMING_CUSTOM_MAX),
                    timingOther: true,
                  })
                }
              />
              <p className="doc-med-card__counter text-muted">
                {String(medicine.timing ?? '').length}/{MEDICINE_TIMING_CUSTOM_MAX}
              </p>
              {fieldErrors[`medTiming_${index}`] ? (
                <p className="field__error">{fieldErrors[`medTiming_${index}`]}</p>
              ) : null}
            </>
          ) : fieldErrors[`medTiming_${index}`] ? (
            <p className="field__error">{fieldErrors[`medTiming_${index}`]}</p>
          ) : null}
        </div>
      </div>

      <div className="doc-med-row__pair">
        <Input
          className="doc-med-row__cell doc-med-row__duration-value"
          label={markRequired('duration') ? 'Duration *' : 'Duration'}
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
            {markRequired('durationUnit') ? 'Duration unit *' : 'Duration unit'}
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
            {markRequired('route') ? 'Route *' : 'Route'}
          </Label>
          <select
            id={`med-route-${index}`}
            className={selectClass(`medRoute_${index}`)}
            value={routeSelectValue}
            onChange={(e) => onRouteSelect(e.target.value)}
          >
            <option value="">Select…</option>
            {MEDICINE_ROUTE_OPTIONS.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
            <option value={MEDICINE_ROUTE_OTHER}>{MEDICINE_ROUTE_OTHER}</option>
          </select>
          {routeIsOther ? (
            <>
              <Textarea
                className="doc-med-row__route-other"
                label="Custom route"
                placeholder="Describe route"
                rows={2}
                value={medicine.route ?? ''}
                onChange={(e) =>
                  patch({
                    route: e.target.value.slice(0, MEDICINE_ROUTE_CUSTOM_MAX),
                    routeOther: true,
                  })
                }
              />
              <p className="doc-med-card__counter text-muted">
                {String(medicine.route ?? '').length}/{MEDICINE_ROUTE_CUSTOM_MAX}
              </p>
              {fieldErrors[`medRoute_${index}`] ? (
                <p className="field__error">{fieldErrors[`medRoute_${index}`]}</p>
              ) : null}
            </>
          ) : fieldErrors[`medRoute_${index}`] ? (
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

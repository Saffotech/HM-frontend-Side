const STEPS = ['form', 'bill', 'success'];
const LABELS = ['Details & Slot', 'Payment', 'Done'];

export default function RegisterPatientStepIndicator({ stage }) {
  return (
    <div className="steps">
      {STEPS.map((stepId, index) => (
        <span
          key={stepId}
          className={`step ${stage === stepId ? 'step--active' : STEPS.indexOf(stage) > index ? 'step--done' : ''}`}
        >
          {LABELS[index]}
        </span>
      ))}
    </div>
  );
}

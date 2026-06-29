import { Label, Input, Button, MoneyAmount } from '@/shared/components/common';
import { PAYMENT_MODES } from '@/shared/constants';
import { requiresTransactionReference } from '@/shared/utils/validators';

export default function OpdBillPaymentFooter({
  mode,
  setMode,
  setPaymentRef,
  payLater,
  setPayLater,
  amountReceived,
  setAmountReceived,
  paymentRef,
  fieldErrors,
  subtotal,
  tax,
  grandTotal,
  createBillPending,
  patientId,
  serviceReady,
  selectedPatient,
  patientApptsFetched,
}) {
  return (
    <div className="opd-form__footer">
      <div className="opd-form__payment-col">
        <Label>Payment Mode</Label>
        <div className="mode-buttons">
          {PAYMENT_MODES.map((m) => (
            <button
              key={m}
              type="button"
              className={`mode-btn ${mode === m ? 'mode-btn--active' : ''}`}
              onClick={() => {
                setMode(m);
                if (!requiresTransactionReference(m)) setPaymentRef('');
              }}
            >
              {m}
            </button>
          ))}
        </div>

        <label className="opd-pay-later">
          <input
            type="checkbox"
            checked={payLater}
            onChange={(e) => setPayLater(e.target.checked)}
          />
          Pay later (no payment now)
        </label>

        {!payLater && (
          <>
            <Input
              label="Amount Received (₹)"
              type="number"
              min={0}
              max={grandTotal}
              step="0.01"
              value={amountReceived}
              onChange={(e) => setAmountReceived(e.target.value)}
              placeholder={`Max ${grandTotal}`}
            />
            {requiresTransactionReference(mode) && (
              <Input
                label="Transaction / Reference No"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                error={fieldErrors.paymentRef}
                placeholder="e.g. UPI ref or card auth code"
              />
            )}
          </>
        )}
      </div>

      <div className="bill-summary-box">
        <h4>Bill Summary</h4>
        <div className="bill-summary-row">
          <span>Subtotal</span>
          <MoneyAmount amount={subtotal} />
        </div>
        <div className="bill-summary-row">
          <span>Tax (5%)</span>
          <MoneyAmount amount={tax} />
        </div>
        <div className="bill-summary-row bill-summary-row--total">
          <span>Grand Total</span>
          <MoneyAmount amount={grandTotal} strong />
        </div>
        {!payLater && (
          <>
            <div className="bill-summary-row">
              <span>Receiving now</span>
              <MoneyAmount amount={Number(amountReceived) || 0} />
            </div>
            <div className="bill-summary-row bill-summary-row--due">
              <span>Balance after save</span>
              <MoneyAmount
                amount={Math.max(0, grandTotal - (Number(amountReceived) || 0))}
                strong
              />
            </div>
          </>
        )}
        <Button
          type="submit"
          className="btn--block"
          size="lg"
          disabled={
            createBillPending ||
            !patientId ||
            !serviceReady ||
            (Boolean(selectedPatient) && !patientApptsFetched)
          }
        >
          {createBillPending ? 'Saving...' : 'Generate & Save Bill'}
        </Button>
      </div>
    </div>
  );
}

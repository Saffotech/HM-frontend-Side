import { ArrowRight } from 'lucide-react';
import { Button, MoneyAmount } from '@/shared/components/common';

export default function OpdBillItemsStepFooter({
  subtotal,
  tax,
  grandTotal,
  gstPercent = 5,
  onContinue,
  disabled,
}) {
  return (
    <div className="opd-bill-items-footer">
      <div className="opd-bill-items-footer__totals">
        <div className="opd-bill-items-footer__row">
          <span>Subtotal</span>
          <MoneyAmount amount={subtotal} />
        </div>
        <div className="opd-bill-items-footer__row">
          <span>Tax ({Number.isFinite(Number(gstPercent)) ? Number(gstPercent) : 5}%)</span>
          <MoneyAmount amount={tax} />
        </div>
        <div className="opd-bill-items-footer__row opd-bill-items-footer__row--total">
          <span>Grand Total</span>
          <MoneyAmount amount={grandTotal} strong />
        </div>
      </div>
      <Button
        type="button"
        size="lg"
        className="opd-bill-items-footer__btn"
        onClick={onContinue}
        disabled={disabled}
      >
        Continue to Payment <ArrowRight size={18} />
      </Button>
    </div>
  );
}

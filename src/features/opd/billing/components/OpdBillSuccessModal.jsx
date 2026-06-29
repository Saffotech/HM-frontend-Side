import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Printer, LayoutList } from 'lucide-react';
import { Button, Modal, MoneyAmount } from '@/shared/components/common';
import { ROUTES } from '@/shared/constants';

export default function OpdBillSuccessModal({ successBill, onClose }) {
  const navigate = useNavigate();

  return (
    <Modal
      isOpen={!!successBill}
      onClose={onClose}
      size="sm"
      title=""
      footer={
        successBill ? (
          <div className="bill-success-modal__actions">
            <Button
              variant="outline"
              className="bill-success-modal__btn"
              onClick={onClose}
            >
              <LayoutList size={18} aria-hidden />
              Go to Billing
            </Button>
            <Button
              className="bill-success-modal__btn bill-success-modal__btn--primary"
              onClick={() => navigate(`${ROUTES.BILLING}/${successBill.id}`)}
            >
              <Printer size={18} aria-hidden />
              View / Print Bill
            </Button>
          </div>
        ) : null
      }
    >
      {successBill && (
        <div className="bill-success-modal">
          <div className="bill-success-modal__icon-wrap" aria-hidden>
            <CheckCircle2 size={36} strokeWidth={2.25} />
          </div>
          <p className="bill-success-modal__eyebrow">Bill saved</p>
          <h3 className="bill-success-modal__title">Generated successfully</h3>
          <p className="bill-success-modal__subtitle">
            Invoice is ready for {successBill.patientName}.
          </p>

          <div className="bill-success-modal__id-chip">
            <span className="bill-success-modal__id-label">Bill ID</span>
            <strong>{successBill.id}</strong>
          </div>

          <dl className="bill-success-modal__details">
            <div>
              <dt>Grand total</dt>
              <dd>
                <MoneyAmount amount={successBill.grandTotal} strong />
              </dd>
            </div>
            <div>
              <dt>Amount received</dt>
              <dd>
                <MoneyAmount amount={successBill.paid} />
              </dd>
            </div>
            {successBill.balance > 0 && (
              <div className="bill-success-modal__details--due">
                <dt>Balance due</dt>
                <dd>
                  <MoneyAmount amount={successBill.balance} strong />
                </dd>
              </div>
            )}
            {successBill.paymentMode && (
              <div>
                <dt>Payment mode</dt>
                <dd>{successBill.paymentMode}</dd>
              </div>
            )}
          </dl>

          <span
            className={`bill-success-modal__status bill-success-modal__status--${successBill.status.toLowerCase()}`}
          >
            {successBill.status}
          </span>
        </div>
      )}
    </Modal>
  );
}

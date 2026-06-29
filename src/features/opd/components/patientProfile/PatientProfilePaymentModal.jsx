import { Button, Modal, MoneyAmount } from '@/shared/components/common';
import { billCollectedAmount } from '@/shared/utils/billHelpers';

export default function PatientProfilePaymentModal({
  paymentDetailVisit,
  onClose,
  paymentInvoice,
  loadingPayment,
  errorPayment,
  paymentError,
}) {
  return (
    <Modal
      isOpen={paymentDetailVisit != null}
      onClose={onClose}
      title={
        paymentDetailVisit
          ? `Payment Details — Visit ${paymentDetailVisit.visitNum}`
          : 'Payment Details'
      }
      size="lg"
      overlayClassName="pp-payment-modal-overlay"
      panelClassName="pp-payment-modal"
      footer={
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
      }
    >
      {paymentDetailVisit && (
        <div className="pp-payment-detail">
          <div className="pp-payment-detail__meta">
            <span>{paymentDetailVisit.visit.visitDate}</span>
            {paymentDetailVisit.visit.visitTime && (
              <span> · {paymentDetailVisit.visit.visitTime}</span>
            )}
            <span> · {paymentDetailVisit.visit.billNumber}</span>
          </div>
          {loadingPayment ? (
            <p className="pp-payment-detail__status">Loading bill breakdown…</p>
          ) : errorPayment ? (
            <p className="pp-payment-detail__status pp-payment-detail__status--error">
              {paymentError?.message ?? 'Could not load payment details.'}
            </p>
          ) : paymentInvoice?.items?.length ? (
            <>
              <div className="pp-payment-detail__table-wrap">
                <table className="pp-payment-detail__table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Description</th>
                      <th>Qty</th>
                      <th className="col-money">Unit Price</th>
                      <th className="col-money">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentInvoice.items.map((item, i) => (
                      <tr key={`${item.name}-${i}`}>
                        <td>{i + 1}</td>
                        <td>{item.name}</td>
                        <td className="text-center">{item.qty}</td>
                        <td className="col-money">
                          <MoneyAmount amount={item.unitPrice} />
                        </td>
                        <td className="col-money">
                          <MoneyAmount
                            amount={item.amount ?? item.qty * item.unitPrice}
                            strong
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="pp-payment-detail__summary">
                <div className="pp-payment-detail__summary-row">
                  <span>Grand Total</span>
                  <MoneyAmount
                    amount={paymentInvoice.total ?? paymentDetailVisit.visit.grandTotal}
                    strong
                  />
                </div>
                <div className="pp-payment-detail__summary-row">
                  <span>Paid</span>
                  <MoneyAmount
                    amount={
                      paymentInvoice.paid ??
                      billCollectedAmount(
                        paymentDetailVisit.visit.grandTotal,
                        paymentDetailVisit.visit.balanceDue,
                        paymentDetailVisit.visit.paidAmount
                      )
                    }
                    strong
                  />
                </div>
                <div className="pp-payment-detail__summary-row">
                  <span>Balance</span>
                  <MoneyAmount
                    amount={paymentInvoice.balance ?? paymentDetailVisit.visit.balanceDue}
                    strong
                  />
                </div>
                {paymentInvoice.paymentMode && (
                  <div className="pp-payment-detail__summary-row">
                    <span>Payment Mode</span>
                    <span>{paymentInvoice.paymentMode}</span>
                  </div>
                )}
              </div>
              {paymentInvoice.payments?.length > 0 && (
                <div className="pp-payment-detail__history">
                  <h4 className="pp-payment-detail__history-title">Payment History</h4>
                  <ul className="pp-payment-detail__history-list">
                    {paymentInvoice.payments.map((p, i) => (
                      <li key={`${p.date}-${p.mode}-${i}`}>
                        <span>{p.date}</span>
                        <span className="pp-payment-detail__mode">{p.mode}</span>
                        <MoneyAmount amount={p.amount} strong />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <p className="pp-payment-detail__status">
              No line items found for this bill.
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}

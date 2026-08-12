/**
 * IPD bill view / print — same invoice layout as OPD View Bill.
 */

import { useEffect } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { Button, QueryFeedback } from '@/shared/components/common';
import { ROUTES } from '@/shared/constants';
import IpdBillPrintSheet from '@/features/ipd/components/IpdBillPrintSheet';
import { useIpdBillInvoiceQuery } from '@/features/ipd/hooks/useIpdQuery';
import '@/features/opd/billing/pages/ViewBillPage.css';

export default function IpdViewBillPage() {
  const { billId } = useParams();
  const [searchParams] = useSearchParams();
  const autoPrint = searchParams.get('print') === '1';
  const invoiceQuery = useIpdBillInvoiceQuery(billId);
  const raw = invoiceQuery.data;

  useEffect(() => {
    if (!autoPrint || !raw) return undefined;
    const timer = window.setTimeout(() => window.print(), 400);
    return () => window.clearTimeout(timer);
  }, [autoPrint, raw]);

  if (invoiceQuery.isLoading || invoiceQuery.isError) {
    return (
      <div className="ipd-page">
        <QueryFeedback
          isLoading={invoiceQuery.isLoading}
          isError={invoiceQuery.isError}
          error={invoiceQuery.error}
          onRetry={invoiceQuery.refetch}
        />
      </div>
    );
  }

  if (!raw) {
    return <div className="empty-state">Bill not found</div>;
  }

  return (
    <div className="view-bill page-container">
      <div className="view-bill__actions no-print">
        <div className="view-bill__actions-left">
          <Link to={ROUTES.IPD_PAYMENT_HISTORY}>
            <Button variant="outline" size="sm">
              <ArrowLeft size={16} /> Back
            </Button>
          </Link>
          <h2>Bill Details — {raw.bill_number}</h2>
        </div>
        <div className="view-bill__actions-right">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer size={16} /> Print
          </Button>
        </div>
      </div>

      <IpdBillPrintSheet invoice={raw} />
    </div>
  );
}

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, CalendarDays, Receipt, Stethoscope, UserPlus } from 'lucide-react';
import { DataTableShell, MoneyAmount, Tabs } from '@/shared/components/common';
import CollectPaymentModal from '@/features/opd/billing/components/CollectPaymentModal';
import { ROUTES } from '@/shared/constants';
import PanelState from './PanelState';
import RegistrationsTable from './sections/RegistrationsTable';
import AppointmentsTable from './sections/AppointmentsTable';
import VisitsTable from './sections/VisitsTable';
import BillsTable from './sections/BillsTable';

const TABLE_MAX_HEIGHT = '27rem';

/**
 * Sections 2–5 live in one console: four peer lists of today's front-desk
 * activity, switched by tab instead of stacked as four separate cards.
 */
export default function ActivityPanel({ sections, revenue }) {
  const [activeTab, setActiveTab] = useState('registrations');
  const [collectBillId, setCollectBillId] = useState(null);

  const registrations = sections.registrations.rows ?? [];
  const appointments = sections.appointments.rows ?? [];
  const visits = sections.visits.rows ?? [];
  const bills = sections.billing.rows ?? [];

  const views = {
    registrations: {
      section: sections.registrations,
      rows: registrations,
      link: { to: ROUTES.PATIENTS, label: 'All patients' },
      empty: {
        icon: UserPlus,
        title: 'No registrations yet today',
        description: 'New patients registered at the front desk will appear here.',
      },
      table: <RegistrationsTable rows={registrations} />,
    },
    appointments: {
      section: sections.appointments,
      rows: appointments,
      link: { to: ROUTES.APPOINTMENTS, label: 'All appointments' },
      empty: {
        icon: CalendarDays,
        title: 'No appointments for today',
        description: 'Appointments booked for today will be listed here.',
      },
      table: <AppointmentsTable rows={appointments} />,
    },
    visits: {
      section: sections.visits,
      rows: visits,
      link: { to: ROUTES.BILLING_OPD_NEW, label: 'New OPD bill' },
      empty: {
        icon: Stethoscope,
        title: 'No OPD visits yet today',
        description: 'Visits appear here as soon as a patient is registered at the counter.',
      },
      table: <VisitsTable rows={visits} />,
    },
    bills: {
      section: sections.billing,
      rows: bills,
      link: { to: ROUTES.BILLING, label: 'All bills' },
      empty: {
        icon: Receipt,
        title: 'No bills generated today',
        description: 'Bills raised at the counter today will be summarised here.',
      },
      table: <BillsTable rows={bills} onCollect={setCollectBillId} />,
    },
  };

  const tabs = [
    { id: 'registrations', label: 'Registrations', icon: UserPlus, count: registrations.length },
    { id: 'appointments', label: 'Appointments', icon: CalendarDays, count: appointments.length },
    { id: 'visits', label: 'OPD Visits', icon: Stethoscope, count: visits.length },
    { id: 'bills', label: 'Bills', icon: Receipt, count: bills.length },
  ];

  const view = views[activeTab];
  const billingStrip = [
    { key: 'generated', label: 'Generated', value: sections.billing.generated ?? 0 },
    { key: 'paid', label: 'Fully paid', value: sections.billing.paid ?? 0 },
    { key: 'partial', label: 'Partial', value: sections.billing.partial ?? 0 },
    { key: 'pending', label: 'Pending', value: sections.billing.pending ?? 0 },
    { key: 'billed', label: 'Billed', value: <MoneyAmount amount={revenue} exact /> },
  ];

  return (
    <>
      <section className="card today-overview__activity">
        <div className="today-overview__activity-bar">
          <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
          <Link to={view.link.to} className="today-overview__link">
            {view.link.label}
            <ArrowUpRight size={14} aria-hidden />
          </Link>
        </div>

        {activeTab === 'bills' ? (
          <div className="today-overview__strip">
            {billingStrip.map((item) => (
              <div key={item.key} className="today-overview__strip-item">
                <span className="today-overview__strip-label">{item.label}</span>
                <span className="today-overview__strip-value">{item.value}</span>
              </div>
            ))}
          </div>
        ) : null}

        <PanelState
          isLoading={view.section.isLoading}
          isError={view.section.isError}
          error={view.section.error}
          isEmpty={view.rows.length === 0}
          emptyIcon={view.empty.icon}
          emptyTitle={view.empty.title}
          emptyDescription={view.empty.description}
          skeletonRows={6}
        >
          <DataTableShell maxHeight={TABLE_MAX_HEIGHT}>{view.table}</DataTableShell>
        </PanelState>
      </section>

      <CollectPaymentModal
        open={collectBillId != null}
        onClose={() => setCollectBillId(null)}
        defaultBillId={collectBillId ?? undefined}
      />
    </>
  );
}

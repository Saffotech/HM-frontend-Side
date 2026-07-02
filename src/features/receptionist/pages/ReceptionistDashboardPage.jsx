import ReceptionistLayout from '@/features/receptionist/components/ReceptionistLayout';

export default function ReceptionistDashboardPage() {
  return (
    <ReceptionistLayout>
      <div className="receptionist-dashboard">
        <div className="receptionist-dashboard__card">
          <p className="receptionist-dashboard__eyebrow">Reception module</p>
          <h1 className="receptionist-dashboard__title">Work in progress</h1>
          <p className="receptionist-dashboard__text">
            The receptionist dashboard is being built. Check back soon for front-desk
            workflows, appointments, and patient check-in.
          </p>
        </div>
      </div>
    </ReceptionistLayout>
  );
}

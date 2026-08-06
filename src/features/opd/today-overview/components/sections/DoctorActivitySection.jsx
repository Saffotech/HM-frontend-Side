import { UserCog } from 'lucide-react';
import { DataTableShell } from '@/shared/components/common';
import OverviewSection from '../OverviewSection';

export default function DoctorActivitySection({ section }) {
  const rows = section.rows ?? [];
  const busiest = rows.reduce((max, row) => Math.max(max, row.seen), 0);

  return (
    <OverviewSection
      title="Doctor Activity"
      icon={UserCog}
      subtitle="Consultation load per doctor today"
      isLoading={section.isLoading}
      isError={section.isError}
      error={section.error}
      isEmpty={rows.length === 0}
      emptyIcon={UserCog}
      emptyTitle="No doctor activity yet today"
      emptyDescription="Once patients are booked or registered, per-doctor activity shows here."
      skeletonRows={3}
    >
      <DataTableShell maxHeight="20rem">
        <table className="data-table">
          <thead>
            <tr>
              <th>Doctor</th>
              <th className="today-overview__col-load">Patients Seen</th>
              <th className="today-overview__col-num">Waiting</th>
              <th className="today-overview__col-num">Completed</th>
              <th className="today-overview__col-num col-optional">Visits</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.doctor}>
                <td className="text-teal">{row.doctor}</td>
                <td className="today-overview__col-load">
                  <div className="today-overview__load">
                    <span className="today-overview__load-value">{row.seen}</span>
                    <span className="today-overview__load-track">
                      <span
                        className="today-overview__load-fill"
                        style={{ width: `${busiest > 0 ? (row.seen / busiest) * 100 : 0}%` }}
                      />
                    </span>
                  </div>
                </td>
                <td className="today-overview__col-num">{row.waiting}</td>
                <td className="today-overview__col-num">{row.completed}</td>
                <td className="today-overview__col-num col-optional">{row.registered}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </DataTableShell>
    </OverviewSection>
  );
}

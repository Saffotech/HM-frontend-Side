import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Calendar,
  Receipt,
  Phone,
  Droplet,
  Pencil,
  Trash2,
} from 'lucide-react';
import { Avatar, Button, MoneyAmount } from '@/shared/components/common';
import { ROUTES } from '@/shared/constants';

export default function PatientProfileHeader({
  patient,
  id,
  registeredDateDisplay,
  totalVisits,
  totalBilled,
  totalPaid,
  outstanding,
  onBack,
  onDelete,
}) {
  return (
    <>
      <div className="pp-toolbar">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft size={16} /> Back
        </Button>
        <span className="pp-toolbar__id">{patient.id}</span>
      </div>

      <header className="pp-hero">
        <div className="pp-hero__identity">
          <div className="pp-hero__avatar-wrap">
            <Avatar name={patient.name} size={72} />
          </div>
          <div className="pp-hero__text">
            <h1 className="pp-hero__name">{patient.name}</h1>
            <div className="pp-hero__meta">
              {patient.phone && (
                <span className="pp-chip">
                  <Phone size={13} aria-hidden />
                  {patient.phone}
                </span>
              )}
              {patient.gender && (
                <span className="pp-chip">
                  <User size={13} aria-hidden />
                  {patient.gender}
                </span>
              )}
              {patient.bloodGroup && (
                <span className="pp-chip pp-chip--blood">
                  <Droplet size={13} aria-hidden />
                  {patient.bloodGroup}
                </span>
              )}
              {registeredDateDisplay && (
                <span className="pp-chip pp-chip--muted">Since {registeredDateDisplay}</span>
              )}
            </div>
          </div>
        </div>
        <div className="pp-hero__actions">
          <Link to={`/patients/${id}/update`} className="pp-action-link">
            <Button variant="outline" size="sm">
              <Pencil size={15} /> Edit
            </Button>
          </Link>
          <Link to={`${ROUTES.BILLING_OPD_NEW}?patientId=${id}`} className="pp-action-link">
            <Button size="sm">
              <Receipt size={15} /> Bill
            </Button>
          </Link>
          <Button variant="danger" size="sm" onClick={onDelete}>
            <Trash2 size={15} /> Delete
          </Button>
        </div>
      </header>

      <div className="pp-kpis">
        <div className="pp-kpi pp-kpi--blue">
          <span className="pp-kpi__icon" aria-hidden><Calendar size={18} /></span>
          <div>
            <p className="pp-kpi__label">OPD Visits</p>
            <p className="pp-kpi__value">{totalVisits}</p>
          </div>
        </div>
        <div className="pp-kpi pp-kpi--indigo">
          <span className="pp-kpi__icon" aria-hidden><Receipt size={18} /></span>
          <div>
            <p className="pp-kpi__label">Total Billed</p>
            <p className="pp-kpi__value">
              <MoneyAmount amount={totalBilled} compact />
            </p>
          </div>
        </div>
        <div className="pp-kpi pp-kpi--green">
          <span className="pp-kpi__icon" aria-hidden><Receipt size={18} /></span>
          <div>
            <p className="pp-kpi__label">Collected</p>
            <p className="pp-kpi__value">
              <MoneyAmount amount={totalPaid} compact />
            </p>
          </div>
        </div>
        <div className={`pp-kpi ${outstanding > 0 ? 'pp-kpi--amber' : 'pp-kpi--green'}`}>
          <span className="pp-kpi__icon" aria-hidden><Receipt size={18} /></span>
          <div>
            <p className="pp-kpi__label">Pending</p>
            <p className="pp-kpi__value">
              <MoneyAmount amount={outstanding} compact />
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

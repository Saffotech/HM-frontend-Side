import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { MoreHorizontal, FileText, Pill, StickyNote, Stethoscope } from 'lucide-react';
import { Button } from '@/shared/components/common';
import { usePermission } from '@/hooks/usePermission';
import { ACTIONS } from '@/hooks/permissions';
import './AppointmentRowActions.css';

function getRowBounds(rootEl) {
  const row = rootEl.closest('tr') ?? rootEl.closest('.doc-card');
  return row?.getBoundingClientRect() ?? rootEl.getBoundingClientRect();
}

export default function AppointmentRowActions({
  appointment,
  patient,
  onConsult,
  onEmr,
  onPrescribe,
  onNotes,
  disabled = false,
  mode = 'full',
}) {
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState('left');
  const [menuMaxWidth, setMenuMaxWidth] = useState(null);

  const rootRef = useRef(null);
  const anchorRef = useRef(null);
  const menuRef = useRef(null);
  const canWritePrescription = appointment?.status === 'Completed';
  const canStartConsult =
    appointment?.status !== 'Completed' && appointment?.status !== 'Cancelled';
  const canConsult = usePermission(ACTIONS.CONSULT);
  const canEmr = usePermission(ACTIONS.VIEW_EMR);
  const canPrescribe = usePermission(ACTIONS.PRESCRIBE);
  const canNotes = usePermission(ACTIONS.CLINICAL_NOTES);

  const updatePlacement = () => {
    const menu = menuRef.current;
    const anchor = anchorRef.current;
    const root = rootRef.current;
    if (!menu || !anchor || !root) return;

    const prevVisibility = menu.style.visibility;
    const prevDisplay = menu.style.display;
    menu.style.visibility = 'hidden';
    menu.style.display = 'flex';
    menu.style.maxWidth = 'none';
    const menuWidth = menu.scrollWidth;
    menu.style.visibility = prevVisibility;
    menu.style.display = prevDisplay;

    const anchorRect = anchor.getBoundingClientRect();
    const bounds = getRowBounds(root);
    const pad = 8;
    const spaceLeft = anchorRect.left - bounds.left - pad;
    const spaceRight = bounds.right - anchorRect.right - pad;

    let side = 'left';
    let maxW = spaceLeft;

    if (spaceLeft >= menuWidth) {
      side = 'left';
      maxW = spaceLeft;
    } else if (spaceRight >= menuWidth) {
      side = 'right';
      maxW = spaceRight;
    } else if (spaceRight > spaceLeft) {
      side = 'right';
      maxW = spaceRight;
    } else {
      side = 'left';
      maxW = spaceLeft;
    }

    setPlacement(side);
    setMenuMaxWidth(Math.max(96, Math.floor(maxW)));
  };

  useLayoutEffect(() => {
    if (!open) {
      setPlacement('left');
      setMenuMaxWidth(null);
      return;
    }
    updatePlacement();
    window.addEventListener('resize', updatePlacement);
    return () => window.removeEventListener('resize', updatePlacement);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const pick = (fn) => {
    setOpen(false);
    fn();
  };

  const showConsult =
    canConsult
    && canStartConsult
    && (mode === 'full' || mode === 'waiting' || mode === 'in_progress');
  const showEmr = canEmr && mode === 'full';
  const showPrescribe = canPrescribe && mode === 'full';
  const showNotes = canNotes && (mode === 'full' || mode === 'in_progress');

  if (mode === 'waiting' || mode === 'in_progress') {
    return (
      <div className="doc-appt-actions doc-appt-actions--compact">
        <div className="doc-appt-actions__bar">
          {showConsult ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={disabled}
              onClick={() => onConsult(appointment)}
            >
              <Stethoscope size={14} aria-hidden />
              Consult
            </Button>
          ) : null}
          {showNotes ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onNotes(appointment)}
            >
              <StickyNote size={14} aria-hidden />
              Notes
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className={`doc-appt-actions doc-appt-actions--compact${open ? ' doc-appt-actions--open' : ''}`} ref={rootRef}>
      <div className="doc-appt-actions__bar">
        <div className="doc-appt-actions__anchor" ref={anchorRef}>
          {open && (
            <div
              ref={menuRef}
              className={`doc-appt-actions__menu doc-appt-actions__menu--${placement}`}
              role="menu"
              aria-label="More actions"
              style={menuMaxWidth != null ? { maxWidth: menuMaxWidth } : undefined}
            >
              {showConsult && (
                <button
                  type="button"
                  role="menuitem"
                  className="doc-appt-actions__item"
                  disabled={disabled}
                  onClick={() => pick(() => onConsult(appointment))}
                >
                  <Stethoscope size={14} aria-hidden />
                  Consult
                </button>
              )}
              {showEmr && (
                <button
                  type="button"
                  role="menuitem"
                  className="doc-appt-actions__item"
                  disabled={!patient}
                  title="Medical records & history"
                  onClick={() => patient && pick(() => onEmr(patient))}
                >
                  <FileText size={14} aria-hidden />
                  EMR
                </button>
              )}
              {showPrescribe && (
                <button
                  type="button"
                  role="menuitem"
                  className="doc-appt-actions__item"
                  disabled={!patient || !canWritePrescription}
                  title={
                    canWritePrescription
                      ? 'Write prescription for completed visit'
                      : 'Complete the consultation before writing a prescription'
                  }
                  onClick={() =>
                    patient && canWritePrescription && pick(() => onPrescribe(patient, appointment))
                  }
                >
                  <Pill size={14} aria-hidden />
                  Write Prescription
                </button>
              )}
              {showNotes && (
                <button
                  type="button"
                  role="menuitem"
                  className="doc-appt-actions__item"
                  title="Add clinical note"
                  onClick={() => pick(() => onNotes(appointment))}
                >
                  <StickyNote size={14} aria-hidden />
                  Notes
                </button>
              )}
            </div>
          )}

          {(showEmr || showPrescribe || showNotes || showConsult) && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={`doc-appt-actions__menu-btn${open ? ' doc-appt-actions__menu-btn--active' : ''}`}
            aria-expanded={open}
            aria-haspopup="menu"
            aria-label={open ? 'Hide more actions' : 'More actions'}
            onClick={() => setOpen((v) => !v)}
          >
            <MoreHorizontal size={16} aria-hidden />
          </Button>
          )}
        </div>
      </div>
    </div>
  );
}

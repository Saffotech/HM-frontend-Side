import { useMemo } from 'react';
import './TimeSlotGrid.css';

const FALLBACK_SLOTS = [
  '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM',
  '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM',
  '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM',
  '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM',
];

function buildFallbackSlots(date, doctorId) {
  if (!date || !doctorId) {
    return FALLBACK_SLOTS.map((time) => ({ time, available: true }));
  }
  const seedString = `${date.toISOString?.() || date}-${doctorId}`;
  let hash = 0;
  for (let i = 0; i < seedString.length; i++) {
    hash = seedString.charCodeAt(i) + ((hash << 5) - hash);
  }
  const random = () => {
    const x = Math.sin(hash++) * 10000;
    return x - Math.floor(x);
  };
  return FALLBACK_SLOTS.map((time) => ({ time, available: random() > 0.3 }));
}

export default function TimeSlotGrid({
  date,
  doctorId,
  selectedTime,
  onSelectTime,
  apiSlots = null,
  slotsLoading = false,
  slotsError = null,
  useApiSlots = true,
  className = '',
}) {
  const slots = useMemo(() => {
    if (useApiSlots && apiSlots != null) {
      return apiSlots;
    }
    return buildFallbackSlots(date, doctorId);
  }, [apiSlots, date, doctorId, useApiSlots]);

  if (!date || !doctorId) return null;

  if (slotsLoading) {
    return <p className="time-slot-grid__message text-muted">Loading available slots…</p>;
  }

  if (slotsError) {
    return (
      <p className="time-slot-grid__message time-slot-grid__message--error">
        Could not load slots. Try another date or doctor.
      </p>
    );
  }

  if (!slots.length) {
    return (
      <p className="time-slot-grid__message text-muted">
        No slots available for this date.
      </p>
    );
  }

  return (
    <div className={`time-slot-grid ${className}`.trim()}>
      {slots.map(({ time, available }) => {
        const isSelected = selectedTime === time;
        return (
          <button
            key={`${time}-${available}`}
            type="button"
            disabled={!available}
            onClick={() => onSelectTime && onSelectTime(time)}
            className={`time-slot ${!available ? 'time-slot--disabled' : ''} ${isSelected ? 'time-slot--selected' : ''}`}
          >
            {time}
          </button>
        );
      })}
    </div>
  );
}

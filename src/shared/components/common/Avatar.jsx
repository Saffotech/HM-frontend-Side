import { useMemo } from 'react';
import './Avatar.css';

const COLORS = [
  'avatar--blue',
  'avatar--teal',
  'avatar--purple',
  'avatar--green',
  'avatar--amber',
  'avatar--rose',
];

export default function Avatar({ name, size = 40, className = '' }) {
  const { initials, colorClass } = useMemo(() => {
    const parts = name.trim().split(' ');
    let init = '?';
    if (parts.length > 1) {
      init = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    } else if (parts.length === 1 && parts[0]) {
      init = parts[0].substring(0, 2).toUpperCase();
    }
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return { initials: init, colorClass: COLORS[Math.abs(hash) % COLORS.length] };
  }, [name]);

  return (
    <div
      className={`avatar ${colorClass} ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      title={name}
    >
      {initials}
    </div>
  );
}

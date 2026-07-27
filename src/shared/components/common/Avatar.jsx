import { useEffect, useMemo, useState } from 'react';
import './Avatar.css';

const COLORS = [
  'avatar--blue',
  'avatar--teal',
  'avatar--purple',
  'avatar--green',
  'avatar--amber',
  'avatar--rose',
];

export default function Avatar({ name = '', src = null, size = 40, className = '' }) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [src]);

  const { initials, colorClass } = useMemo(() => {
    const safeName = String(name || '').trim() || 'User';
    const parts = safeName.split(/\s+/).filter(Boolean);
    let init = '?';
    if (parts.length > 1) {
      init = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    } else if (parts.length === 1 && parts[0]) {
      init = parts[0].substring(0, 2).toUpperCase();
    }
    let hash = 0;
    for (let i = 0; i < safeName.length; i++) {
      hash = safeName.charCodeAt(i) + ((hash << 5) - hash);
    }
    return { initials: init, colorClass: COLORS[Math.abs(hash) % COLORS.length] };
  }, [name]);

  const showImage = Boolean(src) && !imageFailed;

  return (
    <div
      className={`avatar ${showImage ? 'avatar--image' : colorClass} ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      title={name}
    >
      {showImage ? (
        <img
          src={src}
          alt=""
          className="avatar__img"
          onError={() => setImageFailed(true)}
        />
      ) : (
        initials
      )}
    </div>
  );
}

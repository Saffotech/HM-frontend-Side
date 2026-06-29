import './Skeleton.css';

/**
 * Lightweight shimmer placeholder.
 * @param {{ className?: string, width?: string|number, height?: string|number, circle?: boolean }} props
 */
export default function Skeleton({ className = '', width, height = '1rem', circle = false }) {
  const style = {};
  if (width != null) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height != null) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <span
      className={`skeleton ${circle ? 'skeleton--circle' : ''} ${className}`.trim()}
      style={style}
      aria-hidden
    />
  );
}

/** Default page loading skeleton for list/dashboard views */
export function PageSkeleton({ rows = 6 }) {
  return (
    <div className="skeleton-page" aria-busy="true" aria-label="Loading">
      <Skeleton height={32} width="40%" />
      <div className="skeleton-grid skeleton-grid--4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} height={72} />
        ))}
      </div>
      <Skeleton height={280} />
      {rows > 0 && (
        <div className="skeleton-stack">
          {Array.from({ length: rows }).map((_, i) => (
            <Skeleton key={i} height={40} />
          ))}
        </div>
      )}
    </div>
  );
}

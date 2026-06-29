import './Label.css';

export default function Label({ children, htmlFor, className = '' }) {
  return (
    <label htmlFor={htmlFor} className={`form-label ${className}`}>
      {children}
    </label>
  );
}

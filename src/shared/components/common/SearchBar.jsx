import { Search, X } from 'lucide-react';
import './SearchBar.css';

export default function SearchBar({
  value,
  onChange,
  placeholder = 'Search...',
  className = '',
  onClear,
}) {
  return (
    <div className={`search-bar ${className}`}>
      <Search size={16} className="search-bar__icon" aria-hidden />
      <input
        type="search"
        className="search-bar__input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={placeholder}
      />
      {value && (
        <button
          type="button"
          className="search-bar__clear"
          onClick={() => (onClear ? onClear() : onChange(''))}
          aria-label="Clear search"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

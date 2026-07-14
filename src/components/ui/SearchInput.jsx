import { Search, X, Loader2 } from 'lucide-react';
import '@/shared/components/common/SearchBar.css';
import './SearchInput.css';

/**
 * Unified search field — icon, clear, optional loading.
 */
export default function SearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  className = '',
  onClear,
  loading = false,
  disabled = false,
  id,
  name,
}) {
  return (
    <div className={`search-bar ui-search ${className}`.trim()}>
      {loading ? (
        <Loader2 size={16} className="search-bar__icon ui-search__spinner" aria-hidden />
      ) : (
        <Search size={16} className="search-bar__icon" aria-hidden />
      )}
      <input
        id={id}
        name={name}
        type="search"
        className="search-bar__input"
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        aria-label={placeholder}
      />
      {value && !disabled && (
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

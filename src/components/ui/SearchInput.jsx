import { X, Loader2 } from 'lucide-react';
import '@/shared/components/common/SearchBar.css';
import './SearchInput.css';

/**
 * Unified search field — clear, optional loading.
 * Use type="text" (not "search") so browser native clear doesn't fight
 * our custom clear button or block backspace/continuous typing.
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
      ) : null}
      <input
        id={id}
        name={name}
        type="text"
        inputMode="search"
        autoComplete="off"
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

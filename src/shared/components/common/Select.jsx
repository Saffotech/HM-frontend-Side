import SearchableSelect from './SearchableSelect';

/**
 * Searchable dropdown — delegates to SearchableSelect for consistent UX app-wide.
 */
export default function Select({
  label,
  value,
  onChange,
  options = [],
  placeholder = 'Select...',
  disabled = false,
  required = false,
  error,
  className = '',
  onSearchChange,
}) {
  return (
    <SearchableSelect
      label={label}
      value={value}
      onChange={onChange}
      options={options}
      placeholder={placeholder}
      disabled={disabled}
      error={error}
      className={`${className} ${required ? 'is-required' : ''}`}
      onSearchChange={onSearchChange}
    />
  );
}

import { Search } from "lucide-react";
import "./SearchBar.css";

export default function SearchBar({ value, onChange, placeholder = "Search", id }) {
  return (
    <label className="search-bar" htmlFor={id}>
      <Search size={16} aria-hidden="true" />
      <input id={id} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  );
}

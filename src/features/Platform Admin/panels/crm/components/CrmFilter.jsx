import Select from "../../../shared/components/Select";

/** Compact labelled select used in CRM toolbars. Options are strings or [value, label] pairs. */
export default function CrmFilter({ label, value, onChange, options, withAll = true }) {
  return (
    <Select className="crm-select" label={label} value={value} onChange={(event) => onChange(event.target.value)}>
      {withAll && <option value="">All</option>}
      {options.map((option) => {
        const [key, text] = Array.isArray(option) ? option : [option, option];
        return <option key={key} value={key}>{text}</option>;
      })}
    </Select>
  );
}

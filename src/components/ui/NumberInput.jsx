import Input from './Input';

/** Number field without native browser steppers (↑↓). */
export default function NumberInput(props) {
  return <Input {...props} type="text" inputMode="decimal" />;
}

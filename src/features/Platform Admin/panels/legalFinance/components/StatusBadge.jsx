import { STATUS_TONE, TONE_ICON } from "../utils/status";

export default function StatusBadge({ status }) {
  const tone = STATUS_TONE[status] || "mu";
  return <span className={`bd s-${tone}`}>{TONE_ICON[tone]} {status}</span>;
}

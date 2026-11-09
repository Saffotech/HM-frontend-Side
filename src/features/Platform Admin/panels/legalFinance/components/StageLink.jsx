import StatusBadge from "./StatusBadge";
import useOpenCase from "../hooks/useOpenCase";

// Done / Pending badge that jumps to the Legal or Finance page of that case.
export default function StageLink({ done, section, caseId }) {
  const openCase = useOpenCase();
  return (
    <a style={{ cursor: "pointer" }} title={`Open ${section === "legal" ? "Legal Docs" : "Finance"}`} onClick={(e) => { e.stopPropagation(); openCase(section, caseId); }}>
      <StatusBadge status={done ? "Done" : "Pending"} />
    </a>
  );
}

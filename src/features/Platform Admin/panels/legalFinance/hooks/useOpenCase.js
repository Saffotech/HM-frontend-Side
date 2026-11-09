import { useNavigate } from "react-router-dom";
import { useLegalFinance } from "../context/LegalFinanceContext";
import { LF_BASE_PATH } from "../constants";

// openCase("legal" | "finance", caseId) -> selects the case and goes to that page.
export default function useOpenCase() {
  const navigate = useNavigate();
  const { selectCase, closeModal } = useLegalFinance();
  return (section, caseId) => {
    closeModal();
    selectCase(caseId);
    navigate(`${LF_BASE_PATH}/${section}`);
  };
}

import { useLegalFinance } from "../context/LegalFinanceContext";
import { downloadBlob } from "../utils/format";

export default function useDocActions() {
  const { loadDocumentFile, toast } = useLegalFinance();

  const downloadDoc = async (doc, caseRow) => {
    if (!doc?.id) {
      toast("This document has no id from the server.", true);
      return;
    }
    const file = await loadDocumentFile(caseRow.id, doc.id);
    if (!file?.blob) return;
    downloadBlob(file.blob, file.filename || doc.n || "document");
    toast(`Downloading ${file.filename || doc.n}`);
  };

  const downloadIndex = async (caseRow) => {
    if (!caseRow.docs.length) {
      toast("No documents to download", true);
      return;
    }
    for (const doc of caseRow.docs) {
      await downloadDoc(doc, caseRow);
    }
  };

  return { downloadDoc, downloadIndex };
}

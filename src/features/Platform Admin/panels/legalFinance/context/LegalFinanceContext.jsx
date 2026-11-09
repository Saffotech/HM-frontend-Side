import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { platformCallMessage, shouldEndPlatformSession } from "../../../shared/api/platformErrors";
import {
  checklistPayload,
  decisionPayload,
  financePayload,
  mapLegalCase,
  mapLegalCases,
} from "../../../shared/api/legalCaseModel";
import {
  decideLegalCase,
  decideLegalEscalation,
  downloadLegalDocument,
  requestLegalDocumentChanges,
  requestLegalEscalation,
  resubmitLegalCase,
  updateLegalChecklist,
  updateLegalFinance,
  uploadLegalDocument,
  verifyLegalDocument,
  listLegalCases,
} from "../../../shared/api/legalCasesApi";
import { usePlatform } from "../../../shared/context/PlatformContext";
import { WORKSPACES } from "../data/workspaces";

const Ctx = createContext(null);

// eslint-disable-next-line react-refresh/only-export-components
export const useLegalFinance = () => {
  const value = useContext(Ctx);
  if (!value) throw new Error("useLegalFinance must be used inside <LegalFinanceProvider>");
  return value;
};

const initialsOf = (name = "") =>
  name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join("");

function displayUser(user) {
  const name = user?.name || user?.email || "Legal & Finance";
  const role = user?.role === "legal_finance" ? "Legal & Finance" : (user?.role || "Legal & Finance");
  return {
    name,
    role,
    employeeId: user?.userId != null ? String(user.userId) : "—",
    department: "Legal & Finance",
    email: user?.email || "—",
    initials: initialsOf(name) || "LF",
  };
}

export function LegalFinanceProvider({ user, children }) {
  const { signOutPortal } = usePlatform();
  const me = useMemo(() => displayUser(user), [user]);

  const [wsType] = useState("Hospital");
  const [cases, setCases] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [modal, setModal] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);

  const toast = useCallback((msg, err = false) => {
    const id = Date.now() + Math.random();
    setToastMsg({ id, msg, err });
    window.setTimeout(() => setToastMsg((current) => (current && current.id === id ? null : current)), 3200);
  }, []);

  const fail = useCallback((error) => {
    toast(platformCallMessage(error), true);
    if (shouldEndPlatformSession(error)) signOutPortal("legalFinance");
    return false;
  }, [signOutPortal, toast]);

  const replaceCase = useCallback((next) => {
    if (!next) return;
    setCases((current) => current.map((item) => (item.id === next.id ? next : item)));
    setSelectedId(next.id);
  }, []);

  const reloadCases = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const mapped = mapLegalCases(await listLegalCases());
      if (!mapped.ok) {
        setLoadError("The case list was not in the expected format.");
        return;
      }
      setCases(mapped.cases);
      setSelectedId((current) => (
        current != null && mapped.cases.some((item) => item.id === current)
          ? current
          : (mapped.cases[0]?.id ?? null)
      ));
    } catch (error) {
      setLoadError(platformCallMessage(error));
      if (shouldEndPlatformSession(error)) signOutPortal("legalFinance");
    } finally {
      setLoading(false);
    }
  }, [signOutPortal]);

  useEffect(() => {
    reloadCases();
  }, [reloadCases]);

  const openModal = useCallback((node, opts = {}) => setModal({ node, wide: !!opts.wide }), []);
  const closeModal = useCallback(() => setModal(null), []);
  const selectCase = useCallback((id) => setSelectedId(id), []);

  const applyResponse = useCallback((body, success) => {
    const next = mapLegalCase(body);
    if (!next) {
      toast("The server response did not include the case.", true);
      return false;
    }
    replaceCase(next);
    if (success) toast(success);
    return true;
  }, [replaceCase, toast]);

  const setDocStatus = useCallback(async (id, index, status) => {
    const current = cases.find((item) => item.id === id);
    const document = current?.docs?.[index];
    if (!document?.id) {
      toast("This document has no id from the server.", true);
      return false;
    }
    try {
      const call = status === "Verified" ? verifyLegalDocument : requestLegalDocumentChanges;
      return applyResponse(await call(id, document.id), status === "Verified" ? "Document verified" : "Changes requested");
    } catch (error) {
      return fail(error);
    }
  }, [applyResponse, cases, fail, toast]);

  const addDocument = useCallback(async (id, { category, file }) => {
    try {
      return applyResponse(await uploadLegalDocument(id, category, file), "Document uploaded");
    } catch (error) {
      return fail(error);
    }
  }, [applyResponse, fail]);

  const loadDocumentFile = useCallback(async (caseId, documentId) => {
    try {
      return await downloadLegalDocument(caseId, documentId);
    } catch (error) {
      fail(error);
      return null;
    }
  }, [fail]);

  const setChecklistItem = useCallback(async (id, index, patch) => {
    const current = cases.find((item) => item.id === id);
    const item = current?.cl?.[index];
    if (!item) return false;
    const nextItem = { ...item, ...patch };
    const body = checklistPayload(nextItem);
    if (!body) {
      toast("This checklist item has no id from the server.", true);
      return false;
    }
    try {
      return applyResponse(await updateLegalChecklist(id, body), "Checklist saved");
    } catch (error) {
      return fail(error);
    }
  }, [applyResponse, cases, fail, toast]);

  const recordDecision = useCallback(async (id, kind, reason, cond) => {
    const body = decisionPayload(kind, reason, cond);
    if (!body) {
      toast(kind === "Conditionally Approved"
        ? "Enter the reason, condition, and condition owner."
        : "A reason is required.", true);
      return false;
    }
    try {
      return applyResponse(await decideLegalCase(id, body), "Decision recorded");
    } catch (error) {
      return fail(error);
    }
  }, [applyResponse, fail, toast]);

  const resubmit = useCallback(async (id) => {
    const current = cases.find((item) => item.id === id);
    if (current?.st !== "Changes Requested") {
      toast("Resubmit is available only when the case status is Changes Requested.", true);
      return false;
    }
    try {
      return applyResponse(await resubmitLegalCase(id), "Case returned to review");
    } catch (error) {
      return fail(error);
    }
  }, [applyResponse, cases, fail, toast]);

  const saveFinance = useCallback(async (id, values) => {
    const body = financePayload(values);
    if (!body) {
      toast("Enter whole rupees. Discount is required.", true);
      return false;
    }
    try {
      return applyResponse(await updateLegalFinance(id, body), "Finance terms saved");
    } catch (error) {
      return fail(error);
    }
  }, [applyResponse, fail, toast]);

  const requestEscalation = useCallback(async (id) => {
    try {
      return applyResponse(await requestLegalEscalation(id), "Finance Head approval requested");
    } catch (error) {
      return fail(error);
    }
  }, [applyResponse, fail]);

  const decideEscalation = useCallback(async (id, status) => {
    try {
      return applyResponse(await decideLegalEscalation(id, status), `Escalation ${status.toLowerCase()}`);
    } catch (error) {
      return fail(error);
    }
  }, [applyResponse, fail]);

  const ws = WORKSPACES[wsType];
  const current = cases.find((item) => item.id === selectedId) || null;

  const value = {
    user: me,
    wsType,
    ws,
    cases,
    current,
    loading,
    loadError,
    reloadCases,
    selectCase,
    modal,
    openModal,
    closeModal,
    toastMsg,
    toast,
    setDocStatus,
    addDocument,
    loadDocumentFile,
    setChecklistItem,
    recordDecision,
    resubmit,
    saveFinance,
    requestEscalation,
    decideEscalation,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

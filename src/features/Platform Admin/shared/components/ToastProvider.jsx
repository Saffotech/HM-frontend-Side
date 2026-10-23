import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ToastContext } from "../hooks/toast-context";
import Toast from "./Toast";

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Set());

  useEffect(() => () => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current.clear();
  }, []);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback((message, tone = "info") => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts((current) => [...current, { id, message, tone }]);
    const timer = window.setTimeout(() => {
      timersRef.current.delete(timer);
      dismiss(id);
    }, 3800);
    timersRef.current.add(timer);
  }, [dismiss]);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toast toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

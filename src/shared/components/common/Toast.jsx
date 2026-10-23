import { useState, useEffect } from 'react';
import { subscribeToast } from '@/shared/utils/toast';
import './Toast.css';

function ToastMessage({ toast }) {
  return (
    <div className={`toast toast--${toast.type}`} role="status">
      {toast.message}
    </div>
  );
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    return subscribeToast((toast) => {
      if (toast.dismiss) {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      } else {
        setToasts((prev) => [...prev, toast]);
      }
    });
  }, []);

  return (
    <div className="toast-container" aria-live="polite" aria-atomic="false">
      {toasts.map((t) => (
        <ToastMessage key={t.id} toast={t} />
      ))}
    </div>
  );
}

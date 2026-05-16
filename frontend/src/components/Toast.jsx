import { useState } from "react";

/*
 * Minimal toast system. Each page calls useToast() to get a toast() function
 * and a toasts array, then renders <ToastList> at the bottom of the tree.
 * Toasts auto-dismiss after 3.5 s and can be closed early.
 */
export function useToast() {
  const [toasts, setToasts] = useState([]);

  function toast(message, type = "success") {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }

  function dismiss(id) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  return { toasts, toast, dismiss };
}

export function ToastList({ toasts, onDismiss }) {
  if (!toasts.length) return null;
  return (
    <div className="toastList">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type === "error" ? "toastError" : "toastSuccess"}`}>
          <span className="toastMsg">{t.message}</span>
          <button className="toastClose" onClick={() => onDismiss(t.id)}>✕</button>
        </div>
      ))}
    </div>
  );
}

/*
 * Generic confirmation dialog — replaces window.confirm() so the UI stays
 * consistent with the rest of the design instead of hitting the browser's
 * grey native dialog.
 */
export default function ConfirmModal({ message, onConfirm, onCancel, confirmLabel = "Delete" }) {
  return (
    <div className="modalOverlay">
      <div className="confirmModal" onClick={(e) => e.stopPropagation()}>
        <div className="confirmMessage">{message}</div>
        <div className="confirmFooter">
          <button className="secondaryBtn" onClick={onCancel}>Cancel</button>
          <button className="dangerBtn" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

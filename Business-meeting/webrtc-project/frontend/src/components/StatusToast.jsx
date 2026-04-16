/**
 * Toast notifications — positioned top center.
 */
export default function StatusToast({ toasts }) {
  if (!toasts || toasts.length === 0) return null;

  const typeStyles = {
    info: 'glass text-white/90',
    success: 'bg-success/20 border border-success/30 text-success',
    warning: 'bg-warning/20 border border-warning/30 text-warning',
    error: 'bg-danger/20 border border-danger/30 text-danger',
  };

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 items-center pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast ${typeStyles[toast.type] || typeStyles.info}`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}

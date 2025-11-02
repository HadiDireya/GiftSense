interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog = ({
  isOpen,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel
}: ConfirmDialogProps) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="w-full max-w-md rounded-[28px] border border-white/40 bg-white/85 p-6 shadow-soft backdrop-blur-glass dark:border-white/10 dark:bg-charcoal/90 animate-fade-in"
          onClick={(event) => event.stopPropagation()}
        >
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
          <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{message}</p>
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={onCancel}
              className="rounded-full border border-white/40 bg-white/70 px-4 py-2 text-xs font-semibold text-slate-600 shadow-soft transition-transform duration-200 hover:-translate-y-0.5 dark:border-white/10 dark:bg-white/10 dark:text-slate-300"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className="rounded-full bg-gradient-to-r from-rose-500 to-rose-600 px-5 py-2 text-xs font-semibold text-white shadow-soft transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-glow"
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};


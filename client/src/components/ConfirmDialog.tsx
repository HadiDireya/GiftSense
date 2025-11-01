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
          className="bg-white/95 backdrop-blur-xl dark:bg-slate-900/95 rounded-2xl shadow-soft-lg max-w-md w-full p-6 border-2 border-slate-200/60 dark:border-slate-700/60 animate-fade-in"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3">
            {title}
          </h3>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">{message}</p>
          <div className="flex gap-3 justify-end">
            <button
              onClick={onCancel}
              className="px-5 py-2.5 text-sm font-bold rounded-xl border-2 border-slate-200/60 bg-white/80 backdrop-blur-sm dark:border-slate-700/60 dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all duration-200 hover:scale-105 hover:shadow-soft text-slate-700 dark:text-slate-300"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className="px-5 py-2.5 text-sm font-bold rounded-xl bg-gradient-to-br from-red-600 to-red-700 text-white shadow-soft transition-all duration-200 hover:scale-105 hover:shadow-glow"
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};


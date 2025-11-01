import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export const EmptyState = ({ title, description, action }: EmptyStateProps) => (
  <div className="flex flex-col items-center gap-4 rounded-3xl border-2 border-dashed border-slate-200/60 bg-white/90 backdrop-blur-sm dark:border-slate-700/60 dark:bg-slate-900/90 p-12 text-center shadow-soft-lg animate-fade-in">
    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-brand/10 to-brand/5 border-2 border-brand/30 dark:from-brand/20 dark:to-brand/10 dark:border-brand/40">
      <span className="text-4xl" role="img" aria-hidden="true">
        🎀
      </span>
    </div>
    <h2 className="text-xl font-bold bg-gradient-to-r from-brand to-brand-dark bg-clip-text text-transparent">{title}</h2>
    <p className="max-w-md text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300">{description}</p>
    {action && <div className="mt-2">{action}</div>}
  </div>
);

import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export const EmptyState = ({ title, description, action }: EmptyStateProps) => (
  <div className="flex flex-col items-center gap-5 rounded-[32px] border border-white/40 bg-white/75 px-12 py-14 text-center shadow-soft backdrop-blur-glass animate-fade-in dark:border-white/10 dark:bg-white/10">
    <div className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-gradient-to-br from-brand/30 via-mint/30 to-brand/10 text-3xl shadow-soft">
      🎀
    </div>
    <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">{title}</h2>
    <p className="max-w-md text-sm leading-relaxed text-slate-600 dark:text-slate-300">{description}</p>
    {action && <div className="mt-4">{action}</div>}
  </div>
);

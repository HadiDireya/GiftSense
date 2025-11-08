import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export const EmptyState = ({ title, description, action }: EmptyStateProps) => (
  <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-white/30 bg-white/20 backdrop-blur-lg dark:border-white/30 dark:bg-black/20 p-12 text-center shadow-lg animate-fade-in">
    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-400/20 to-blue-500/20 border border-blue-300/40 dark:from-blue-400/30 dark:to-blue-500/30 dark:border-blue-300/50">
      <svg className="w-10 h-10 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    </div>
    <h2 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">{title}</h2>
    <p className="max-w-md text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300">{description}</p>
    {action && <div className="mt-2">{action}</div>}
  </div>
);

export const SkeletonCard = () => {
  return (
    <div className="animate-pulse rounded-2xl border-2 border-slate-200/60 bg-white/90 backdrop-blur-sm p-5 shadow-soft dark:border-slate-700/60 dark:bg-slate-800/90">
      <div className="mb-4 h-48 rounded-xl bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600" />
      <div className="mb-2 h-5 rounded-lg bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600" />
      <div className="mb-4 h-4 w-3/4 rounded-lg bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600" />
      <div className="flex gap-3">
        <div className="h-12 flex-1 rounded-xl bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600" />
        <div className="h-12 w-12 rounded-xl bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600" />
      </div>
    </div>
  );
};

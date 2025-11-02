export const SkeletonCard = () => {
  return (
    <div className="animate-pulse rounded-[28px] border border-white/40 bg-white/70 p-5 shadow-soft backdrop-blur-glass dark:border-white/10 dark:bg-white/10">
      <div className="mb-4 h-48 rounded-2xl bg-gradient-to-br from-brand/10 via-mint/10 to-white/40" />
      <div className="mb-2 h-5 rounded-lg bg-gradient-to-r from-white/60 to-white/30" />
      <div className="mb-4 h-4 w-3/4 rounded-lg bg-gradient-to-r from-white/60 to-white/30" />
      <div className="flex gap-3">
        <div className="h-12 flex-1 rounded-full bg-gradient-to-r from-white/60 to-white/30" />
        <div className="h-12 w-12 rounded-full bg-gradient-to-r from-white/60 to-white/30" />
      </div>
    </div>
  );
};

import { useTheme } from "../state/theme";

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-medium transition hover:border-brand hover:text-brand dark:border-slate-700 dark:text-slate-200 dark:hover:border-brand"
      aria-label="Toggle color theme"
    >
      <span aria-hidden="true" className="text-xs font-semibold uppercase tracking-wide">
        {theme === "dark" ? "MOON" : "SUN"}
      </span>
      {theme === "dark" ? "Dark" : "Light"} mode
    </button>
  );
};

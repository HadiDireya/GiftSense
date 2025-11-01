import { NavLink, Outlet } from "react-router-dom";
import { ThemeToggle } from "../components/ThemeToggle";
import { AuthButton } from "../components/AuthButton";

const navLinkClass =
  "px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 hover:bg-slate-100 dark:hover:bg-slate-800";

const isActiveClass = ({ isActive }: { isActive: boolean }) =>
  isActive
    ? `${navLinkClass} bg-gradient-to-r from-brand to-brand-dark text-white shadow-soft`
    : `${navLinkClass} text-slate-700 dark:text-slate-300`;

const App = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 text-slate-900 transition dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-brand-dark text-white shadow-glow text-xl">
              🎁
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-brand to-brand-light bg-clip-text text-transparent sm:text-3xl">
                Trendella
              </h1>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Personalized gift curation powered by AI
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <nav className="flex items-center gap-1 p-1 bg-white/60 dark:bg-slate-900/60 rounded-xl border border-slate-200/50 dark:border-slate-800/50 backdrop-blur-sm">
              <NavLink to="/" className={isActiveClass} end>
                Chat
              </NavLink>
              <NavLink to="/wishlist" className={isActiveClass}>
                Wish List
              </NavLink>
            </nav>
            <div className="flex items-center gap-2">
              <AuthButton />
              <ThemeToggle />
            </div>
          </div>
        </header>
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default App;

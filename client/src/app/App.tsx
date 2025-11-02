import { Link, NavLink, Outlet } from "react-router-dom";
import { ThemeToggle } from "../components/ThemeToggle";
import { AuthButton } from "../components/AuthButton";

const primaryNavClass = ({ isActive }: { isActive: boolean }) =>
  isActive
    ? "text-slate-900 dark:text-white"
    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white";

const App = () => {
  return (
    <div className="relative min-h-screen overflow-hidden text-slate-900 transition-colors duration-500 dark:text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-[-10rem] h-[28rem] w-[28rem] rounded-full bg-brand/40 blur-3xl opacity-70 animate-float-slow" />
        <div className="absolute right-[-8rem] top-[6rem] h-[24rem] w-[24rem] rounded-full bg-mint/30 blur-3xl opacity-80 animate-float-slow" />
        <div className="absolute inset-x-0 bottom-[-12rem] h-[24rem] rounded-[50%] bg-gradient-to-t from-brand/15 to-transparent blur-3xl" />
      </div>
      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-6 rounded-3xl border border-white/40 bg-white/70 px-5 py-6 shadow-soft backdrop-blur-glass transition-colors duration-500 dark:border-white/10 dark:bg-charcoal/70 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-mint text-xl font-semibold text-white shadow-glow">
              🎁
            </div>
            <div>
              <Link to="/" className="block text-2xl font-semibold text-slate-900 dark:text-white">
                Trendella
              </Link>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                The AI gifting concierge for thoughtful presents
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-end">
            <nav className="flex items-center justify-center gap-6 text-sm font-semibold">
              <NavLink to="/" className={primaryNavClass} end>
                Experience
              </NavLink>
              <NavLink to="/wishlist" className={primaryNavClass}>
                Wish List
              </NavLink>
              <a
                href="#features"
                className="text-slate-600 hover:text-slate-900 transition-colors duration-200 dark:text-slate-400 dark:hover:text-white"
              >
                Features
              </a>
            </nav>
            <div className="flex flex-1 flex-wrap items-center justify-end gap-3">
              <Link
                to="/"
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand via-mint to-brand-dark px-5 py-2 text-sm font-semibold text-white shadow-glow transition-transform duration-200 hover:scale-105"
              >
                Get Started
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-6 6 6-6-6-6" />
                </svg>
              </Link>
              <AuthButton />
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="mt-10 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default App;

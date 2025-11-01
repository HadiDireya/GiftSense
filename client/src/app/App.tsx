import { NavLink, Outlet } from "react-router-dom";
import { ThemeToggle } from "../components/ThemeToggle";
import { AuthButton } from "../components/AuthButton";

const navLinkClass =
  "px-3 py-2 text-sm font-medium rounded-md transition hover:bg-slate-200 dark:hover:bg-slate-800";

const isActiveClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? `${navLinkClass} bg-slate-200 dark:bg-slate-800` : navLinkClass;

const App = () => {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 transition dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-white">
              🎁
            </div>
            <div>
              <h1 className="text-xl font-semibold sm:text-2xl">Trendella Gift Curator</h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Personalized gift ideas powered by real affiliate partners.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <nav className="flex items-center gap-2">
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

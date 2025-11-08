import { Outlet, useLocation } from "react-router-dom";

const App = () => {
  const location = useLocation();
  const isChatPage = location.pathname === "/chatbot";

  return (
    <div className="min-h-screen text-slate-900 transition dark:text-slate-100 bg-[var(--page-bg)]">
      <div
        className={`flex min-h-screen flex-col ${
          isChatPage
            ? ""
            : "mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8"
        }`}
      >
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default App;
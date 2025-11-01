import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const STORAGE_KEY = "trendella-theme";

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Apply theme immediately before React renders to prevent flash
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem(STORAGE_KEY) as Theme | null;
      let initialTheme: Theme;
      if (stored === "light" || stored === "dark") {
        initialTheme = stored;
      } else {
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        initialTheme = prefersDark ? "dark" : "light";
      }
      
      const root = document.documentElement;
      if (initialTheme === "dark") {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
      root.setAttribute("data-theme", initialTheme);
      
      return initialTheme;
    }
    return "light";
  });

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    
    // Apply or remove dark class on html element
    if (theme === "dark") {
      html.classList.add("dark");
      html.setAttribute("data-theme", "dark");
      body.setAttribute("data-theme", "dark");
    } else {
      html.classList.remove("dark");
      html.setAttribute("data-theme", "light");
      body.setAttribute("data-theme", "light");
    }
    
    // Save to localStorage
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch (e) {
      console.warn("Failed to save theme to localStorage:", e);
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
  }, []);

  const value = useMemo(() => ({ theme, toggleTheme, setTheme }), [theme, toggleTheme, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return value;
};

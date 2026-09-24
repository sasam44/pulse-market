"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";
const ThemeCtx = createContext<{ theme: Theme; toggle: () => void }>({
  theme: "dark",
  toggle: () => {},
});

function getSavedTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  try {
    const saved = localStorage.getItem("pm-theme");
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    /* ignore */
  }
  return "dark"; // dark theme default per spec
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Initialize synchronously from localStorage so the first paint already has
  // the correct theme (no flash / no self-reverting after reload).
  const [theme, setTheme] = useState<Theme>(() => getSavedTheme());

  // Apply the data-theme attribute to <html> immediately.
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("pm-theme", theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  useEffect(() => {
    // Keep attribute in sync even before the state effect runs (first paint).
    document.documentElement.setAttribute("data-theme", theme);
  }, []);

  return (
    <ThemeCtx.Provider value={{ theme, toggle: () => setTheme((t) => (t === "dark" ? "light" : "dark")) }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export const useTheme = () => useContext(ThemeCtx);

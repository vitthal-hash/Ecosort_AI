import { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("es_theme");
    return saved ? saved === "dark" : true; // default dark
  });

  useEffect(() => {
    const theme = isDark ? "dark" : "light";
    // Apply to <html> so CSS variables on :root and [data-theme] cascade everywhere
    document.documentElement.setAttribute("data-theme", theme);
    // Also apply to <body> as a fallback
    document.body.setAttribute("data-theme", theme);
    localStorage.setItem("es_theme", theme);
  }, [isDark]);

  const toggleTheme = () => setIsDark(prev => !prev);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
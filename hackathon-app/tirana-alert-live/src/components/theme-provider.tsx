import { useEffect } from "react";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const stored = localStorage.getItem("tf-theme");
      const dark = stored ? stored === "dark" : mq.matches;
      document.documentElement.classList.toggle("dark", dark);
    };
    apply();
    mq.addEventListener("change", apply);
    window.addEventListener("storage", apply);
    return () => {
      mq.removeEventListener("change", apply);
      window.removeEventListener("storage", apply);
    };
  }, []);
  return <>{children}</>;
}

export function setTheme(theme: "light" | "dark" | "auto") {
  if (theme === "auto") localStorage.removeItem("tf-theme");
  else localStorage.setItem("tf-theme", theme);
  window.dispatchEvent(new Event("storage"));
}

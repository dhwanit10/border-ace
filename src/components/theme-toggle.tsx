import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

export function useThemeMode() {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    const stored = window.localStorage.getItem("bsg.theme");
    const isDark = stored ? stored === "dark" : true;
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  const toggle = () => {
    setDark((d) => {
      const next = !d;
      document.documentElement.classList.toggle("dark", next);
      window.localStorage.setItem("bsg.theme", next ? "dark" : "light");
      return next;
    });
  };

  return { dark, toggle };
}

export function ThemeToggle() {
  const { dark, toggle } = useThemeMode();
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label="Toggle theme"
      className="rounded-full"
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}

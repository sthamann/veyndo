/** Persist only the presentation theme; account, agent context and commerce state never enter this preference. */
import { useEffect, useState } from "react";
export function useStudioTheme() {
  const [theme, setTheme] = useState(
    () => localStorage.getItem("rac-studio-theme-v03") || "light",
  );
  useEffect(() => {
    localStorage.setItem("rac-studio-theme-v03", theme);
  }, [theme]);
  return [theme, setTheme] as const;
}

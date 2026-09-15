"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-store";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Providers({ children }: { children: React.ReactNode }) {
  const hydrate = useAuth((s) => s.hydrate);
  const initialized = useAuth((s) => s.initialized);
  const token = useAuth((s) => s.token);
  const pathname = usePathname();
  const router = useRouter();
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const saved =
      (typeof window !== "undefined" && (localStorage.getItem("theme") as any)) ||
      "light";
    setTheme(saved);
    document.documentElement.classList.toggle("dark", saved === "dark");
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!initialized) return;
    const publicPaths = ["/login"];
    const isPublic = publicPaths.includes(pathname);
    if (!token && !isPublic) {
      router.replace("/login");
    } else if (token && isPublic) {
      router.replace("/dashboard");
    }
  }, [initialized, token, pathname, router]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {!initialized ? (
        <div className="h-screen w-full flex items-center justify-center">
          <div className="flex items-center gap-3 text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Loading VisionAttend AI…</span>
          </div>
        </div>
      ) : (
        children
      )}
    </ThemeContext.Provider>
  );
}

import { createContext, useContext } from "react";

type Theme = "light" | "dark";
const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (t: Theme) => void;
}>({ theme: "light", setTheme: () => {} });

export function useTheme() {
  return useContext(ThemeContext);
}

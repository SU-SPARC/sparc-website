"use client";

import { Moon, Sun, CloudMoon } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

const themes = [
  { key: "light", label: "Light", color: "#ffffff", borderColor: "#d4d4d8" },
  { key: "dim", label: "Dim", color: "#15202b", borderColor: "#38444d" },
  { key: "dark", label: "Dark", color: "#0a0a0a", borderColor: "#3f3f46" },
] as const;

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const current = theme === "system" ? resolvedTheme : theme;

  if (!mounted) {
    return (
      <Button type="button" size="icon-sm" variant="ghost" aria-label="Theme">
        <Sun className="size-4" />
      </Button>
    );
  }

  const Icon = current === "dim" ? CloudMoon : current === "dark" ? Moon : Sun;

  return (
    <div className="relative" ref={ref}>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        aria-label="Theme"
        onClick={() => setOpen(!open)}
      >
        <Icon className="size-4" />
      </Button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-40 rounded-lg border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          {themes.map(({ key, label, color, borderColor }) => (
            <button
              key={key}
              onClick={() => {
                setTheme(key);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                current === key
                  ? "font-medium text-zinc-900 dark:text-zinc-50"
                  : "text-zinc-600 dark:text-zinc-400"
              }`}
            >
              <span
                className="inline-block size-4 rounded-full shrink-0"
                style={{ backgroundColor: color, border: `1.5px solid ${borderColor}` }}
              />
              <span>{label}</span>
              {current === key && <span className="ml-auto text-xs">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}


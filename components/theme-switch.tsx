"use client";

/* ThemeSwitch: the Light / Dim / Dark segmented control (docs/DESIGN-BRIEF.md §16).
 * Used in the admin sidebar foot and mobile menu, and the members' top bar and menu. */

import { CloudMoon, Moon, Sun, type LucideIcon } from "lucide-react";
import { useTheme } from "next-themes";
import * as React from "react";

import { cn } from "@/lib/utils";

type ThemeOption = { value: string; label: string; icon: LucideIcon };

/* Same three themes, in the same order, as the public navbar's ThemeToggle. */
const THEME_OPTIONS: ThemeOption[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dim", label: "Dim", icon: CloudMoon },
  { value: "dark", label: "Dark", icon: Moon },
];

/* Arrow keys move through the options and wrap, like native radio buttons. */
const NEXT_KEYS = ["ArrowRight", "ArrowDown"];
const PREVIOUS_KEYS = ["ArrowLeft", "ArrowUp"];

/* The group is 32px tall on pointer screens (26px segment + 2px padding +
   1px border, top and bottom). Below 640px each segment grows to the 44px
   touch target from §0. */
const SEGMENT =
  "inline-flex h-11 min-w-11 grow items-center justify-center gap-1 rounded-control text-sm transition-colors sm:h-6.5 sm:min-w-0";
const SEGMENT_CHECKED = "bg-surface-2 text-ink";
const SEGMENT_UNCHECKED = "text-ink-muted enabled:hover:text-ink";

/* Same guard as theme-toggle.tsx: false during SSR and hydration, true
   afterwards, so the server render and the first client render match. */
const noopSubscribe = () => () => {};

function useMounted() {
  return React.useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

export interface ThemeSwitchProps {
  /** Icons only. The labels stay in the accessibility tree. */
  compact?: boolean;
  className?: string;
}

export function ThemeSwitch({ compact = false, className }: ThemeSwitchProps) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();
  const optionRefs = React.useRef<Array<HTMLButtonElement | null>>([]);

  // "system" follows the OS, so mark whichever theme it resolved to.
  const activeTheme = theme === "system" ? resolvedTheme : theme;
  let checkedIndex = -1;
  if (mounted) {
    checkedIndex = THEME_OPTIONS.findIndex((o) => o.value === activeTheme);
  }
  // Roving tabindex: Tab lands on the checked option, or the first one.
  const tabStopIndex = Math.max(checkedIndex, 0);

  function selectOption(index: number) {
    const count = THEME_OPTIONS.length;
    const wrappedIndex = (index + count) % count;
    setTheme(THEME_OPTIONS[wrappedIndex].value);
    optionRefs.current[wrappedIndex]?.focus();
  }

  function handleKeyDown(event: React.KeyboardEvent, index: number) {
    if (NEXT_KEYS.includes(event.key)) {
      event.preventDefault();
      selectOption(index + 1);
    } else if (PREVIOUS_KEYS.includes(event.key)) {
      event.preventDefault();
      selectOption(index - 1);
    }
  }

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className={cn(
        "inline-flex rounded-control border border-line p-0.5",
        className,
      )}
    >
      {THEME_OPTIONS.map((option, index) => (
        <ThemeSegment
          key={option.value}
          ref={(node) => {
            optionRefs.current[index] = node;
          }}
          option={option}
          checked={index === checkedIndex}
          disabled={!mounted}
          tabStop={index === tabStopIndex}
          compact={compact}
          onSelect={() => setTheme(option.value)}
          onKeyDown={(event) => handleKeyDown(event, index)}
        />
      ))}
    </div>
  );
}

interface ThemeSegmentProps {
  ref: React.Ref<HTMLButtonElement>;
  option: ThemeOption;
  checked: boolean;
  disabled: boolean;
  tabStop: boolean;
  compact: boolean;
  onSelect: () => void;
  onKeyDown: (event: React.KeyboardEvent) => void;
}

/* One radio in the group: icon plus label (label hidden visually when compact). */
function ThemeSegment({
  ref,
  option,
  checked,
  disabled,
  tabStop,
  compact,
  onSelect,
  onKeyDown,
}: ThemeSegmentProps) {
  const Icon = option.icon;
  return (
    <button
      ref={ref}
      type="button"
      role="radio"
      aria-checked={checked}
      disabled={disabled}
      tabIndex={tabStop ? 0 : -1}
      title={compact ? option.label : undefined}
      onClick={onSelect}
      onKeyDown={onKeyDown}
      className={cn(
        SEGMENT,
        compact ? "px-2" : "px-1.5",
        checked ? SEGMENT_CHECKED : SEGMENT_UNCHECKED,
      )}
    >
      <Icon aria-hidden="true" className="size-4 flex-none" />
      <span className={cn(compact && "sr-only")}>{option.label}</span>
    </button>
  );
}

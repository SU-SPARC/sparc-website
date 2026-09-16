#!/usr/bin/env bash
#
# verify.sh — SPARC redesign build gate.
#
# Run from the repo root:   bash scripts/verify.sh
#
# WHO OWNS THIS FILE
#   The orchestrator, and nobody else. If you are a subagent working on a
#   step, you may not edit this file — not to add a path, not to relax a
#   check, not to silence a failure. Report the problem instead.
#
# ─────────────────────────────────────────────────────────────────────────
# THE MIGRATED-PATH LIST
# ─────────────────────────────────────────────────────────────────────────
#
# Why this exists: the redesign lands one step at a time, but the old pages
# keep their 236 stock-palette references, their sub-13px type and their
# `unoptimized` props until the step that rewrites them runs. A check that
# swept all of app/ and components/ from day one would fail on code nobody
# had touched yet, and "verify.sh is red" would stop meaning anything.
#
# So the style checks below run against this list only. A path goes on it
# the moment its step is reviewed and integrated — after which a regression
# in it fails the build immediately, which is the point.
#
# The build and the redirect checks always run repo-wide.
#
# Add one path per line. Keep the step comment. Do not sort — chronological
# order is the migration history.

MIGRATED=(
  app/globals.css               # S1 — token layer (exempt from the hex check)
  app/layout.tsx                # S1 — fonts, skip-link, metadata base
  components/theme-provider.tsx # S1 — verified clean, unchanged
  components/theme-toggle.tsx   # S1 — de-hexed, migrated to semantic names
  components/ui/expand.tsx      # S2 — THE expand; a second one anywhere is a bug
  components/ui/pill.tsx        # S2 — badge pill, wrap rules baked in
  components/ui/filter-chip.tsx # S2 — aria-pressed filter toggle
  components/ui/surface-card.tsx # S2 — redesign card (legacy card.tsx still live)
  components/ui/micro-label.tsx # S2 — 13px labels; muted default is deliberate
  components/ui/poster-text.tsx # S2 — the only way to render the poster face
  lib/content/types.ts          # S2.5 — shapes mirror supabase/schema.sql
  lib/content/members.ts        # S2.5 — 12 people, verbatim from app/team
  lib/content/projects.ts       # S2.5 — 3 projects, verbatim from app/projects
  lib/content/events.ts         # S2.5 — 3 events + 3 recordings, verbatim
  app/preview/page.tsx          # S7 — specimen catalogue, noindex
  app/preview/preview-client.tsx # S7 — theme harness + measured contrast
  app/preview/exhibits.tsx      # S7 — exhibits, demo data by predicate only
  app/not-found.tsx             # S7 — 404, Martian only (no Ultra)
  components/ui/sparc-mark.tsx  # S3 — inline mark; mask #fff/#000 are alpha, exempt
  components/ui/navbar.tsx      # S3 — nav; [data-nav-mark] is S4's landing target
  components/ui/footer.tsx      # S3 — footer; ink-fit wordmark + photo mask
  app/page.tsx                  # S4 — home shell
  components/ui/hero.tsx        # S4 — orbit draw + scroll-linked bolt travel
  components/ui/photo-drift.tsx # S4 — entrance into drift; card vs track handoff
  app/about/page.tsx            # P1 — merged about+team
  app/about/sections.tsx        # P1 — photo reveal + people directory
  components/ui/person-card.tsx # P1 — reserved name/role heights live here
  app/join/page.tsx             # P2 — merged join+contact; form kept, subordinate
  app/projects/page.tsx         # P3 — type list shell
  app/projects/project-index.tsx # P3 — hover preview, one-at-a-time
  app/events/page.tsx           # P4 — record shell
  app/events/events-record.tsx  # P4 — rows + recordings; no card, no search
  lib/content/news.ts           # U1 — 3 news items, verbatim from old home
  app/home-sections.tsx         # U2 — stats band + news preview
)

# ─────────────────────────────────────────────────────────────────────────

set -uo pipefail
cd "$(dirname "$0")/.." || exit 2

# ── the search tool ──────────────────────────────────────────────────────
# Note for whoever maintains this: `rg` is often a shell FUNCTION rather
# than a binary (Claude Code installs one), and shell functions are not
# inherited by scripts. An earlier version of this file called `rg`, got
# "command not found", captured empty output, and reported every style
# check as PASS. A gate that cannot fail is worse than no gate, so we
# resolve a real executable here and abort if there is not one.
if command -v rg >/dev/null 2>&1 && [ -x "$(command -v rg 2>/dev/null)" ]; then
  SEARCH() { rg -n "$@"; }
elif command -v grep >/dev/null 2>&1; then
  SEARCH() { grep -E -n "$@"; }
else
  echo "verify.sh: no usable rg or grep on PATH — refusing to report a pass." >&2
  exit 2
fi
# Patterns below are written in POSIX ERE so both engines read them the
# same way. No (?:...), no \s, no lookaround.

fail=0
pass() { printf '  \033[32mPASS\033[0m  %s\n' "$1"; }
bad()  { printf '  \033[31mFAIL\033[0m  %s\n' "$1"; fail=1; }
info() { printf '  \033[2m%s\033[0m\n' "$1"; }

# Only the paths that actually exist, so the script survives a deletion.
scope=()
for p in "${MIGRATED[@]}"; do [ -e "$p" ] && scope+=("$p"); done
if [ "${#scope[@]}" -eq 0 ]; then
  echo "verify.sh: migrated-path list is empty — nothing to check." >&2
  exit 2
fi

printf '\nverify.sh — %d of %d migrated paths present\n\n' \
  "${#scope[@]}" "${#MIGRATED[@]}"

# reject <regex> <label> [files...]  — fails if the pattern is found.
# Defaults to the full scope when no files are given.
reject() {
  local re="$1" label="$2"; shift 2
  local files=("$@"); [ "${#files[@]}" -eq 0 ] && files=("${scope[@]}")
  local hits
  hits=$(SEARCH "$re" "${files[@]}" 2>/dev/null)
  if [ -n "$hits" ]; then
    bad "$label"
    printf '%s\n' "$hits" | sed 's/^/          /'
  else
    pass "$label"
  fi
}

echo "── self-test ────────────────────────────────────────────────"
# Prove the search tool actually matches before trusting any PASS above.
if printf 'aaa #ff00aa bbb\n' | SEARCH '#[0-9a-fA-F]{6}' - >/dev/null 2>&1; then
  pass 'search tool matches a known-bad string'
else
  bad 'search tool cannot match — every style PASS below would be a lie'
  echo; printf '\033[31mverify.sh: FAILED\033[0m\n\n'; exit 1
fi

echo
echo "── style ────────────────────────────────────────────────────"

# No raw colour outside the token layer. globals.css is the token layer and
# is the one file allowed to hold hex.
nontoken=()
for p in "${scope[@]}"; do
  case "$p" in */globals.css) ;; *) nontoken+=("$p") ;; esac
done
if [ "${#nontoken[@]}" -gt 0 ]; then
  reject '#[0-9a-fA-F]{6}' 'no hex literals' "${nontoken[@]}"
else
  info 'no non-token files in scope yet'
fi

# No stock Tailwind palette — the ramp handles the theme flip.
reject '\b(zinc|slate|gray|neutral|stone)-[0-9]{2,3}\b' 'no stock palette'

# 13px floor. text-[10px] and text-[11px] have no equivalent; use text-label.
reject 'text-\[([0-9]|1[0-2])px\]' '13px type floor'

# Next's image optimizer stays on.
reject 'unoptimized' 'image optimizer on'

# Commas are invalid in Tailwind v4 arbitrary values; the layout silently
# collapses. Use [3fr_2fr].
reject 'grid-cols-\[[^]]*,' 'no commas in grid-cols'

echo
echo "── routing ──────────────────────────────────────────────────"

# /team and /contact are deleted and must not 404 — the e-board has posted
# both URLs publicly. Quote-agnostic on purpose: the check is that the
# redirect exists, not that it was written with a particular quote style.
for route in team contact; do
  if SEARCH "source:[[:space:]]*[\"']/$route[\"']" next.config.ts >/dev/null 2>&1; then
    pass "/$route redirects"
  else
    bad "/$route redirect missing from next.config.ts"
  fi
done

echo
echo "── motion ───────────────────────────────────────────────────"

# Every animation ships with its reduced-motion variant in the same commit.
#
# Scope note: globals.css already carries a universal
#   @media (prefers-reduced-motion: reduce) { *, *::before, *::after {
#     animation-duration: .01ms !important; transition-duration: .01ms !important } }
# so a plain CSS `transition-*` utility is ALREADY handled and does not need
# a per-file variant. Flagging those produced a false positive on a hover
# colour change, which is the fastest way to teach people to ignore a gate.
#
# What that global block cannot reach is motion driven from JavaScript or
# tied to the scroll timeline — the hero bolt travel, the photo drift, the
# WAAPI playbackRate ramp. Those need an explicit variant because "reduced"
# means different behaviour, not merely instant behaviour: the bolt sits in
# the nav, it does not teleport there in 0.01ms. Those are what we check.
animated=0; guarded=0
for f in "${scope[@]}"; do
  case "$f" in *.tsx|*.ts|*.css) ;; *) continue ;; esac
  # motion\.[a-z] not motion\. — the bare form matched the word "motion."
  # in an English comment ("no state, no motion.") and flagged a file with
  # no animation at all. The JSX form is always motion.div / motion.span.
  SEARCH '(motion\.[a-z]|useAnimate|useScroll|useSpring|framer-motion|from "motion|requestAnimationFrame|animation-timeline|\.animate\(|@keyframes)' \
    "$f" >/dev/null 2>&1 || continue
  animated=$((animated + 1))
  if SEARCH '(prefers-reduced-motion|useReducedMotion|motion-reduce)' \
       "$f" >/dev/null 2>&1; then
    guarded=$((guarded + 1))
  else
    bad "animates but never mentions reduced motion: $f"
  fi
done
if [ "$animated" -eq 0 ]; then
  info 'no animated files in scope yet'
else
  info "$guarded/$animated animated files carry a reduced-motion variant"
  [ "$guarded" -eq "$animated" ] && pass 'reduced-motion coverage'
fi

echo
echo "── build ────────────────────────────────────────────────────"

buildlog=$(mktemp)
if npx next build >"$buildlog" 2>&1; then
  pass 'next build'
  routes=$(grep -c '^[^ ]* [○ƒ●]' "$buildlog" 2>/dev/null || true)
  info "${routes:-?} routes emitted"
else
  bad 'next build'
  tail -30 "$buildlog" | sed 's/^/          /'
fi
rm -f "$buildlog"

echo
if [ "$fail" -eq 0 ]; then
  printf '\033[32mverify.sh: all checks passed\033[0m\n\n'
else
  printf '\033[31mverify.sh: FAILED\033[0m\n\n'
fi
exit "$fail"

# PLAN.md — SPARC redesign, Phase 0 survey

Orchestrator survey against the real repo. Nothing dispatched yet.

**Revision 2** — reconciled against the amended pack (README "Amended after Phase 0 survey",
SPEC "Provenance of facts" + revised `/join` + "Content layer", de-fabricated
`people-badges.html`, seed-stripped `schema.sql`). The survey itself was not re-run; it stands.
Verified by byte-diff that `design/COMPONENTS.md` and `design/TOKENS.md` are unchanged.

- **Repo** `SU-SPARC/sparc-website`, cloned at `final/repo`, checked out from `main` @ `95caa60`.
- **Branch** `redesign/foundation` (not yet created). `allan-rebuild` exists on the remote and is being left alone per instruction.
- **Baseline** `next build` is **clean** on main: Next 16.1.6 Turbopack, 7 routes + `_not-found`, all `○ (Static)`. So every failure from here is ours.
- **Tooling** ripgrep 14.1.1 and GNU bash 5.2 are both present, so `scripts/verify.sh` will run as written.

---

## 1. Baseline measurements

Every number below is measured, not quoted from the docs.

| thing | count | where |
|---|---|---|
| `zinc\|slate\|gray\|neutral\|stone-NNN` references | **236** | all pages + all components |
| `unoptimized` props | **14** across 10 files | `<Image>` instances total: **15** |
| `md:grid-cols-[3fr,2fr]` (invalid in v4) | **4** | `app/page.tsx:52`, `about:54`, `events:118`, `join:15` |
| sub-13px `text-[Npx]` | **13** across 6 files | team ×6, home ×2, events ×2, navbar/projects/join ×1 |
| hex literals in `components/` | **6** | `components/theme-toggle.tsx:10-12` |
| routes | 7 | `/ /about /team /projects /events /join /contact` |

`TOKENS.md`'s "~236 zinc references" is exact. `SPEC.md`'s four grid-comma pages are exact.

---

## 2. Findings

Ordered by how much damage each does if it goes unnoticed. Items resolved by the amended
pack are kept, marked, and struck through in effect — they are the audit trail for why the
spec now reads the way it does.

### 2.1 `verify.sh` cannot pass until the very last page lands — as specified · **ACCEPTED, MINE**

The script greps **all** of `app` and `components` unconditionally. But the old pages keep their 236 zinc refs, 13 sub-13px sizes and 14 `unoptimized` props until each one is individually rewritten in P1–P4. So checks 1–4 fail after S1, S2, S3 and S4, and the rule "do not accept a subagent's work until this passes" makes S2 un-acceptable through no fault of S2.

**Fix (approved):** `verify.sh` carries the path manifest as **a plain list at the top of the file, one path per line, each commented with the step that added it** — readable by the next e-board without reverse-engineering a script. Global checks run only against listed paths; `next build` and the `next.config.ts` redirect checks always run repo-wide. I own the file; no subagent may edit it. The list grows by one or two lines as I integrate each step, so a regression in already-migrated code still fails immediately — the point of the check — without failing on code nobody has touched yet.

### 2.2 `components/theme-toggle.tsx` fails check 1 on the very first run · **ACCEPTED, MINE**

Lines 10–12 carry six hex literals in a `themes` array, painted through an inline `style` attribute. Check 1 (`! rg -q '#[0-9a-fA-F]{6}' app components`) excludes only `globals.css`, so this trips regardless of the manifest fix above once the file is in scope.

**Owner: me, in S1.** Swapping the swatch hexes for token-driven classes is token-layer work, not feature work. S3 re-styles and re-places the control afterward (SPEC puts the theme switcher in the nav). Sequential, so no two-writer conflict.

### 2.3 `SPEC.md` and `TOKENS.md` still contradict each other on Ultra · **OPEN**

- `SPEC.md:46` — "exactly three appearances: the hero wordmark, the footer wordmark, and the `/about` opening statement"
- `TOKENS.md:33` — "exactly two jobs: the hero and the footer wordmark"

TOKENS.md was not amended, so this survives revision 2. SPEC supersedes, so **three**. Flagged because a reviewer working from TOKENS would reject the `/about` statement as an unauthorised fourth use — and `/about` is P1, one of the parallel tasks.

### 2.4 S6 "polish" collides with four other tasks · **ACCEPTED — S6 DISSOLVED**

As specified S6 owned "metadata, favicon, 404, the four grid-comma bugs." Three of those four live inside files other agents are rewriting:

| S6 item | real location | actual owner |
|---|---|---|
| 4 grid-comma bugs | `app/page.tsx`, `about`, `events`, `join` | S4, P1, P2, P4 — the bug **disappears when the page is rewritten** |
| per-page `metadata` exports | every `app/*/page.tsx` | the task rewriting that page |
| favicon / icons | `app/icon.svg`, `apple-icon.svg` | **S1** (I own logo assets) |
| custom 404 | `app/not-found.tsx` — **new file, no collisions** | genuinely parallel-safe |

Grid-comma and metadata become review-gate items on each page task (a page that lands still carrying a comma is a reject). Favicon moves into S1. Only `not-found.tsx` was ever parallel-safe; it rides with S7.

### 2.5 `--color-chip` / `--color-chip-line` are missing from the supplied `globals.css` · **OPEN, MINE**

`COMPONENTS.md:40` instructs adding them to `@theme inline` for the footer icon tiles (`#2e2427` fill, `#3d3134` border). They are not in the file. So `globals.css` is *not* quite drop-in — README's "do not regenerate" still holds, but S1 must append exactly these two tokens, and nothing else. Without them the footer agent has no legal way to build the icon tiles and will inline hex, failing check 1.

### 2.6 The schema seed conflicted with the repo on real member data · **RESOLVED — SEED DELETED**

Confirmed in revision 2: `supabase/schema.sql` now ends in a `DELIBERATELY EMPTY` seed block naming each defect. All four LinkedIn errors, the four truncated bios, Mo's unclaimed `founding` badge and the three dropped Zoom links are gone with it.

**Standing policy, approved: the repo wins on conflict.** Source of truth is `app/team/page.tsx`, `app/events/page.tsx`, `app/projects/page.tsx`. Nothing is populated from the schema.

One consequence to carry forward: member **`status` (current/alumni)** existed *only* in the deleted seed. It is now sourced from nothing. See §5.1.

### 2.7 `/about`'s facts row · **RESOLVED — PROVENANCE SECTION ADDED**

SPEC now carries a "Provenance of facts" table. "4 semesters" and "biweekly meetings" are club-supplied Aug 2026, confirmed and approved. They are **not** invented and must not be rejected for lacking a repo reference. My finding was correct against what the spec then said; the spec was the thing at fault.

**This inverts into a work item:** `app/contact/page.tsx:122` — *"Our regular meeting times are still being finalized"* — is now explicitly **stale copy to replace**, not a source. P2 owns that, since `/contact` merges into `/join`.

The `/about` facts row ships as specified: **3 projects · 4 semesters · biweekly meetings**. No TODO.

Standing rule for review, verbatim from SPEC:41 — *"Anything not on this list and not in the repo is invented. Reject it."*

### 2.8 `/events`: the three Zoom recordings · **RESOLVED — SEPARATE BLOCK**

The three recordings (`Meeting 1/2/3`, Feb 26 / Mar 24 / Apr 3 2026) do not correspond to the three events (Feb 5 / Feb 12 / Mar 31), and nothing in the repo maps one to the other.

**Resolved:** recordings stay, `recording_url` stays null on all three events, and the recordings surface as a **separate RECORDINGS block** as the current build does. Do not guess which event each belongs to. Any P4 diff that attaches a recording to an event is a reject.

### 2.9 `/projects`: the Team/Personal filter has nothing to filter · **OPEN**

SPEC:149 wants "filter chips for Team / Personal with counts" and "hide a filter that would return zero." The repo has no team/personal field, and all 3 projects are club projects. So `PERSONAL` is 0, gets hidden, and `TEAM (3)` is left as a single chip that filters nothing.

`projects.kind` exists in the schema with default `'team'`, so the *shape* is defined — there is simply no personal project. **Recommendation:** follow SPEC's own logic to its conclusion and omit the filter row until a personal project exists. Building a one-chip filter is worse than building none. The `kind` field still ships in `lib/content/projects.ts`, so adding the row later is a render change, not a data change. See §5.2.

### 2.10 `/join` · **PARTLY RESOLVED**

| destination | status |
|---|---|
| Discord `discord.gg/W8veDYAku6` | ✓ `contact/page.tsx:62`, `footer.tsx:18` — **primary, visually dominant** |
| **Google Form** | ✓ **RESOLVED — KEEPS.** `join/page.tsx:33`. "No form" is overruled; secondary to Discord, never above it. |
| Press `sparc@studentorgs.suffolk.edu` | ✓ |
| Advisor Prof. Gentilucci `argentilucci@suffolk.edu` | ✓ `contact/page.tsx:108` |
| Room `73 Tremont, Room 8065` | ✓ repo events data, and on the provenance table |
| Cadence — biweekly | ✓ **RESOLVED** — provenance table |
| **Sponsor/partner → president's email** | ✗ **STILL OPEN.** Nowhere in the repo, not on the provenance table. |

### 2.11 Smaller corrections · **OPEN, cosmetic**

- **`unoptimized` is on 14 of 15 `<Image>`s, not "all 14"** (SPEC:197). `footer.tsx:10` never had it; `contact` has 2 images but 1 prop.
- **`news-carousel.tsx` is already dead** — imported by nothing. SPEC:201 lists it beside `hero-slideshow` (which *is* live, `app/page.tsx:70`). Deleting it is free.
- **README:19 says 45 images; the pack ships 47.**
- Import shapes both confirmed: `export { Footer }` named ✓, `export default function Navbar` ✓ — the supplied `layout.tsx` matches both.
- `components/theme-provider.tsx` is a clean next-themes passthrough. **No change needed.**
- `public/` has both `mo.jpeg` and `mo.jpg`. The pack ships one `mo.webp`.

### 2.12 The people-badges demo · **RESOLVED — DE-FABRICATED**

Verified in revision 2: the `Participated` lines and card-level `CollegiateX` pills are gone, and the file carries a banner at line 99 — *"Reference only — badge data removed."* The surviving `CollegiateX` at line 108 is the **filter chip**, i.e. the mechanism, correctly retained.

**The reject rule stands and is unchanged:** build the badge *mechanism* from this file. The values remain unknown. Any P1 diff that emits a `CollegiateX` pill or a `Participated` line **on a person card** is an automatic reject.

> **AMENDED after launch review (client, Aug 2026).** The unknown data was supplied:
> all 12 members are founding members; all except Allan Nguyen did the CollegiateX
> internship; everyone participated 2025 and 2026. `lib/content/members.ts` now
> carries the values with that provenance. The reject rule above applied to
> *hardcoding* the values — the card renders them from data, so no card code
> changed when the data arrived, which was the point of the mechanism. Noted for
> the record: `founding` on Mohammed/Sarmad/Kyle/Endi/Montasir rests on the
> club's word alone; the repo's role strings never said it, and this is exactly
> the badge shape the deleted seed was once burned for. The club is the source.

---

## 3. Corrected dependency graph

```
S1  foundation ....................... ME. serial, blocks all.
       │
       ├──────────────────────┐
S2  primitives            S2.5 content layer      ← MOVED EARLIER (was S5)
    (1 agent)                  (1 agent)
       └──────────┬───────────┘
                  │
       ├──────────┴───┬───────────────┐
S3  nav + footer      S7  /preview + 404
    (1 agent)             (1 agent)
       │
       ├──────────────┬──────┬──────┬──────┐
S4 hero            P1 /about  P2 /join  P3 /projects  P4 /events
   (1 agent)        (1)        (1)       (1)           (1)
       └──────────────┴──────┴──────┴──────┘
                      │
S8  integration pass  ME. final verify + push.
```

Changes from the supplied graph, and why:

1. **S6 deleted.** Dissolved into S1 (favicon), the page tasks (metadata + grid-commas), and S7 (404). §2.4.
2. **S5 renamed S2.5 and moved from *after* P1/P3/P4 to *before* them.** ← **new in revision 2.**
   SPEC's Content layer section now requires that *"every page reads through those modules, never from inline literals."* If the modules land after the pages, then P1/P3/P4 must write inline literals first and S2.5 rips them out — rework, and precisely the failure mode S2 exists to prevent. Building the data once, first, also makes the no-invented-content review tractable: audit **one** file against the repo, after which any string in a page that is not in a module is a reject. It shares no files with S2 (`components/ui/*` vs `lib/content/*`), so the two run concurrently.
3. **S7 moved earlier**, alongside S3. `/preview` and `not-found.tsx` are new files importing S2 primitives; they need nothing from the nav. Starting early gives me the visual review surface *before* the four pages land. S7 re-runs at the end to pick up nav/footer/page components.
4. **S4 kept in the parallel block.** It shares no file with P1–P4. But it is the hardest task, so I review it **first** of the five, before its neighbours' diffs pile up.
5. **`next.config.ts` redirects move into S1.** P1 and P2 both need them; the standing rule says I make shared-file changes myself. Adding both in S1 also makes verify checks 6–7 pass from the first run. Side effect: `/team` and `/contact` become unroutable early, while the source files stay on disk for P1/P2 to read. Acceptable on a branch.

---

## 4. Per-step file manifest with blast radius

Legend — 🔴 blocks everything · 🟠 blocks its subtree · 🟢 leaf.

### S1 — foundation · me · 🔴

| file | action |
|---|---|
| `app/globals.css` | **replace** with pack file, **+ append `--color-chip` / `--color-chip-line`** (§2.5) |
| `app/layout.tsx` | replace with pack file (Ultra + Martian, skip-link, `<div id="main">`) |
| `app/icon.svg`, `app/apple-icon.svg` | new, from `assets/logo/` |
| `app/favicon.ico` | **delete** (Next default) |
| `public/images/*.webp` | new — 47 files from `assets/images/` |
| `public/logo/sparc-mark.svg` | new — hero/nav/footer mark, ids `bolt-up`/`bolt-dn`/`arc`/`nodes` intact |
| `components/theme-toggle.tsx` | de-hex only (§2.2) |
| `next.config.ts` | add `/team`→`/about`, `/contact`→`/join` permanent redirects |
| `supabase/schema.sql` | commit as-is (target shape, deferred, seed empty) |
| `scripts/verify.sh` | new — **manifest as a plain commented list at the top. No subagent may edit.** |
| `package.json` | no change (motion + next-themes already present; **no Supabase dep**) |

**Blast radius: total.** Every subsequent task reads these tokens. Old `public/*.jpeg` stay until the page referencing them is rewritten, so the site keeps building throughout.

### S2 — primitives · 1 agent · 🔴

New only: `components/ui/expand.tsx`, `pill.tsx`, `filter-chip.tsx`, `surface-card.tsx`, `micro-label.tsx`, `poster-text.tsx`.
Reads `design/people-badges.html` + `COMPONENTS.md:42-56`.
**Must not touch** the existing `components/ui/card.tsx` — the legacy shadcn card is still imported by 6 live pages, hence the `surface-card.tsx` name. *(Naming decision mine; flagged because it deviates from the brief's "Card".)*

**Blast radius: total.** Three later tasks import the expand. If this is wrong we get the three-expands failure the step exists to prevent.

### S2.5 — content layer · 1 agent · 🔴 · **moved earlier**

New only: `lib/content/members.ts`, `projects.ts`, `events.ts`, `types.ts`.
Shapes match `supabase/schema.sql` **exactly** — same field names, same array columns, `starts_at` a real `Date` so upcoming-vs-past stays derived and no term string is ever hardcoded.
Reads `app/team/page.tsx`, `app/events/page.tsx`, `app/projects/page.tsx` — **the repo, and nothing else.**
Ships 12 members (not 17 — merge the five duplicates, second role becomes `role_history`), 3 projects, 3 events, 3 recordings as their own array.
`badges` and `participated` ship **empty** with a visible TODO. `recording_url` null on all events.

**Blast radius: three pages' entire data source.** Reviewed against the repo line by line before anything consumes it.

### S3 — nav + footer · 1 agent · 🟠

`components/ui/navbar.tsx` (rewrite), `components/ui/footer.tsx` (rewrite), `components/theme-toggle.tsx` (restyle/relocate into nav), `components/ui/sparc-mark.tsx` (new).
Reads `design/nav-and-photo-motion.html`, `design/footer-v9.html`, SPEC Nav + Footer verbatim.
**Blast radius: every page** — both render in `layout.tsx`. The nav mark is S4's landing target, so its DOM identity and geometry are a contract S4 depends on.

### S7 — /preview + 404 · 1 agent · 🟢

New only: `app/preview/page.tsx`, `app/preview/*` client bits, `app/not-found.tsx`.
`robots: { index: false }` on preview. Re-run at the end to add nav/footer/page sections.
**Blast radius: none.** Imports everything, is imported by nothing.

### S4 — hero · 1 agent · 🟠

`app/page.tsx` (rewrite), `components/ui/hero.tsx`, `components/ui/photo-drift.tsx` (new), **delete** `hero-slideshow.tsx`, `news-carousel.tsx`, `writing-text.tsx`.
Reads `design/nav-and-photo-motion.html`, `design/photo-entrance-drift.html`, SPEC Home verbatim.
Fixes `page.tsx:52` grid-comma; adds page `metadata`.
**Blast radius: `/` only,** but coupled to S3's nav mark.

### P1 — /about · 1 agent · 🟢

`app/about/page.tsx` (rewrite), `app/team/page.tsx` (**delete**), `components/ui/person-card.tsx`.
Consumes `lib/content/members.ts`. Reads `design/people-badges.html` for **mechanism only**, SPEC `/about` verbatim.
Facts row ships **3 projects · 4 semesters · biweekly meetings** (§2.7 — approved, not a TODO).
Ultra statement is a sanctioned third use (§2.3).
Fixes `about:54` grid-comma; adds `metadata`.
**Blast radius: `/about` + `/team`.** Redirect already in place from S1.
⚠ Automatic reject on any `CollegiateX` pill or `Participated` line on a person card (§2.12).
⚠ Collapsed-height check against "Margulan Kudaibergen" / "Vice-President & Project Lead".

### P2 — /join · 1 agent · 🟢

`app/join/page.tsx` (rewrite), `app/contact/page.tsx` (**delete**).
**Keeps the Google Form** at the existing URL, secondary to Discord, never above it (§2.10).
**Replaces the stale "meeting times still being finalized" copy** with biweekly + Room 8065 (§2.7).
Fixes `join:15` grid-comma; adds `metadata`.
**Blast radius: `/join` + `/contact`.** Blocked only on the president's email (§5.3).

### P3 — /projects · 1 agent · 🟢

`app/projects/page.tsx` (rewrite). Consumes `lib/content/projects.ts`.
Reads SPEC `/projects` verbatim. Martian `text-4xl`, **not Ultra**. Adds `metadata`.
**Blast radius: `/projects`.** Filter row pending §5.2.

### P4 — /events · 1 agent · 🟢

`app/events/page.tsx` (rewrite). Consumes `lib/content/events.ts`.
Reads SPEC `/events` verbatim. Reuses S2 expand; no search; no cards; term derived from `starts_at`.
**Recordings render as their own block** (§2.8) — reject if a recording is attached to an event.
Fixes `events:118` grid-comma; adds `metadata`.
**Blast radius: `/events`.**

### S8 — integration · me

Full `verify.sh` with every path listed, `next build`, push `redesign/foundation`, Vercel preview URL + `/preview`.

---

## 5. Decisions still needed from you

Down from six to three. None blocks S1; they bite at S2.5, P2 and P3.

1. **Member `status` — current vs alumni** (§2.6). It lived only in the deleted seed, so it is now sourced from nothing, yet SPEC:119 requires Alumni as both a filter and a card state. Class years are in the repo (four members are Class of 2026; today is Aug 2026), but *inferring* alumni from a class year is exactly the kind of guess the seed got burned for. **Options:** (a) you confirm the four 2026s are alumni, (b) everyone ships `current` and the Alumni filter renders only when some member carries it, (c) add it to the provenance table. I would take **(a)** if you can confirm, else **(b)**.
2. **`/projects` filter row** (§2.9) — omit it entirely while `PERSONAL` is 0, per SPEC's own hide-a-zero-filter rule? I recommend yes; `kind` still ships in the data so it is a render change later.
3. **`/join` sponsor route** (§2.10) — the president's email is not in the repo and not on the provenance table. Kanan Guliyev is president. Supply an address, or the sponsor route falls back to `sparc@studentorgs.suffolk.edu`?

---

## 6. What I am doing next

Per your instruction: create `redesign/foundation`, do **S1 myself** — token layer, layout, fonts,
logo, images, redirects, favicon, `verify.sh` with the readable manifest — then report the commit
and the first verify run before dispatching S2 and S2.5.

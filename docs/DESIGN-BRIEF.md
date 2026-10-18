# SPARC design brief: admin, dashboard, board, /links, auth

Status: October 2026. Governs layout and interaction for the screens in `docs/ARCHITECTURE.md` ("Routing and layouts", "Auth and admin surface"). Visual language is the site's own (`app/globals.css`, `components/ui/*`); where this brief and a token rule disagree, the token rule wins.
Patterns come from Mobbin (MCP tools worked). Each section cites its screens as `R<nn>`; the Reference index at the end has every link. Local PNGs are the 768px previews the Mobbin MCP returned, saved outside the repo; `img:` links are full resolution and expire about 30 days after October 2026. No browser login was used.

## 0. Rules that apply to every screen

| rule | detail |
|---|---|
| Type | Martian Mono only. **No Ultra / `PosterText`** anywhere in admin, dashboard, board or auth. Page titles `text-2xl font-medium`; section titles `MicroLabel as="h2"`; body `text-sm`; meta `text-xs` or `text-label`. Nothing under 13px, including avatar initials and chip text. |
| Colour | Semantic utilities only (`surface*`, `ink*`, `line*`, `accent*`, plus the new `danger`/`success`/`warning`). No stock palettes, no hex outside `globals.css`. |
| Accent | One accent-filled control per view: the primary action ("New event", "Save", "Sign in"). Everything else is outline or text. |
| Radius | `rounded-control` for anything clickable, `rounded-card` for content holders, `rounded-pill` for chips only. |
| Focus | Keep the global 2px accent `:focus-visible` ring. Never `outline-none` without a replacement. |
| Motion | CSS transitions ≤200ms on `--ease-out`. Drag lift, sheet slide and copy feedback all flatten under `prefers-reduced-motion`. No skeleton shimmer. |
| Feedback | No toast library. Results appear **where the action happened**: inline status text by the save button, a one-line status banner at the top of the list after a redirect (`role="status"`), field errors under fields. |
| Dialogs | Native `<dialog>` with `showModal()` (Esc closes, focus returns to the trigger). Never open a dialog from a dialog. |
| Targets | 44×44px minimum on touch (≤640px); 32px allowed for icon buttons on pointer devices. |
| Times | `<time dateTime>` with relative text ("2d ago") and the absolute date in `title`. Date-only fields use `formatDateOnly()`; instants pin America/New_York. |
| Voice | Terse and specific, like `/join`. Buttons name the verb and object: "Delete event", not "Confirm". No "Oops", no exclamation marks. |

## 1. Admin shell (`app/(admin)/admin/**`)

**Layout.** Left sidebar plus main column. No top bar on desktop.

| region | spec |
|---|---|
| Sidebar | 15rem wide, `sticky top-0 h-dvh`, `bg-surface-1 border-r border-line`, scrolls on its own if it overflows. |
| Sidebar head | `SparcMark` (24px, `text-accent`) + "SPARC" `text-sm font-semibold` + `MicroLabel` "Admin". Links to `/admin`. |
| Nav groups | **Overview** (`/admin`). **Content**: Members, Projects, Events, News, Photos, Links. **Review**: Requests (with pending count). **People** (admin only): Accounts. Group labels are `MicroLabel`, items are `text-sm`, 36px tall, icon 16px (lucide) + label. |
| Counts | Only Requests shows a count (`text-label`, pill, `bg-accent-quiet text-accent-text`), and only when > 0. No counts on other items. |
| Current section | `aria-current="page"`, `bg-surface-2 text-ink font-medium`; inactive items `text-ink-muted hover:text-ink hover:bg-surface-2`. Match by prefix, so `/admin/events/[id]` highlights Events. |
| Sidebar foot | Pinned to the bottom, divided by `border-t border-line`: "View site ↗" (opens `/` in the same tab), "Dashboard", then the account block: email (truncated, full in `title`), role `Pill`, and a "Sign out" text button. Sign out is a `<form>` POST, not a link. |
| Main | `min-w-0 flex-1`, content `max-w-page px-gutter py-8`. Edit forms narrow further (§3). |

**Mobile (≤1023px).** The sidebar is replaced by a 56px sticky top bar: mark + "Admin" + current section name, and a "Menu" button on the right. Menu opens the same nav in the site's existing `Expand` panel (the navbar's pattern, so no second disclosure component). The panel closes on navigation. The account block sits at the bottom of the panel.

**States.** 403 for a member hitting `/admin`: a page inside the site chrome: "Admin is for e-board editors." + "Go to dashboard". No shell.

References (open these before building; ids match the Reference index):
- R01 [Resend — Broadcasts, empty](https://mobbin.com/screens/e73e4e98-1628-43bb-8ec7-09e6fedeb4df) · img: https://mobbin.com/api/mcp/short/rNWN9zv4 · local: scratchpad/design-refs/01-resend-broadcasts-empty.png — sidebar with the account block pinned at the bottom
- R03 [Supabase — Project Settings, General](https://mobbin.com/screens/9497f33f-63fc-4547-9171-bbb1092bf178) · img: https://mobbin.com/api/mcp/short/UCHVbKAQ · local: scratchpad/design-refs/03-supabase-project-settings.png — mono uppercase nav group labels
- R17 [Linear — Project issues, board](https://mobbin.com/screens/fc208a44-dbf9-4f79-b9b0-db57f9840964) · img: https://mobbin.com/api/mcp/short/LC93kqm1 · local: scratchpad/design-refs/17-linear-project-board.png — quiet active row: grey fill, no accent bar

## 2. Admin list pages (one pattern for every content type)

**Layout, top to bottom.**
1. Header row: `h1` ("Events") + count in `text-ink-muted` ("12"). Primary button on the right: "New event" (accent fill). On ≤640px the button stays in the header row and shrinks to "New".
2. Toolbar: search input (left, 18rem, filters client-side; lists are tens of rows, not thousands) + `FilterChip`s. Always "All / Published / Hidden". Type-specific extras: Members "Current / Alumni / E-board"; Events "Upcoming / Past"; Projects "Proposed / In progress / Completed / Archived".
3. Status banner slot (after a create/delete redirect): "Deleted 'Fall kickoff'." with a dismiss button.
4. The list: a `<table>` at ≥641px (sr-only `<caption>`), stacked rows below.

**Row anatomy (64px tall, `border-t border-line`, last row `border-b`):**

| cell | content |
|---|---|
| Thumb | 40px square, `rounded-control`, `object-cover` from `thumb_path`. No image: `bg-surface-2` with initials or the type icon, never an empty box. |
| Title | `text-sm font-medium text-ink`, one line, truncate. **The title is the edit link** (`/admin/events/[id]`). |
| Meta | Under the title, `text-xs text-ink-muted`: the 1–2 facts that separate rows. Events: date · room. Members: role · class year. Projects: ref · status. Links: URL host. |
| State | `Pill` "Published" (outline) or "Hidden" (outline, `text-ink-muted`, dashed border). Text, not a dot alone. |
| Order | Only for manually ordered types (members, photos, links, recordings, project gallery). Two 32px icon buttons, ↑ and ↓, `aria-label="Move Allan Nguyen up"`, disabled at the ends. Events and news sort by date and show no order controls. |
| Actions | A "⋯" button (`aria-label="Actions for Fall kickoff"`) opening a small menu: "View on site ↗", "Publish"/"Unpublish", divider, "Delete…" in `text-danger`. Edit is not in the menu; the title already does it. |

**Reordering: up/down buttons, not drag, not a numeric field.** A club with 12–30 rows per list reorders a few times a semester. Up/down is one server action (swap `sort_order` with the neighbour), works with keyboard and screen readers without extra code, and cannot leave ties or gaps. A visible number field makes editors manage gaps by hand. Drag needs a library plus a keyboard fallback anyway, which is this button pair. After a move, focus stays on the same button in the moved row.

**Bulk actions: none.** No checkboxes. At this scale one-at-a-time is fast and safe, and checkbox columns are the most template-looking element of an admin.

**States.**

| state | treatment |
|---|---|
| Empty | Inside the list area: "No events yet." (`text-sm`) + one line of what they are for + "New event" outline button. No illustration. |
| Filtered empty | "No hidden events." + "Clear filters" text button. |
| Loading | `loading.tsx`: header renders, then 5 static `bg-surface-1` rows of the real row height. No shimmer. |
| Error | `error.tsx`: "Couldn't load events." + the error message in `text-xs text-ink-muted` + "Try again" (`reset()`). |
| Delete | Confirm dialog (§3), then redirect to the list with the status banner. |

**Mobile (≤640px).** Each row becomes a two-line block: thumb, then title + meta + state chip stacked; ↑/↓ and ⋯ form a column on the right at 44px each. Search goes full width; chips scroll horizontally on one line.

References (open these before building; ids match the Reference index):
- R01 [Resend — Broadcasts, empty](https://mobbin.com/screens/e73e4e98-1628-43bb-8ec7-09e6fedeb4df) · img: https://mobbin.com/api/mcp/short/rNWN9zv4 · local: scratchpad/design-refs/01-resend-broadcasts-empty.png — header, search + selects, empty box
- R06 [Shopify — Pages list](https://mobbin.com/screens/4da9f133-c769-438e-bbde-4a514861f2b6) · img: https://mobbin.com/api/mcp/short/h2mjeDsN · local: scratchpad/design-refs/06-shopify-pages-list.png — status pill column, relative Updated
- R07 [Klaviyo — Customer Agent, Content](https://mobbin.com/screens/dc2de008-16eb-4e23-85fe-65abbeda32a6) · img: https://mobbin.com/api/mcp/short/Keg8hjrD · local: scratchpad/design-refs/07-klaviyo-content-list.png — ⋮ row menu, status + type chips
- R08 [Square — Item library](https://mobbin.com/screens/ab5688a3-5fa4-4539-8f17-d131559b277a) · img: https://mobbin.com/api/mcp/short/ool5fdpf · local: scratchpad/design-refs/08-square-item-library.png — thumbnail before the title
- R09 [Uxcel — Deleting an assignment, step 1 (row menu)](https://mobbin.com/flows/141bb515-d0ab-4f8b-b4dc-6fe7706c03f1) · img: https://mobbin.com/api/mcp/short/hARV13hw · local: scratchpad/design-refs/09-uxcel-delete-row-menu.png — ⋯ → 'Delete…' menu item
- R10 [Uxcel — Deleting an assignment, step 2 (dialog)](https://mobbin.com/flows/141bb515-d0ab-4f8b-b4dc-6fe7706c03f1) · img: https://mobbin.com/api/mcp/short/FMczaH0j · local: scratchpad/design-refs/10-uxcel-delete-dialog.png — named delete dialog

## 3. Admin edit form

**Layout.** Main column `max-w-text` (44rem) plus a 18rem right rail at ≥1024px. Below 1024px the rail's blocks move **above** the form fields (Publish first).

| region | contents |
|---|---|
| Breadcrumb/header | "Events / Fall kickoff" (`text-sm text-ink-muted`, first part links back) then `h1` = the item title, or "New event". "View on site ↗" text link on the right when published. |
| Main column | Field groups as `SurfaceCard`s, each headed by a `MicroLabel as="h2"`: **Basics** (title, ref/slug, date), **Details** (description, room, URLs), **Media** (uploader, §4), plus type-specific groups (event **Recordings** as a sub-list using the §2 row pattern). |
| Rail | **Status** card: Publish switch (`role="switch"`, label "Published", helper "Visible on the site" / "Only editors can see this"). **Order** card where relevant. **Record** card: created/updated times, created by. |
| Danger section | Last in the main column, after all groups: card with `border-danger`, `MicroLabel` "Delete", one sentence on what goes ("Removes this event and its 2 recordings from the site. Images stay in the media library."), outline danger button "Delete event…". Never in the save bar. |
| Save bar | `sticky bottom-0`, full main-column width, `bg-surface border-t border-line`, 56px. Left: state text. Right: "Discard" (text button) + "Save" (accent fill). |

**Save bar states** (`aria-live="polite"` on the state text):

| state | left text | buttons |
|---|---|---|
| Clean | "No changes" (`text-ink-faint`) | Save disabled, Discard hidden |
| Dirty | "Unsaved changes" | Discard + Save |
| Saving | "Saving…" | both disabled, Save keeps its width |
| Saved | "Saved 14:02" (`text-success`) for the rest of the visit | Save disabled |
| Error | "2 fields need attention" (`text-danger`) as a button that focuses the first invalid field | Save enabled |

**Unsaved changes.** Dirty forms set `beforeunload`. In-app links (sidebar, breadcrumb) open a dialog: "Leave without saving? Your changes to Fall kickoff will be lost." with "Keep editing" (default focus) and "Discard changes" (danger outline).

**Validation.** Zod on the server is the source of truth. Client checks only format on blur (URL, email, date). Error text sits **directly under the field**, `text-xs text-danger` with a 14px alert icon, linked by `aria-describedby`; the input gets `aria-invalid` and `border-danger`. On a failed submit, focus moves to the first invalid field. Labels sit above inputs; mark optional fields "(optional)", not required ones with asterisks.

**Ref / slug field.** Monospace input with the fixed part as a non-editable prefix (`SP-`, `#`, `/news/`). New items arrive pre-filled with the proposed next value; helper text: "Next free: SP-014. Shown on the site as SP-014." Duplicate → field error "SP-014 is taken by 'Robot arm'". Existing items: editable, with the warning "Changing this breaks old links" shown on focus.

**Delete confirm.** `<dialog>`: title "Delete Fall kickoff?", body states consequences in one or two lines, buttons "Cancel" (default focus, left) and "Delete event" (filled `bg-danger text-on-danger`, right). Type-to-confirm only for **deleting a project** (it removes the board, tasks and activity): input "Type SP-014 to confirm".

**Mobile.** Single column; the save bar stays sticky at the bottom (thumb reach), buttons 44px.

References (open these before building; ids match the Reference index):
- R05 [Shopify — Product edit, unsaved](https://mobbin.com/screens/f16acb77-4a8b-48f8-9bc0-3bb9ba03d092) · img: https://mobbin.com/api/mcp/short/crKKiW9n · local: scratchpad/design-refs/05-shopify-product-edit-savebar.png — main column + status rail, Discard/Save bar (we pin ours to the bottom)
- R03 [Supabase — Project Settings, General](https://mobbin.com/screens/9497f33f-63fc-4547-9171-bbb1092bf178) · img: https://mobbin.com/api/mcp/short/UCHVbKAQ · local: scratchpad/design-refs/03-supabase-project-settings.png — grouped cards, copyable ID, Save disabled until dirty
- R02 [Resend — Account settings](https://mobbin.com/screens/f91dbd23-696d-4044-9718-653f56527456) · img: https://mobbin.com/api/mcp/short/ECxZ94lt · local: scratchpad/design-refs/02-resend-account-settings.png — delete as the last section
- R04 [Supabase — Delete account dialog](https://mobbin.com/screens/f7583e39-940b-4c4c-a816-675ec4e37d8b) · img: https://mobbin.com/api/mcp/short/ZOosn4EZ · local: scratchpad/design-refs/04-supabase-delete-account-dialog.png — type-to-confirm
- R10 [Uxcel — Deleting an assignment, step 2 (dialog)](https://mobbin.com/flows/141bb515-d0ab-4f8b-b4dc-6fe7706c03f1) · img: https://mobbin.com/api/mcp/short/FMczaH0j · local: scratchpad/design-refs/10-uxcel-delete-dialog.png — Cancel + named red button

## 4. Image uploader (`components/forms/image-upload.tsx`)

| state | spec |
|---|---|
| Empty | Dashed `border-line-strong` box, `rounded-card`, in the target aspect (members 1:1, projects/events/news 16:9, photos 4:3 frame). Centre: "Drop an image or" + outline button "Choose file". Second line `text-xs text-ink-muted`: "JPEG, PNG, WebP or AVIF. Compressed in your browser before upload." The whole box accepts drop; the button is the keyboard target (hidden `<input type="file" accept="image/*">`). Drag-over: `border-accent bg-accent-quiet`. |
| Compressing | Preview from the decoded bitmap immediately; overlay `text-xs` "Compressing…" with an indeterminate bar. |
| Uploading | Determinate 4px bar under the preview when progress is available ("Uploading 62%"), otherwise "Uploading…". Save is disabled until upload finishes. |
| Done | Preview `object-cover`. Under it, one `text-xs` line: `IMG_4412.jpg · 4.2 MB → 286 KB · 2000×1500`. Text buttons on the right: "Replace", "Remove". |
| Alt text | Required textarea directly under the preview, label "Alt text", helper "What's in the photo, for screen readers. e.g. 'Four members at a whiteboard planning a sprint.'" Empty alt blocks Save with the field error "Add alt text". |
| HEIC | Detect by MIME or `.heic/.heif` extension before decoding. Box border `border-danger`, message: "HEIC photos can't be read by browsers. Export as JPEG first (on iPhone: Share → Save as JPEG, or Settings → Camera → Formats → Most Compatible)." File input is reset. |
| Other errors | Undecodable: "Couldn't read this file. Try a JPEG or PNG." Upload failure: "Upload failed. Check your connection." + "Retry". Errors are `role="alert"`. |

**Project gallery (multi-image).** Grid of 16:9 thumbs, 4 columns ≥1024, 2 below. Each tile: position number (`text-label`), "No alt" warning chip if alt is missing, "← Earlier" / "Later →" icon buttons (`aria-label="Move image 2 earlier"`) and "Remove". The last tile is an "Add image" drop box. Same up/down logic as §2; no drag. The cover is a separate single uploader above the gallery.

References (open these before building; ids match the Reference index):
- R11 [Klaviyo — Select image, Upload](https://mobbin.com/screens/1a3e01e3-e4f2-4c1c-8ebc-5b9f39ad49b0) · img: https://mobbin.com/api/mcp/short/84AJL47M · local: scratchpad/design-refs/11-klaviyo-select-image.png — zone copy: action, accepted types, size limit
- R12 [Meetup — Add photos](https://mobbin.com/screens/14220ec2-72bd-48e9-81b4-5939534c86ec) · img: https://mobbin.com/api/mcp/short/L7DCDWoN · local: scratchpad/design-refs/12-meetup-photo-upload.png — constraints under the zone, one button

## 5. Accounts (`/admin/accounts`, admin only)

**List.** §2 pattern with these columns: person (display name `text-sm font-medium`, email `text-xs text-ink-muted` below), role `Pill` (MEMBER / EDITOR / ADMIN, outline; the signed-in admin also gets a "You" chip), member card ("Allan Nguyen →" linking to `/admin/members/[id]`, or `text-ink-faint` "No card · Link…"), created date, ⋯ menu ("Change role…", "Reset password…", "Link member card…"). Header button: "New account". No search until > 40 accounts.

**Role change.** From the ⋯ menu, a dialog with three radio options, each with one line of what it allows (taken from the Roles table). Confirm button names the change: "Make Sam an editor". You cannot change your own role, and the last admin cannot be demoted (option disabled with the reason inline).

**New account (`/admin/accounts/new`)**, single column, `max-w-text`:
1. Email, display name.
2. Role: radio, default Member.
3. Member card: radio "Link an existing card" (select of cards with no account) / "Create a new card" (name prefilled from display name) / "No card".
4. Method: radio "Temporary password" (default) / "Send invite email". The invite option is disabled until SMTP is configured, with the helper "Needs custom SMTP. See docs/CMS.md."
5. Accent button "Create account".

**One-time password screen** (a full page, not a modal, so it isn't dismissed by a stray click):
- `bg-warning-quiet` banner, `role="alert"`: "Shown once. Copy it now and send it to Sam privately. It can't be shown again."
- Read-only monospace field with the password (no ambiguous characters such as 0/O, 1/l) + "Copy" button. On click: label becomes "Copied" for 2s, announced via `aria-live`.
- "Copy sign-in message" button that copies: login URL, email, password, "Change it at /dashboard/profile after you sign in."
- One exit button: "I've sent it" → accounts list with banner "Account created for sam@…". Leaving any other way triggers `beforeunload`.

**Reset password.** Confirm dialog ("Reset Sam's password? Their current password stops working now.") → the same one-time screen.

References (open these before building; ids match the Reference index):
- R13 [Supabase — Team](https://mobbin.com/screens/70c3d7ee-8bed-48a2-8a37-1f40e7c6d63b) · img: https://mobbin.com/api/mcp/short/Wz9zdvMj · local: scratchpad/design-refs/13-supabase-team.png — role column, 'YOU' and 'INVITED' chips
- R14 [AirOps — Settings, Team](https://mobbin.com/screens/1722c6f1-6c78-48d7-b459-3dfef04cdf12) · img: https://mobbin.com/api/mcp/short/BYtUkvjs · local: scratchpad/design-refs/14-airops-team.png — role select per row, self row protected
- R15 [Mintlify — Save your client secret](https://mobbin.com/screens/773c3d56-7b5b-4df3-ab2c-0ca63adb005d) · img: https://mobbin.com/api/mcp/short/Ujx73GzG · local: scratchpad/design-refs/15-mintlify-client-secret.png — per-field Copy, single 'I've saved it' exit
- R16 [Klaviyo — Private API key confirmation](https://mobbin.com/screens/b7d16c25-d410-46e7-98be-9bdaeabdef77) · img: https://mobbin.com/api/mcp/short/h4QhwQRd · local: scratchpad/design-refs/16-klaviyo-private-key.png — full-page 'only time' warning above the secret

## 6. Members dashboard (`/dashboard`)

**Shell (`app/(members)/layout.tsx`).** 56px sticky top bar, `border-b border-line bg-surface`: mark + "SPARC" → `/dashboard`; nav "Dashboard · Projects · Locator · Profile" (+ "Admin" for editor+) using the navbar's active style; right: "View site" and an account button (email → menu with "Sign out"). ≤1023px: nav collapses into the `Expand` menu, same as the public navbar. Content `max-w-page`.

**Layout ≥1024px:** two columns, 2fr / 1fr.

| region | contents |
|---|---|
| Header | `h1` = display name (`text-2xl`), `text-sm text-ink-muted` "Member · joined Sep 2026". No greeting copy. |
| Left: My tasks | Tasks assigned to me across projects, open only, due soonest first, max 5: title, project ref, column name, due date. "All my tasks" link if more. |
| Left: My projects | Compact rows (not the full §7 card): title, status chip, progress bar + "7/12", last activity. Row links to the board. |
| Left: My requests | Requests I made with status "Proposed": title, submitted date, "Waiting for e-board review". Declined/approved ones drop off (approved show up under My projects). |
| Right: My card | The real `PersonCard`, exactly as it renders on `/about` (true preview, not a mock). Below: "Edit profile" outline button and a line "Published on /about" or "Hidden from /about". |

**Brand-new member.** Same layout, nothing hidden. Card column: if photo or bio is missing, one line above the preview: "Your card has no photo or bio yet." + "Edit profile". My tasks: "Nothing assigned to you." My projects: "You're not on a project yet." + "Browse projects" and "Request a project" text links. My requests is omitted when empty. No checklist, progress ring or confetti.

**Mobile.** One column; the card moves **first** (it's what a new member came to fix), then tasks, projects, requests.

References (open these before building; ids match the Reference index):
- R19 [Linear — Project overview](https://mobbin.com/screens/e88b6bd7-3d4b-4e1e-8cd7-a9d2a6852795) · img: https://mobbin.com/api/mcp/short/bVAjvRA2 · local: scratchpad/design-refs/19-linear-project-overview.png — progress + activity side column
- R22 [Basecamp — Home](https://mobbin.com/screens/0a470a07-5a8b-4524-8fe8-5af7febb3d1f) · img: https://mobbin.com/api/mcp/short/PkJZNv39 · local: scratchpad/design-refs/22-basecamp-home.png — quiet project cards with avatars

## 7. Projects index for members (`/dashboard/projects`)

**Layout.** Header: `h1` "Projects" + accent button "Request a project" (the page's one primary action). Toolbar: `FilterChip`s "Mine" / "All" (default Mine if I have any, else All), then status chips with counts. Sort: last activity, newest first. **Card grid**: 3 columns ≥1024, 2 ≥641, 1 below, `gap-4`. Use a grid, not a list: projects are few (< 30), and the cards carry avatars and progress that need room.

**Card anatomy** (`SurfaceCard as="article"`, `p-4`, whole card clickable via a stretched title link):

| row | content |
|---|---|
| 1 | Ref `MicroLabel` ("SP-014") left; status chip right: `Pill` with a 6px dot. Proposed = `warning`, In progress = `accent`, Completed = `success`, Archived = `ink-faint`. The dot is never the only signal. |
| 2 | Title `text-lg font-medium`, 2-line clamp. |
| 3 | Methodology `Pill` outline ("SCRUM"). |
| 4 | "Supervisor" `MicroLabel` + name `text-sm` + kind chip ("FACULTY" / "STUDENT", outline). |
| 5 | Progress: 4px bar, track `bg-line`, fill `bg-ink` (`bg-success` when completed), `role="progressbar"` with `aria-valuetext="7 of 12 tasks done"`. Label `text-xs`: "7/12 tasks". No tasks yet: "No tasks yet", no bar. |
| 6 | Avatars left (24px, overlap −6px, max 4 + "+2", names in `title` and sr-only list); "Updated 2d ago" `text-xs text-ink-muted` and a GitHub icon link (44px target, `relative z-10` above the stretched link, `aria-label="SP-014 on GitHub"`) on the right. |

**States.** Empty "Mine": "You're not on a project." + "Show all projects". Empty "All": "No projects yet." + "Request a project". Loading: 6 static card skeletons.

**Request form (`/dashboard/projects/new`).** Single column `max-w-text`. Fields: Title; Summary (one line, 140 chars, counter); Description (textarea); Kind (radio: Team / Personal); Methodology (four radio cards, each with one plain line: "Kanban: continuous flow, WIP limits, no sprints", "Scrumban: flow with optional sprints", "Scrum: fixed sprints with a goal", "SAFe: iterations grouped into PIs, for larger teams"); Proposed supervisor (radio Faculty / Student, then a member select or free-text name); GitHub repo URL (optional). Button "Send request". Success → `/dashboard` with banner "Request sent. It shows under My requests until the e-board reviews it."

**Admin side (`/admin/projects/requests`).** Each request is a `SurfaceCard` with everything inline (no expand): title, requester, summary, description, methodology, proposed supervisor, repo. Actions: "Approve…" (accent) opens a dialog to confirm supervisor and methodology, because approval builds the board from the template ("Creates a Scrum board with 5 columns."); "Decline…" (outline) opens a plain confirm.

References (open these before building; ids match the Reference index):
- R22 [Basecamp — Home](https://mobbin.com/screens/0a470a07-5a8b-4524-8fe8-5af7febb3d1f) · img: https://mobbin.com/api/mcp/short/PkJZNv39 · local: scratchpad/design-refs/22-basecamp-home.png — avatar stack, no stats
- R23 [Replit — Projects](https://mobbin.com/screens/288507ae-2e5d-4e8e-b6c0-705476c44fd1) · img: https://mobbin.com/api/mcp/short/bARrpI9Z · local: scratchpad/design-refs/23-replit-projects.png — card grid + filters (we drop the grid/list toggle)
- R19 [Linear — Project overview](https://mobbin.com/screens/e88b6bd7-3d4b-4e1e-8cd7-a9d2a6852795) · img: https://mobbin.com/api/mcp/short/bVAjvRA2 · local: scratchpad/design-refs/19-linear-project-overview.png — progress counts, lead, status
- R24 [Square — Projects, board](https://mobbin.com/screens/9aa8d94b-13fc-4f58-b802-2699c02c8cbb) · img: https://mobbin.com/api/mcp/short/8ihKzvoq · local: scratchpad/design-refs/24-square-projects-board.png — 'Last activity' line on cards

## 8. Project board (`/dashboard/projects/[id]`)

**Layout.** The board breaks out of `max-w-page` and uses the full viewport width.

| region | spec |
|---|---|
| Header (scrolls away) | Ref `MicroLabel`, `h1` title `text-2xl`, status chip, methodology pill, supervisor + kind chip, GitHub link. |
| Tabs (sticky under the shell bar) | "Board · Activity · Members", plus "Sprints" (or "Iterations" for SAFe) when the methodology uses them. Tabs are links (`?view=activity`) with `aria-current`. |
| Toolbar (Board tab) | Sprint selector (when applicable), "Assignee" filter (Me / anyone), "New task" outline button (adds to the first non-backlog column). |
| Columns | 18rem fixed width, `gap-3`, the row scrolls horizontally (`overflow-x-auto`, visible scrollbar). Column `bg-surface-1 rounded-card p-2`, cards stack with `gap-2`, column scrolls vertically inside a `max-h` so headers stay visible. |

**Column header.** Name `text-sm font-medium`, count `text-label text-ink-muted`. With a WIP limit the count reads "2/3". Over the limit: "4/3" in `text-warning`, a 2px `border-t-warning` on the column, and visible text "Over WIP limit" under the name (not colour alone). Done columns (`is_done`) show a check icon before the name. "⋯" menu for editors: rename, set WIP limit.

**Card anatomy** (`bg-surface border border-line rounded-card p-3`, is a `<button>` that opens task detail):
- Row 1: title `text-sm font-medium`, 3-line clamp.
- Row 2 (`text-xs text-ink-muted`, left to right): priority glyph (signal bars for low/medium/high, filled `text-danger` alert icon for urgent; sr-only "Priority: high"), points "3 pt", due date "Oct 21" (`text-warning` within 2 days, `text-danger` + word "Overdue" when past, plain when done), GitHub icon if `github_url`. Assignee avatar 24px pinned right; none = dashed empty circle with sr-only "Unassigned".
- No labels, cover images or description previews.

**Task detail.** A right-side sheet (`<dialog>`, 30rem, full-screen ≤640px): title (editable), column select, sprint select, priority, points, assignee, due date, GitHub URL, description, and the task's own activity at the bottom. Saves per field on blur/change with inline "Saved". Delete at the bottom with the §3 confirm.

**Drag and drop.** Pointer drag with a 4px activation distance. While dragging: the card gets the `lift` shadow and 2° tilt (none under reduced motion), a 2px `bg-accent` insertion line marks the drop slot, the target column turns `bg-surface-2`. Dropping into a full WIP column is allowed but the header goes into the over-limit state. The move is optimistic; on server failure the card returns and a line appears above the board: "Couldn't move 'Fix nav'. It's back in Review." (`role="alert"`).

**Keyboard / no-drag fallback (required, not optional).**
- Each card has a "Move" item in its ⋯ menu (also reachable with `M` while the card is focused): a menu listing the columns (current one disabled), then "Move to top", "Move up", "Move down", "Move to bottom", then "Move to sprint ▸".
- If the drag library offers a keyboard sensor, enable it as well: Space lifts, arrows move, Space drops, Esc cancels, each step announced in an `aria-live` region ("Fix nav, In Progress, position 2 of 3").
- After any move, focus follows the card.

**Add card.** "+ Add task" text button at the bottom of every column. It turns into an inline textarea (title only): Enter saves and keeps the textarea open for the next title, Esc closes, Shift+Enter is a newline. Full fields are set in the detail sheet.

**Sprint selector (Scrum, Scrumban, SAFe).** A select button in the toolbar: "Sprint 3 · Oct 6–19 · 6 days left". Options grouped: Current, Upcoming, Past, then "All sprints". Under the toolbar, one line `text-sm text-ink-muted`: the sprint goal. Filtering rule: the backlog column (Backlog / Product Backlog / Program Backlog) always shows tasks with no sprint; other columns show the selected sprint only. Scrum defaults to the current sprint; Scrumban defaults to "All sprints". No sprint yet: "No sprints yet." + "Plan a sprint" link to the Sprints tab.

**SAFe PI grouping.** Iterations are named "PI 2 · Iteration 3" by convention. The selector groups options under PI headings (`<optgroup>`-style: "PI 2" then its iterations) and the toolbar shows a "PI 2" chip next to the iteration name. The Sprints tab lists PIs as sections, each with its iterations as rows (name, dates, goal, done/total). Everything else uses the word "Iteration", never "Sprint".

**Activity tab.** Newest first, grouped by day ("Today", "Yesterday", "Oct 12"). Each line: 20px avatar, sentence `text-sm` ("Allan moved **Fix nav** to Review"), time `text-xs text-ink-muted` on the right. Task names link to the task. 50 at a time + "Show older".

**Members tab.** Supervisor first (name, kind chip, "Supervisor"). Then members: avatar, name, "Lead"/"Member" chip, joined date. Leads and editors get "Add member" (combobox of profiles) and per-row "Remove…" (confirm dialog). Hidden for others.

**Board states.** New board: columns render empty with "+ Add task"; the first column also says "Add the first task." Read-only viewers (members not on the project) see no add, move or drag controls and a line under the header: "You can view this board. Only project members can edit it."

**Mobile (≤640px): snap-scrolled columns, not tabs, no drag.** Each column is 85vw with the next one peeking, `scroll-snap-type: x mandatory`. Above them, a sticky strip of column names with counts acts as a jump index (tap scrolls to the column; the visible one has `aria-current`). Drag is off on touch at this width; long-press drag across snap columns is unreliable. Moving is done with the card's Move menu. Tabs and sprint selector stay; the toolbar wraps to two lines.

References (open these before building; ids match the Reference index):
- R17 [Linear — Project issues, board](https://mobbin.com/screens/fc208a44-dbf9-4f79-b9b0-db57f9840964) · img: https://mobbin.com/api/mcp/short/LC93kqm1 · local: scratchpad/design-refs/17-linear-project-board.png — column count 'Todo 2 / 3', card meta, drag tilt, hidden-by-filter line
- R18 [Linear — Project issues, grouped list](https://mobbin.com/screens/ef923b0e-9a40-4fdd-80f2-f3aafb4f36ce) · img: https://mobbin.com/api/mcp/short/PeHAzzU0 · local: scratchpad/design-refs/18-linear-issues-grouped.png — grouped headers with counts
- R19 [Linear — Project overview](https://mobbin.com/screens/e88b6bd7-3d4b-4e1e-8cd7-a9d2a6852795) · img: https://mobbin.com/api/mcp/short/bVAjvRA2 · local: scratchpad/design-refs/19-linear-project-overview.png — activity sentences with avatars
- R20 [Jira Cloud — Board (iOS)](https://mobbin.com/screens/6a847e41-d3f0-446b-bb98-09faf22c2f8e) · img: https://mobbin.com/api/mcp/short/cBwE6h2c · local: scratchpad/design-refs/20-jira-ios-board.png — 85% column with peek, '+ Create' at column end, filter chips
- R21 [Trello — Board (iOS)](https://mobbin.com/screens/444ee363-b693-4ba4-9b39-af4eb5763a22) · img: https://mobbin.com/api/mcp/short/qKPfpU8h · local: scratchpad/design-refs/21-trello-ios-board.png — snap lists, '+ Add card', page dots (we replace dots with a labelled strip)
- R24 [Square — Projects, board](https://mobbin.com/screens/9aa8d94b-13fc-4f58-b802-2699c02c8cbb) · img: https://mobbin.com/api/mcp/short/8ihKzvoq · local: scratchpad/design-refs/24-square-projects-board.png — column header + card meta, last activity

## 9. `/links` (public)

Lives in `app/(site)` with the normal navbar and footer. Designed for phones first: most traffic comes from an Instagram/Discord bio tap.

| element | spec |
|---|---|
| Column | `max-w-[30rem] mx-auto px-gutter py-10`. Same width at every breakpoint; desktop just centres it. |
| Header | `SparcMark` 48px `text-accent`, then "SPARC" `text-xl font-semibold`, then one line `text-sm text-ink-muted` (the site description, trimmed). Centred. No photo, no Ultra. |
| Links | `<ul>` of full-width `<a>`s, `gap-3`. Each: `rounded-control border border-line bg-surface-1 px-4 min-h-14` (56px), lucide icon 20px left, label `text-base font-medium` left-aligned, `ArrowUpRight` 16px right for external URLs. Optional `description` as a second line `text-xs text-ink-muted`. Hover: `border-line-strong` + `lift`. Focus: global ring. |
| Order | `sort_order` from the DB. All links get the same treatment; no accent fill, no "featured" styling (the schema has no field for it, and one loud button breaks the list). |
| Social row | None in v1. Discord, GitHub and email are links in the list; a second icon row would duplicate them and drift. |
| Empty | "No links right now." + link to `/join`. |
| Dark / dim | Tokens only; no per-link brand colours. Icons are `currentColor`. |

**Taken from Linktree:** one column, full-width buttons, fixed order, label-first, works one-handed. **Avoid from Linktree:** background art behind buttons, centred labels that misalign with icons, per-link ⋯ menus, share sheets, "Join Linktree" footers. **Taken from Bento:** short bio under the name. **Avoid from Bento:** the multi-size tile grid; it reads well on desktop and badly in a phone bio tap, and it needs per-link images we don't have.

References (open these before building; ids match the Reference index):
- R25 [Linktree — Links profile (iOS)](https://mobbin.com/screens/edc7350d-3d39-4e8b-871c-139581a956e4) · img: https://mobbin.com/api/mcp/short/2rquO7c6 · local: scratchpad/design-refs/25-linktree-ios-links.png — stacked full-width buttons under name + bio
- R26 [Linktree — Template gallery (site section)](https://mobbin.com/sites/sections/4237002c-e0f9-45a1-b145-9550b8ac4cb1) · img: https://mobbin.com/api/mcp/short/kD0YYfnR · local: scratchpad/design-refs/26-linktree-site-templates.png — templates: what to avoid
- R27 [Bento — Profile (site section)](https://mobbin.com/sites/sections/e548be3e-b35f-496a-8816-e3ea6609146b) · img: https://mobbin.com/api/mcp/short/5GZCbIzo · local: scratchpad/design-refs/27-bento-profile.png — bio beside the name; tile grid rejected

## 10. Login, set password, forgot password (`app/(auth)`)

**Layout (all three).** Minimal chrome: no navbar. A top-left "← SPARC" text link to `/`. Centred card, `max-w-[24rem] w-full`, `SurfaceCard` with `p-6`, vertically centred with `min-h-dvh grid place-items-center`. Above the card: `SparcMark` 32px `text-accent`. ≤640px: no card border/background, fields go edge to edge within the gutter.

**`/login`.**
- `h1` "Sign in" `text-xl font-medium`. No sub-headline.
- Email, then Password. "Forgot password?" sits on the right of the Password label row. Password has a "Show" text toggle (`aria-pressed`).
- Accent "Sign in" button, full width. While pending: "Signing in…", disabled.
- Credential error: a `bg-danger-quiet` block **above the fields**, `role="alert"`: "Email or password is wrong." Fields keep their values (except password), focus moves to the password field. Field-level format errors go under the field.
- Footer line `text-xs text-ink-muted`: "Accounts are made by the e-board. Ask in Discord if you need one." **No sign-up link.**
- Already signed in: replace the form with "Signed in as sam@…" + accent "Go to dashboard" + text button "Sign out". Redirect only when there is a `?next=`.

**`/forgot-password`.** Email field + "Send reset link". Always the same result, whether or not the account exists: "If that email has an account, a reset link is on its way." Under it, because SMTP may not be set up: "No email after a few minutes? Ask an admin to reset your password." Rate-limit error: "Too many requests. Try again in an hour."

**`/auth/update-password` (invite, recovery, or a member changing a temp password).**
- Heading by entry type: "Set your password" (invite) or "Choose a new password" (recovery).
- Email shown read-only at the top as a filled row (`bg-surface-2`, `text-sm`), so people know which account they are setting.
- New password + Confirm. Rules listed under the field **before** typing ("At least 8 characters."), each turning `text-success` with a check as it is met.
- Success → `/dashboard` with banner "Password set. You're signed in."
- Expired or used link (from `/auth/confirm`): no form. "This link has expired or was already used." + "Request a new link" (→ `/forgot-password`) + "Or ask an admin for a temporary password."

References (open these before building; ids match the Reference index):
- R28 [Shopify — Log in, wrong password](https://mobbin.com/screens/50eb7f20-161a-4a0e-9c7f-a8e24f282ccd) · img: https://mobbin.com/api/mcp/short/cqePE1NC · local: scratchpad/design-refs/28-shopify-login.png — read-only email row, error under the field
- R29 [Basecamp — Log in, error](https://mobbin.com/screens/fc4b09cc-c993-4de6-9504-a641640313bc) · img: https://mobbin.com/api/mcp/short/Q4O6ta7B · local: scratchpad/design-refs/29-basecamp-login.png — credential error block above the fields
- R30 [Resend — Log in](https://mobbin.com/screens/f66a3de6-e328-43db-87eb-9a2271aab64f) · img: https://mobbin.com/api/mcp/short/FIPyDMPe · local: scratchpad/design-refs/30-resend-login.png — 'Forgot password?' on the label row, show toggle

## 11. Tokens to add to `globals.css`

Add to the `:root, .light`, `.dark` and `.dim` blocks, and map them in `@theme inline` as `--color-danger`, `--color-danger-quiet`, `--color-on-danger`, `--color-success`, `--color-success-quiet`, `--color-warning`, `--color-warning-quiet`. Danger leans orange-red so it never reads as the pink accent; every danger use also carries a word ("Delete", "Overdue").

| var | light | dark | dim | use |
|---|---|---|---|---|
| `--danger` | `#c0341d` | `#ff7a5c` | `#ff8a6e` | error text, destructive fill and borders |
| `--danger-quiet` | `#fbe9e5` | `#2a1210` | `#3a1416` | error banner background |
| `--on-danger` | `#ffffff` | `#0d0a0b` | `#1e0911` | text on a filled destructive button |
| `--success` | `#1f7a4d` | `#4cc38a` | `#5fcf98` | "Saved", met password rules, completed status |
| `--success-quiet` | `#e6f2eb` | `#0f2219` | `#16281f` | success banner background |
| `--warning` | `#8a5a00` | `#f0b43c` | `#f3be55` | over WIP limit, due soon, proposed status |
| `--warning-quiet` | `#fbf0d9` | `#2a1f0a` | `#36260e` | one-time-password banner, HEIC notice |

Estimated contrast against each theme's `--n-0`: light danger ≈ 7.8:1, success ≈ 5.0:1, warning ≈ 5.6:1; dark and dim text values ≥ 7:1. Check these with a contrast tool before merging, including each text colour on its own `-quiet` background (target 4.5:1).

## 12. Do not

- Stat tiles with sparklines, trend arrows or "+12% this week". The overview shows counts as plain text in a short table, and pending requests first.
- Gradient or pastel-tinted hero cards, "Welcome back!" banners, illustrations in empty states.
- An icon inside a tinted circle beside every heading, row or empty state.
- Toasts for routine saves; modal on modal; confirm dialogs for reversible actions (publish/unpublish, reorder, move card).
- Checkbox columns and bulk-action bars.
- Coloured dots or colour-only status. Every status has its word.
- Avatar colour palettes generated from names (initials sit on `bg-surface-2`), or placeholder text as the only label.
- Global `⌘K` search, notification bells, "What's new" popovers, onboarding checklists with progress rings.
- Ultra, poster sizes, or text under 13px anywhere on these screens.
- Stock `zinc-*`/`red-*` utilities or the legacy `components/ui/button.tsx` and `card.tsx`.
- Drag as the only way to reorder or move anything.

## Reference index

Local paths are relative to the session scratchpad (`/private/tmp/claude-501/-Volumes-ALLAN-DRIVE-sparc-website/20ca7392-5b52-46c6-86ad-dfb05f8e850d/scratchpad/`). Third-party screenshots are not committed to the repo.

| id | app | screen / flow | Mobbin | image | local | what to look at |
|---|---|---|---|---|---|---|
| R01 | Resend | Broadcasts, empty | [open](https://mobbin.com/screens/e73e4e98-1628-43bb-8ec7-09e6fedeb4df) | https://mobbin.com/api/mcp/short/rNWN9zv4 | design-refs/01-resend-broadcasts-empty.png | Sidebar of 10 icon+label items with the account pinned bottom-left; h1 + one dark 'Create email' button top right; full-width search + 'All Statuses'/'All Audiences' selects; bordered empty box: title, two lines, the same Create button. |
| R02 | Resend | Account settings | [open](https://mobbin.com/screens/f91dbd23-696d-4044-9718-653f56527456) | https://mobbin.com/api/mcp/short/ECxZ94lt | design-refs/02-resend-account-settings.png | One bordered card per topic (Invites, Teams, Authentication, MFA, Delete account), each a title + one-line description; delete is the last card, no red. |
| R03 | Supabase | Project Settings, General | [open](https://mobbin.com/screens/9497f33f-63fc-4547-9171-bbb1092bf178) | https://mobbin.com/api/mcp/short/UCHVbKAQ | design-refs/03-supabase-project-settings.png | Mono uppercase group labels in the settings nav; card rows with label + helper left and input right; read-only Project ID with a Copy button; 'Save changes' disabled bottom-right of the card until dirty. |
| R04 | Supabase | Delete account dialog | [open](https://mobbin.com/screens/f7583e39-940b-4c4c-a816-675ec4e37d8b) | https://mobbin.com/api/mcp/short/ZOosn4EZ | design-refs/04-supabase-delete-account-dialog.png | Question title, 'cannot be undone' in bold, 'Please type <email> to confirm' input, full-width tinted destructive button; the page's Danger zone section shows behind it. |
| R05 | Shopify | Product edit, unsaved | [open](https://mobbin.com/screens/f16acb77-4a8b-48f8-9bc0-3bb9ba03d092) | https://mobbin.com/api/mcp/short/crKKiW9n | design-refs/05-shopify-product-edit-savebar.png | Dark bar 'Unsaved changes' with Discard + Save; title row with 'Active' badge; main column cards (Title, Description, Media, Category, Price); right rail cards (Status select, Publishing, Organization). |
| R06 | Shopify | Pages list | [open](https://mobbin.com/screens/4da9f133-c769-438e-bbde-4a514861f2b6) | https://mobbin.com/api/mcp/short/h2mjeDsN | design-refs/06-shopify-pages-list.png | 'Add page' top right; table Title / Visibility ('Visible' pill) / muted content excerpt / relative Updated right-aligned; compact rows. |
| R07 | Klaviyo | Customer Agent, Content | [open](https://mobbin.com/screens/dc2de008-16eb-4e23-85fe-65abbeda32a6) | https://mobbin.com/api/mcp/short/Keg8hjrD | design-refs/07-klaviyo-content-list.png | Name as link, Status chip (Syncing/Live), Type chip, Updated date, vertical ⋮ at row end; 'Show 25' + '1–5 of 5' footer. |
| R08 | Square | Item library | [open](https://mobbin.com/screens/ab5688a3-5fa4-4539-8f17-d131559b277a) | https://mobbin.com/api/mcp/short/ool5fdpf | design-refs/08-square-item-library.png | Small square thumbnails before the name; status pill column (Available / Sold out); ⋯ at row end; search + filter pills; 'Create item' top right. Ignore the checkbox column. |
| R09 | Uxcel | Deleting an assignment, step 1 (row menu) | [open](https://mobbin.com/flows/141bb515-d0ab-4f8b-b4dc-6fe7706c03f1) | https://mobbin.com/api/mcp/short/hARV13hw | design-refs/09-uxcel-delete-row-menu.png | Row ⋯ opens a two-item menu 'Edit due date…' / 'Delete assignment…' (the ellipsis signals a dialog follows). |
| R10 | Uxcel | Deleting an assignment, step 2 (dialog) | [open](https://mobbin.com/flows/141bb515-d0ab-4f8b-b4dc-6fe7706c03f1) | https://mobbin.com/api/mcp/short/FMczaH0j | design-refs/10-uxcel-delete-dialog.png | 'Delete assignment?' title, one consequence sentence, type-the-phrase input, Cancel outline + red 'Delete assignment' bottom right. |
| R11 | Klaviyo | Select image, Upload | [open](https://mobbin.com/screens/1a3e01e3-e4f2-4c1c-8ebc-5b9f39ad49b0) | https://mobbin.com/api/mcp/short/84AJL47M | design-refs/11-klaviyo-select-image.png | Grey dashed drop zone: 'Drag and drop or select images', accepted types, 'Maximum file size 10 MB', 'Select image' button inside the zone. |
| R12 | Meetup | Add photos | [open](https://mobbin.com/screens/14220ec2-72bd-48e9-81b4-5939534c86ec) | https://mobbin.com/api/mcp/short/L7DCDWoN | design-refs/12-meetup-photo-upload.png | Bordered zone with one sentence + dark 'Choose photos' button; file constraints as small text under the zone, not inside it. |
| R13 | Supabase | Team | [open](https://mobbin.com/screens/70c3d7ee-8bed-48a2-8a37-1f40e7c6d63b) | https://mobbin.com/api/mcp/short/Wz9zdvMj | design-refs/13-supabase-team.png | 'Filter members' left, 'Invite members' right; MEMBER / MFA / ROLE columns; 'YOU' and 'INVITED' chips beside emails; per-row 'Manage access' + ⋮; '3 members' footer. |
| R14 | AirOps | Settings, Team | [open](https://mobbin.com/screens/1722c6f1-6c78-48d7-b459-3dfef04cdf12) | https://mobbin.com/api/mcp/short/BYtUkvjs | design-refs/14-airops-team.png | Each person a bordered row: avatar, name, 'Pending' chip, email, role select, 'Resend invite', trash; the trash is disabled on your own row. |
| R15 | Mintlify | Save your client secret | [open](https://mobbin.com/screens/773c3d56-7b5b-4df3-ab2c-0ca63adb005d) | https://mobbin.com/api/mcp/short/Ujx73GzG | design-refs/15-mintlify-client-secret.png | 'displayed only once' line; tinted box with read-only fields each with its own Copy button; one full-width exit 'I've saved it'. |
| R16 | Klaviyo | Private API key confirmation | [open](https://mobbin.com/screens/b7d16c25-d410-46e7-98be-9bdaeabdef77) | https://mobbin.com/api/mcp/short/h4QhwQRd | design-refs/16-klaviyo-private-key.png | Full page (not modal); yellow warning 'This is the only time…' above the key; key field + copy + download icons; Do/Don't card below. |
| R17 | Linear | Project issues, board | [open](https://mobbin.com/screens/fc208a44-dbf9-4f79-b9b0-db57f9840964) | https://mobbin.com/api/mcp/short/LC93kqm1 | design-refs/17-linear-project-board.png | Column header: status icon, name, count ('Todo 2 / 3'), ⋯ and +; white cards on grey columns: ID, title, priority bars, date, label chips, avatar top-right; dragged card floats tilted; '1 issue hidden by filters · Clear Filters' footer. |
| R18 | Linear | Project issues, grouped list | [open](https://mobbin.com/screens/ef923b0e-9a40-4fdd-80f2-f3aafb4f36ce) | https://mobbin.com/api/mcp/short/PeHAzzU0 | design-refs/18-linear-issues-grouped.png | Group headers 'In Progress 2', 'Todo 2/3', 'Done 11' with + at the right; one-line rows; '8/8' sub-progress inline. |
| R19 | Linear | Project overview | [open](https://mobbin.com/screens/e88b6bd7-3d4b-4e1e-8cd7-a9d2a6852795) | https://mobbin.com/api/mcp/short/bVAjvRA2 | design-refs/19-linear-project-overview.png | Tabs Overview/Updates/Issues; properties row; right column Progress (Scope / Started / Completed counts), Assignees '68% of 14', Activity: avatar + one sentence + date per line. |
| R20 | Jira Cloud | Board (iOS) | [open](https://mobbin.com/screens/6a847e41-d3f0-446b-bb98-09faf22c2f8e) | https://mobbin.com/api/mcp/short/cBwE6h2c | design-refs/20-jira-ios-board.png | Tabs Summary/Board/All Work; Assignee/Status filter chips; one column ~85% wide ('TO DO 2') with the next peeking; card: title, key, priority chevrons; '+ Create' at column end; page dots. |
| R21 | Trello | Board (iOS) | [open](https://mobbin.com/screens/444ee363-b693-4ba4-9b39-af4eb5763a22) | https://mobbin.com/api/mcp/short/qKPfpU8h | design-refs/21-trello-ios-board.png | One list ~90% wide, next list's edge visible; header + ⋯; card meta icons and avatars bottom-right; '+ Add card' at the list foot; 4 page dots. |
| R22 | Basecamp | Home | [open](https://mobbin.com/screens/0a470a07-5a8b-4524-8fe8-5af7febb3d1f) | https://mobbin.com/api/mcp/short/PkJZNv39 | design-refs/22-basecamp-home.png | Narrow centred column; three outline buttons; project cards = title + one-line description + avatar stack; no stats. |
| R23 | Replit | Projects | [open](https://mobbin.com/screens/288507ae-2e5d-4e8e-b6c0-705476c44fd1) | https://mobbin.com/api/mcp/short/bARrpI9Z | design-refs/23-replit-projects.png | h1, search + two filter selects + clear ×, grid/list toggle; 4-column cards with preview, title, privacy icon + 'yesterday'. |
| R24 | Square | Projects, board | [open](https://mobbin.com/screens/9aa8d94b-13fc-4f58-b802-2699c02c8cbb) | https://mobbin.com/api/mcp/short/8ihKzvoq | design-refs/24-square-projects-board.png | 'View as Board' + 'Sort by Recent activity'; five columns; card: bold name, uppercase sub-line, date, 'Last activity: 5 minutes ago'. |
| R25 | Linktree | Links profile (iOS) | [open](https://mobbin.com/screens/edc7350d-3d39-4e8b-871c-139581a956e4) | https://mobbin.com/api/mcp/short/2rquO7c6 | design-refs/25-linktree-ios-links.png | Avatar, handle, one-line bio, one social icon, section label, full-width rounded buttons (thumb left, centred label, ⋮ right) over a busy illustrated background. |
| R26 | Linktree | Template gallery (site section) | [open](https://mobbin.com/sites/sections/4237002c-e0f9-45a1-b145-9550b8ac4cb1) | https://mobbin.com/api/mcp/short/kD0YYfnR | design-refs/26-linktree-site-templates.png | Four phone templates: avatar, name, bio, 3–4 stacked buttons, social icon row under the buttons; photo/gradient backgrounds and shadowed buttons (what to avoid). |
| R27 | Bento | Profile (site section) | [open](https://mobbin.com/sites/sections/e548be3e-b35f-496a-8816-e3ea6609146b) | https://mobbin.com/api/mcp/short/5GZCbIzo | design-refs/27-bento-profile.png | Left column: avatar, bold name, two-line bio. Right: masonry tiles of mixed sizes (social cards, GitHub grid, image). |
| R28 | Shopify | Log in, wrong password | [open](https://mobbin.com/screens/50eb7f20-161a-4a0e-9c7f-a8e24f282ccd) | https://mobbin.com/api/mcp/short/cqePE1NC | design-refs/28-shopify-login.png | Centred card; email shown as a grey read-only row with 'Change email'; password field tinted with 'Incorrect password' + icon under it; 'Forgot password?' below; full-width Log in. |
| R29 | Basecamp | Log in, error | [open](https://mobbin.com/screens/fc4b09cc-c993-4de6-9504-a641640313bc) | https://mobbin.com/api/mcp/short/Q4O6ta7B | design-refs/29-basecamp-login.png | Yellow block above the fields: 'We didn't recognize that password.' + reset link; email kept; full-width Log in. |
| R30 | Resend | Log in | [open](https://mobbin.com/screens/f66a3de6-e328-43db-87eb-9a2271aab64f) | https://mobbin.com/api/mcp/short/FIPyDMPe | design-refs/30-resend-login.png | '← Home' top-left; mark + title; Password label row with 'Forgot your password?' right-aligned; eye toggle inside the field. |

Searches run: admin dashboard, content management list, edit form settings, image upload, empty state, kanban board, project board sprint, project card progress, team members roles table, invite member, link in bio (iOS screens + site sections), login email password, delete confirmation (flows), sidebar navigation, mobile board, one-time secret, unsaved-changes save bar. The generic "mobile board" query returned unrelated screens; naming Trello and Jira returned R20–R21. No screen covered original-vs-compressed size or SAFe PI grouping; those specs come from `docs/ARCHITECTURE.md`.

---

# Redesign addendum, October 2026: dashboard calendar, Locator pages, themes, date states

Status: design, 18 October 2026. Sections 13–16 extend this brief for the
members' dashboard, the Locator screens (`docs/LOCATOR.md`) and the admin
shell. The rules in §0 and §12 still apply to every screen. References are
`M<nn>` in the index at the end; local previews live in the session
scratchpad under `design-refs/`.

## 13. Date states: every listing says whether it is still live

"Today" is always the current calendar date in America/New_York
(`isoDateOnly(new Date())`), computed on the server and passed down; it is
never hard-coded. Every listing gets one **state word** and a tone, computed
by one helper (`listingState(o, today)` in `lib/data/locator.ts`) and shown
the same way everywhere (list row, detail page, calendar):

| kind | state word (tone) | rule |
|---|---|---|
| any | **Closed** (muted) | `closed_at` set |
| any | **Hidden** (muted) | `published = false`, no `closed_at`, admin side; keeps its date line and its date section |
| internship | **Deadline passed** (muted) | `deadline_on < today` |
| internship | **Closing soon** (warning) | deadline within 14 days |
| internship | **Open** (ink) | deadline later, or no deadline ("Rolling") |
| event kinds | **Ended** (muted) | `ends_on ?? starts_on` `< today` |
| event kinds | **Today** (accent text) | starts today |
| event kinds | **Ongoing** (ink) | `starts_on <= today <= ends_on` |
| event kinds | **Upcoming** (ink) | `starts_on > today` |
| event kinds | **Undated** (muted) | no `starts_on` |
| hackathon signup | **Signup opens <date>** / **Signup open** / **Signup closes in 3 days** / **Signup closed** | from `opens_on` / `deadline_on` relative to today; shown as a second line under the event state |

Next to the state word, every row and detail page shows a **relative line**:
"Listed 3d ago" (from `posted_at ?? first_seen_at ?? created_at`) and, when
`verified_on` is older than 30 days or null on a non-sync row, "Not verified
since Sep 10" in `text-warning`. Rows in a muted state (Closed, Deadline
passed, Ended) render with `text-ink-muted` titles and sit in a collapsed
section at the bottom of the list ("Show 12 past events" / "Show 9 whose
deadline passed", using the shared `Expand`), so old posts never look current.
Dates always carry the year when it is not the current year.

## 14. Members' dashboard with the Locator calendar (`/dashboard`)

Replaces §6's hub layout. Keep the header (name, role, joined) and the
notice banner.

Layout ≥1024px: two columns, `lg:grid-cols-[1fr_20rem]`, gap 10.

Left column, in order:
1. **Calendar card** (`SurfaceCard`): `MicroLabel` "Locator calendar" with
   the month and year as `text-base font-medium`, prev / next month icon
   buttons and a "Today" text button at the right (M03, M05). A 7-column
   grid: weekday initials `text-label text-ink-muted`, then the days as
   `button`s (36px squares at ≥640px, 44px below), outside-month days
   `text-ink-faint`, today with a 1px `border-accent` ring, the selected
   day `bg-surface-2`. Under each day number: a 4px dot when the day has
   an event (`bg-ink-muted`), an accent dot when the member is **attending**
   (status interested or enrolled; M04, M06 legend idea). Multi-day events
   of 14 days or fewer mark every day of their span. Longer ones (long
   online hackathons, submission windows) mark only their start and end
   days, are labelled "starts" / "ends" (`text-xs text-ink-muted` after the
   title) in the day list, and appear once in "Coming up for you", on
   whichever of the two comes next. A legend line under the grid: "● attending
   · ● event" in `text-xs text-ink-muted` (the first dot accent). Keyboard:
   roving tabindex, arrow keys move the focused day, Enter selects,
   `aria-pressed` on the selected day, `aria-label` "Saturday, October 24:
   2 events, 1 attending".
2. **Selected day's events** right under the grid, inside the same card:
   "Sat, Oct 24" `MicroLabel`, then one line per event: kind (`Pill`),
   title as a link to `/dashboard/locator/<kind>/<id>`, location or
   "Online", and an "Enrolling" / "Interested" pill in accent when
   attending (M01's day card, M07's side list). Empty: "Nothing on Oct 18.
   Next up: HackHarvard, Oct 24 →" (link selects that day).
3. **Coming up for you**: the next five events the member is attending; if
   none, the next five upcoming events with the line "Mark 'I'm
   interested' on a listing to see it here." (M02's focus list).
4. The existing **My tasks**, **My projects**, **My requests** sections.

Right column: **My card** as before (narrower), then **Your Locator**:
three plain lines "2 enrolling · 3 interested", "4 deadlines in the next
14 days" (internships), link "Open Locator →". No tiles, no sparklines.

Data: `lib/data/calendar.ts` (server-only) `getCalendar({ from, to })` →
published conferences, networking events and hackathons whose span
overlaps `[from, to]`, each with `attending: InterestStatus | null` for
the caller (join `opportunity_interest` for `auth.uid()`), plus
`getLocatorSummary()` for the right column. The page loads one window:
the first of last month to the end of five months ahead; the calendar
navigates inside that window and shows "Beyond this window: open
Locator" at the edges.

Mobile: single column, card first (calendar), 44px day targets, the
selected-day list stays inside the card.

## 15. Locator rows and detail: one layout for all four kinds

Row (both admin and members; replaces the current meta line):

| cell | content |
|---|---|
| Left block | events: date block (day / MON); internships: organizer initials; closed or ended rows `opacity-60` |
| Title line | title (link), then `Pill`s: kind-specific (terms or area), "via Source" (admin only), "3 interested" |
| Meta line | `organizer · location · dates` ("Oct 24–25, 2026", "Due Nov 15, 2026", "Rolling") |
| Right column | the **state word** (§13) on the first line with its tone, "Listed 3d ago" under it in `text-xs text-ink-muted`; admin only: the StatePill (Published / Hidden) and the ⋯ menu |

Sections: dated kinds: **This week** (including events under way that span
14 days or fewer), **Running now** (under way and longer than 14 days, both
ends counted), **Later this month**, then one per month, then **Undated**,
then the collapsed **Past**. Internships:
**Closing this week**, **Open**, **No deadline**, then the collapsed
**Deadline passed**. Section headings stay `MicroLabel as="h2"` with a
count. Filter chips keep their counts (M12) and gain **Past** / **Deadline
passed** chips so the collapsed section can be shown on its own.

Detail (members' listing page and the admin edit page's rail) gets an **At
a glance** card first: the state word large (`text-sm font-medium` with
tone), then a two-column fact grid: "Signup" (window with relative text:
"closes in 7 days, Oct 25"), "Event" (dates with relative text), "Where"
(location · format), "Team size", "Prizes", "Pay / cost", "Listed" ("3d
ago via Devpost"), "Verified" (date or the warning). Facts that are null
are omitted. The members' page keeps Your eligibility, Your interest,
Overview, Who can apply and Source as they are, below the glance card.

Admin edit page: the glance card goes at the top of the rail (above
Status). Nothing else moves.

## 16. Theme switch in the admin and members shells

A `ThemeSwitch` segmented control (`role="radiogroup"`, three `radio`
buttons: **Light · Dim · Dark**, lucide `Sun`, `CloudMoon`, `Moon` at 16px
with the label, 32px tall, `rounded-control border border-line`, the
active option `bg-surface-2 text-ink`, the others `text-ink-muted`; M08,
M09). It calls `setTheme` from next-themes (themes already exist as
`.light`, `.dim`, `.dark` in `globals.css`); the choice persists site-wide
as the public navbar's toggle already does. Before mount it renders the
three options disabled so nothing jumps.

Placement: admin sidebar foot, above the account block, with a
`MicroLabel` "Theme"; the same block in the mobile menu panel; the
members' top bar, left of the account button (icons only below 640px,
`aria-label`s carry the names). No settings page, no preview cards.

## Reference index (addendum)

| id | app | screen | Mobbin | image | local | what to take |
|---|---|---|---|---|---|---|
| M01 | Workable | Dashboard, day card | [open](https://mobbin.com/screens/7ccd1718-5df0-4271-bb15-28eac3f4a97a) | https://mobbin.com/api/mcp/short/YvdwqTjD | M01-workable-dashboard-day-card.webp | profile card left; a "Thursday 16 April" day card with prev/next and the day's events; lists as plain cards |
| M02 | Rox | Home, focus list | [open](https://mobbin.com/screens/62b4d10c-498e-49eb-bf78-3b944290f407) | https://mobbin.com/api/mcp/short/wFfxYr9r | M02-rox-home-today-card.webp | "Here's your focus for today"; list rows with source, title, time-ago; a Today card with prev/next |
| M03 | Midday | Month grid | [open](https://mobbin.com/screens/8cb15741-d890-4c46-b514-53e0038793ec) | https://mobbin.com/api/mcp/short/7cTrxIR0 | M03-midday-month-grid.webp | quiet grid, outside-month days hatched/muted, today shaded, month/week toggle at right |
| M04 | Proton | Mini month in sidebar | [open](https://mobbin.com/screens/36c81cb9-2bfa-46c6-bd8e-06bcfd0c81fa) | https://mobbin.com/api/mcp/short/tpFKuupR | M04-proton-mini-month-sidebar.webp | compact month, today highlighted, dots + short titles in the main grid |
| M05 | Skiff | Mini month | [open](https://mobbin.com/screens/940774ea-77a5-4594-a075-d600b53d2b63) | https://mobbin.com/api/mcp/short/qFrfbB6G | M05-skiff-mini-month.webp | small month with today in accent, selected week shaded |
| M06 | Front | Mini month + legend | [open](https://mobbin.com/screens/fbb5409f-550a-474c-a93e-d4054fc883cc) | https://mobbin.com/api/mcp/short/KO5SZ7iV | M06-front-mini-month-legend.webp | calendar legend as a checklist with colours (we use two dots and words) |
| M07 | Todoist | Upcoming + side list | [open](https://mobbin.com/screens/00fa2808-750c-499a-8bc7-b9d2c4e758cc) | https://mobbin.com/api/mcp/short/KqBSeHhs | M07-todoist-upcoming-side-list.webp | month grid with a grouped "next 7 days" list beside it |
| M08 | Profound | Appearance | [open](https://mobbin.com/screens/065209b0-8f6b-4c38-a0a7-56aa8cc0bfc9) | https://mobbin.com/api/mcp/short/I1J1ssFa | M08-profound-theme-segmented.webp | one row: "Theme · Light" with a three-icon segmented control |
| M09 | GitBook | Theme icons | [open](https://mobbin.com/screens/bce484e1-eaff-4835-855b-8da3552c525f) | https://mobbin.com/api/mcp/short/PbagA0VR | M09-gitbook-theme-icons.webp | sun/moon segmented control in a toolbar |
| M10 | Better Stack | Theme cards | [open](https://mobbin.com/screens/1ec0d237-177e-40b6-b709-5343ced7691c) | https://mobbin.com/api/mcp/short/jr58SR3z | M10-betterstack-theme-cards.webp | preview cards (what we are NOT doing: no settings page) |
| M11 | Wrike | Appearance cards | [open](https://mobbin.com/screens/89bad015-20d5-4936-a79c-3cdef882a0d7) | https://mobbin.com/api/mcp/short/dtcAd8gi | M11-wrike-appearance-cards.webp | selected state as a 2px border (we use bg-surface-2 on a 32px segment) |
| M12 | Remote | Jobs, status chips | [open](https://mobbin.com/screens/41d62eb9-da69-4d4c-8d9c-9329f7edd888) | https://mobbin.com/api/mcp/short/v8XV5KoE | M12-remote-jobs-status-chips.webp | All/Draft/Open/On hold/Closed chips with counts; a status word per row |
| M13 | Employment Hero | Jobs, status pill | [open](https://mobbin.com/screens/28d12727-c5e7-41b5-a885-ee14a3e91e4e) | https://mobbin.com/api/mcp/short/auKfKJiv | M13-employment-hero-status-pill.webp | OPEN pill + "Created on" date column; "Close this job" in the row menu |
| M14 | Care.com | Your jobs | [open](https://mobbin.com/screens/a5fc04c8-0654-4b3a-b661-ecbcdf123768) | https://mobbin.com/api/mcp/short/fXTe3sw7 | M14-care-starts-on-line.webp | "Starts on Mon, Feb 23, 2026" as a plain line under the title |

## 17. Jobs: type and season (18 October 2026, second round)

The Internships list becomes a jobs list with two filter rows under the
search box (both rows use `FilterChip`s with counts; one chip active per
row; the two rows combine with AND):

| row | chips | data |
|---|---|---|
| Type | All · Internship · Co-op · New grad | `opportunities.job_type` enum `job_type ('internship', 'coop', 'new_grad')`, default `internship` |
| Term | All · Summer · Fall · Spring · Winter · Part-time | `internship_terms` (enum `internship_term` gains `spring` and `fall`; `semester_part_time` stays and is labelled "Part-time") |

Rules:
- `job_type` is set by the editor (radio in the form's Basics section:
  Internship / Co-op / New grad), by the seed (co-op when the research
  item's terms contain `coop`, else internship), and by the sync (title
  says "co-op" → `coop`; "new grad", "new graduate", "university
  graduate", "early career", "campus hire" → `new_grad`; else
  `internship`). New-grad titles pass the student-role filter.
- Term inference maps "fall" → `fall`, "spring" → `spring`, "summer" →
  `summer`, "winter"/"january" → `winter`, "part-time"/"year-round" →
  `semester_part_time`. A co-op may carry a season too ("Spring 2027
  co-op").
- The row's first pill is the type when it is not an internship ("Co-op",
  "New grad"), followed by the term pills.
- Sections stay by deadline (§15). The page title stays "Internships" in
  the nav; the list header reads "Internships, co-ops and new-grad roles"
  in `text-sm text-ink-muted` under the h1.
- The SimplifyJobs New-Grad source is enabled, filtered to Boston / MA /
  remote US like the internships file.

## 18. Outside Boston: a red marker on hackathons and networking events

For hackathons and networking events with `area = "outside_boston"`
(in person somewhere other than Greater Boston), every place the listing
appears shows the word **Outside Boston** in the danger tone, so the
member sees at once that it means travel:

- list row: the area `Pill` becomes `border-danger text-danger` with the
  text "Outside Boston" (other areas keep the quiet pill);
- At a glance: the "Where" value is prefixed "Outside Boston · " in
  `text-danger`;
- dashboard calendar day list and "Coming up for you": a `text-xs
  text-danger` "Outside Boston" after the place;
- members' listing header: the same word under the title.

Suffolk, Boston and Online stay as they are. Conferences are not marked
(not requested); the helper `isOutsideBoston(o)` makes adding them a
one-line change.

## 14 (amendment). Compact calendar in the right column

The calendar card moves to the **right column**, under My card and Your
Locator, and becomes compact: 32px day cells on every width (44px only
below 640px), the month header on one line, no weekday row gap, the
legend on one line, and the selected day's list capped at three entries
with a "N more in Locator →" link to the members' list filtered to that
kind. "Coming up for you" stays in the left column above My tasks. The
left column is therefore: Coming up for you, My tasks, My projects, My
requests. Right column: My card, Your Locator, Locator calendar.

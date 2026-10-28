# 06 – Frontend Spec

## Routes
| Path | Page | Auth |
|---|---|---|
| /login | PRN login | public |
| /change-password | Password change | authenticated; mandatory on first login |
| / | Global Dashboard (all listings) | yes |
| /listing/:id | Listing detail | yes |
| /sell | New listing (NLP assist) | yes |
| /sell/:id/edit | Edit listing | owner |
| /me | My Dashboard (tabs: Listings, Orders, Sales, Saved) | yes |
| /profile | Profile & settings | yes |
| /checkout/:orderId | Payment page | buyer |
| /inbox | Inbox (list + thread) | yes |
| /inbox/:conversationId | Thread | participant |

## Layout
**Desktop ≥1024**: Sidebar (Browse, Sell, My Dashboard, Inbox [badge], Profile) · Top bar (search `/`, Sell button, avatar) · Content.
**Tablet 640–1023**: collapsed icon sidebar.
**Mobile <640**: top bar + bottom nav (Browse, Sell, Inbox, Me). Inbox is list → thread (full screen, back arrow).
**Large ≥1920**: Inbox shows 3 panes (list · thread · item/order summary). Dashboard grid adds columns; filters become a persistent left rail so space is used.

## Pages

### Login / First Password Change
Login uses a 9-digit PRN and password, numeric input mode on mobile, show/hide control, inline generic errors, lockout countdown and Enter submit. Error shake and page switching respect `prefers-reduced-motion`. `/register` redirects to login; show the note "Accounts are created by your department. Log in with your PRN."

After login, `mustChangePassword` routes to `/change-password`. Hide app navigation and block direct navigation away until success. Ask for current, new and confirmation values; show live hints for 8+ characters, letters and digits. Successful change returns to the dashboard. The Axios interceptor redirects on `403 PASSWORD_CHANGE_REQUIRED`.

### Global Dashboard
- Sticky filter bar: search, category chips (horizontal scroll), price min/max, condition, sort.
- Grid of `ListingCard`; infinite scroll via IntersectionObserver; skeleton on load; empty state "No items match. Clear filters".
- Keyboard: arrow keys move focus between cards (roving tabindex), `Enter` opens, `S` saves focused card.

### Listing detail
Gallery (thumbs + main, swipe on touch, `←/→` on keyboard) · price, condition, negotiable badge, posted-ago · description · seller card (name, branch, year) · actions: **Buy now**, **Chat with seller**, Save, Report. Seller viewing own item sees Edit / Mark sold.

### New listing
Left: form. Right (≥1024): live preview card. Fields: images (drag-drop, reorder, 6 max), title, category, condition, price, negotiable, **description with "✦ Improve" button** → calls NLP (doc 08) → shows suggestion in a diff-style panel with Accept / Edit / Dismiss. Draft auto-saved in localStorage.

### My Dashboard
Tabs with sliding underline. Listings: table on desktop / cards on mobile, with status badge and quick actions. Orders & Sales: status timeline per order; seller sees "Review payment" CTA when PROOF_SUBMITTED.

### Profile
Read-only identity: name, PRN, roll number, batch and branch. Optional notification email can be edited. Include password-change link, hostel, bio, and **Payment settings**: UPI ID + payee name with live QR preview and "Test QR" hint. Inline save, toast on success.

### Checkout / Inbox → see doc 07.

## Keyboard shortcuts
Implemented with `react-hotkeys-hook`; ignored while typing in inputs unless noted. Show full list with `?`.
| Keys | Action |
|---|---|
| `Ctrl/⌘ + K` | Command palette (navigate, search listings, run actions) |
| `/` | Focus search |
| `?` | Shortcuts help modal |
| `G` then `D` | Go Dashboard (browse) |
| `G` then `M` | Go My Dashboard |
| `G` then `I` | Go Inbox |
| `G` then `P` | Go Profile |
| `N` | New listing |
| `Esc` | Close modal / blur input / clear search |
| `Alt + ←` / `Backspace` (not in input) | Back (with reverse animation) |
| `J` / `K` | Next / previous card or conversation |
| `Enter` | Open focused item |
| `S` | Save/unsave focused listing |
| `B` | Buy (on listing detail) |
| `C` | Chat with seller (on listing detail) |
| `Ctrl + Enter` | Send chat message / submit form |
| `Ctrl + U` | Upload image in current context |
| `[` | Toggle sidebar |
Hints appear in tooltips (`<Kbd>`). Store the map in `lib/shortcuts.ts` so help and palette read from one source. Avoid clashing with browser/Windows shortcuts.

## Interactivity checklist
Optimistic save/unsave · hover image peek (cycle first 3 images on card hover, desktop only) · drag-drop uploads with progress · live price formatting (₹ with Indian grouping) · typing indicators · unread badges updating via socket · toasts with Undo (unsave, remove) · skeletons everywhere.

## State & data
React Query for server state (keys: `['listings',filters]`, `['listing',id]`, `['inbox']`, `['messages',id]`). Zustand only for auth user, UI (sidebar, nav direction, palette open). Axios instance with `withCredentials`; 401 → redirect to `/login`; `PASSWORD_CHANGE_REQUIRED` → `/change-password`.

## Windows desktop extras (optional, phase 6)
PWA manifest + service worker (installable from Edge/Chrome). Optional Electron/Tauri wrapper is out of v1.

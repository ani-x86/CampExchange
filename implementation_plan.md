# Camp-Exchange Implementation Plan

Campus marketplace web app built according to `AGENTS.md` and `docs/01`–`docs/10`.

## Architecture & Conventions
- **Client**: React 18, Vite, TypeScript, Tailwind CSS, React Router, TanStack Query, Zustand, Framer Motion, Lucide React, react-hotkeys-hook, qrcode.react.
- **Server**: Node 20+, Express, TypeScript, Prisma (SQLite for local dev), Socket.IO, Zod, bcryptjs, jsonwebtoken, multer, sharp, pino, cross-env.
- **NLP**: Python FastAPI, offline rule + scikit-learn pipeline (clean, extract, classify, compose, price, flags).
- **Design System**: Squarish UI (`rounded-sm` 2px / `rounded` 4px), pure white background (`#FFFFFF`), surface (`#FAFAFA`), hairline borders (`#E5E5E5`), single accent blue (`#2F5BFF`), Inter + JetBrains Mono typography, 8px grid alignment, no gradients, minimal motion with `prefers-reduced-motion`.
- **Target OS**: Windows 10/11 first (PowerShell/CMD safe scripts with `cross-env`, `concurrently`).

---

## Phase Checklist

### Phase 0: Scaffold & Environment Setup
- [ ] Initialize git repository, `.gitignore`, `.gitattributes` (`* text=auto`)
- [ ] Root workspace setup with scripts to run client, server, and nlp concurrently
- [ ] `server/`: Express + TypeScript, Prisma setup (`dev.db`), env schema with Zod, CORS, cookie-parser, Vitest
- [ ] `client/`: Vite + React 18 + TypeScript + Tailwind CSS with tokens from doc 05, React Router, TanStack Query, Zustand, Vitest
- [ ] `nlp/`: FastAPI service structure, virtual environment, `requirements.txt`, health check endpoint
- [ ] Environment example files (`.env.example` in root, server, client, nlp)
- [ ] Verification: All 3 services start simultaneously; lint and typecheck pass

### Phase 1: Design System & App Shell
- [ ] Tailwind CSS configuration matching doc 05 design tokens exactly
- [ ] Core UI components in `client/src/components/ui`:
  - `Button` (Primary, Secondary, Ghost, Danger, 36px/40px touch, press animation)
  - `Input` & `Textarea` (40px, squarish, accent ring focus, label, error state)
  - `Select`
  - `Tabs` (underline style, shared `layoutId` sliding underline)
  - `Modal` (backdrop, fade + 8px enter, ESC dismiss)
  - `Toast` / Toast provider (square, 1px border, auto-dismiss, undo action)
  - `Badge` (11px uppercase tracking-wide, status color variants)
  - `Skeleton` (surface block shimmer, disabled on reduced motion)
  - `Kbd` (11px mono, surface bg, 1px border)
  - `EmptyState` (squarish illustration/icon, title, message, action)
- [ ] Layout & AppShell (`client/src/app/layout`):
  - Sidebar (desktop >= 1024px: 232px, collapsible to 56px with `[` key, tablet 640-1023px collapsed)
  - TopBar (search trigger `/`, Sell CTA, user avatar / auth state)
  - BottomNav (mobile < 1024px: Browse, Sell, Inbox with badge, Me)
- [ ] Framer Motion page transitions with forward/back direction awareness & reduced motion toggle
- [ ] `/design` catalog route showcasing all primitives
- [ ] Verification: Responsive check at 360px, 768px, 1440px; keyboard navigability

### Phase 2: Authentication & Profile
- [ ] Prisma schema User model (`Role`, `STUDENT`, `ADMIN`, UPI fields)
- [ ] Server auth module:
  - Register with college email domain validation, bcrypt cost 12
  - Login setting httpOnly cookie `cx_token`, SameSite=Lax
  - Logout clearing cookie
  - `/api/auth/me` current user endpoint
  - Rate limiting (auth 10/min/IP)
- [ ] Server user module:
  - Public profile `/api/users/:id`
  - Update profile `/api/users/me` (bio, hostel, branch, year, upiId, upiName)
  - Avatar upload `/api/users/me/avatar` with sharp
- [ ] Client auth & profile:
  - `useAuth` hook and Zustand auth store
  - Login & Register pages (split layout >= 1024px, inline Zod validation, password toggle, error shake)
  - Profile page with inline editing, avatar upload, and UPI settings with live QR preview (`qrcode.react`) and test QR dialog
- [ ] Verification: Register, login, update UPI, logout, cookie security check

### Phase 3: Listings & Catalog
- [ ] Prisma schema `Listing` and `SavedListing` models with status (`ACTIVE`, `RESERVED`, `SOLD`, `REMOVED`)
- [ ] Upload endpoint: `/api/uploads/image` (kinds: listing, avatar, proof) resizing to 1200px WebP + 400px thumbnail via sharp, EXIF stripping
- [ ] Server listings module:
  - List with search `q`, category, condition, min/max price, sort, cursor pagination
  - Get listing detail + seller summary
  - Create listing (checks seller UPI presence, returns warning)
  - Update / delete listing (owner only)
  - Save / unsave toggle & `/api/me/saved`
  - `/api/me/listings` my listings endpoint
- [ ] Client listings UI:
  - `ListingCard` with 4:3 image, price mono, condition badge, hover image peek (first 3 images)
  - `ListingGrid` fluid auto-fill grid (`repeat(auto-fill, minmax(clamp(160px, 18vw, 260px), 1fr))`)
  - `FilterBar` sticky chips with horizontal scroll, price range, condition, sort
  - Global Dashboard with infinite scroll and skeleton loading
  - Listing detail page with image gallery (thumbnails + keyboard `<- / ->`), seller info, Buy/Chat/Save buttons
  - New & Edit Listing page with drag-drop multi-image uploader (up to 6), live preview card, localStorage draft auto-save
  - My Dashboard with sliding tabs (Listings, Orders, Sales, Saved)
- [ ] Seed script: 2 users (`seller@college.edu.in`, `buyer@college.edu.in`), 8 diverse campus items
- [ ] Verification: CRUD, filtering, responsive grid 320px -> 3440px, keyboard roving focus

### Phase 4: Peer-to-Peer Payment Flow
- [ ] Prisma schema `Order` model with status machine (`PENDING_PAYMENT`, `PROOF_SUBMITTED`, `CONFIRMED`, `REJECTED`, `CANCELLED`)
- [ ] Server orders module:
  - Create order (checks active order concurrency, reserves listing)
  - Get order detail with `payee` info and `upiUri`
  - Upload & submit payment proof with optional 12-digit UTR -> transitions to `PROOF_SUBMITTED`, posts chat payment proof
  - Seller confirm -> transitions to `CONFIRMED`, listing flips to `SOLD`
  - Seller reject with reason -> transitions to `REJECTED`, listing returns to `ACTIVE`
  - Buyer cancel before proof
  - 30-minute auto-cancel background job for stale pending orders
- [ ] Client payment UI:
  - `/checkout/:orderId` page with seller UPI QR, copy UPI ID, "Open UPI app" mobile deep link
  - `ProofUploader` with drag-drop, paste (Ctrl+V) handler, preview, and optional UTR input
  - 4-step status timeline (Reserved -> Paid -> Review -> Completed)
  - Campus handover safety notice ("Meet on campus. Check before confirming.")
  - Sales & Orders dashboard tabs with "Review payment" CTA
- [ ] Verification: End-to-end payment creation, proof upload, and seller confirmation

### Phase 5: Real-time Chat & OLX-Style Inbox
- [ ] Prisma schema `Conversation` and `Message` models (one thread per listing + buyer + seller)
- [ ] Socket.IO integration with cookie-based auth handshake:
  - Rooms `user:{id}` and `conv:{id}`
  - Events: `chat:join`, `chat:send`, `chat:typing`, `chat:read`, `inbox:update`, `order:update`
  - REST fallback endpoints for conversations and messages
- [ ] Server inbox query with unread count calculation and filters (`all`, `buying`, `selling`, `unread`)
- [ ] Client chat UI:
  - `useChat` hook, optimistic sending with `tempId`, retry logic
  - Unread badge on sidebar and bottom nav updating live
  - OLX-style Inbox:
    - Left pane: filter tabs, conversation list with search, unread badge, item thumb
    - Right pane: conversation thread, item card header, message bubbles with read receipts
    - Special PAYMENT_PROOF message bubble with thumbnail, UTR, and seller Confirm/Reject buttons
    - System messages ("Order created", "Proof submitted", "Order confirmed")
    - Quick replies chips ("Is this available?", "Where can we meet?", etc.)
    - Composer with auto-sizing textarea and image attachment
  - Responsive layouts: Mobile full-screen list -> full-screen thread; >= 1920px 3-pane layout (conversations, thread, item/order summary)
  - Scam & safety warnings in chat
- [ ] Verification: Realtime messaging between two sessions, typing indicators, read receipts, proof card actions

### Phase 6: Offline NLP Pipeline (FastAPI)
- [ ] Python FastAPI service in `nlp/`:
  - `pipeline/clean.py`: Unicode normalization, Hindi/SMS shorthand expansion, repeated characters
  - `pipeline/extract.py`: Rule-based extraction (brand, model, age, defects, working state, accessories, book editions)
  - `pipeline/classify.py`: TF-IDF + LogisticRegression for category classification + rule-based condition scoring
  - `pipeline/compose.py`: Deterministic, fact-preserving template NLG (no invented facts) for friendly, neutral, concise tones
  - `pipeline/price.py`: Category median price estimation
  - Profanity, scam, phone, and contact flags; missing details checklist
  - Seed dataset (`seed_listings.csv`) and training script (`train.py`)
  - Pytest suite (`test_pipeline.py`) validating golden examples and fact preservation
- [ ] Express proxy endpoint `/api/nlp/describe` with rate limit and graceful fallback
- [ ] Client integration:
  - "✦ Improve" button and `Ctrl+J` shortcut in New Listing form
  - Diff-style suggestion panel with Accept / Dismiss
  - Missing details prompt chips
  - Debounced category suggestion on title input
- [ ] Verification: Pytest suite passes; NLP service responds < 300ms; client integration functions

### Phase 7: Keyboard Shortcuts, Command Palette & Polish
- [x] Central shortcuts registry `client/src/lib/shortcuts.ts`
- [ ] Global shortcuts via `react-hotkeys-hook` (`/`, `?`, `G D`, `G M`, `G I`, `G P`, `N`, `Esc`, `Alt+Left`, `J/K`, `Enter`, `S`, `B`, `C`, `Ctrl+Enter`, `[`)
- [x] Command Palette (`Ctrl+K`): quick page navigation, search listings, quick actions
- [x] Shortcuts Help modal (`?`) with `<Kbd>` components
- [ ] Full responsive verification across 320px to 3440px
- [x] PWA manifest and icons
- [ ] Playwright E2E test verifying the complete golden path
- [ ] Documentation and scripts in `README.md`

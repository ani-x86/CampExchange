# 10 – Build Plan & Antigravity Prompts

Use Planning mode. Paste one prompt per phase; tell the agent to read `AGENTS.md` and the cited docs first. Verify with the `/verify` workflow after each phase.

## Phase 0 – Scaffold
**Prompt:** *Read AGENTS.md and docs/02-ARCHITECTURE.md. Scaffold the monorepo (client with Vite React TS + Tailwind, server with Express TS + Prisma, nlp with FastAPI). Add Windows-safe scripts (`dev`, `build`, `lint`, `typecheck`, `test`), ESLint/Prettier, `.gitignore`, `.gitattributes`, `.env.example` files. Make all three services start.*

## Phase 1 – Design system + shell
**Prompt:** *Read docs/05 and docs/06. Implement Tailwind tokens, base UI components (Button, Input, Select, Tabs, Modal, Toast, Badge, Skeleton, Kbd, EmptyState), AppShell with sidebar/top bar/bottom nav, page transitions with forward/back direction, reduced-motion support. Build a `/design` route showing all components.*

## Phase 2 – Auth + profile
**Prompt:** *Read docs/03, 04, 06, 12. Set up PostgreSQL migrations, department CSV import, PRN login/change-password/logout/me, lockout, token-versioned JWT cookie and ADMIN student management. Build PRN login, forced password-change and Profile pages. Public registration is disabled.*

## Phase 3 – Listings
**Prompt:** *Implement Listing model, upload endpoint with sharp, listings CRUD with filters + cursor pagination, Global Dashboard (grid, filters, infinite scroll, skeletons), Listing detail, New/Edit listing, My Dashboard tabs, save/unsave. Seed 8 listings.*

## Phase 4 – Payment
**Prompt:** *Read docs/07 (Payment). Implement Order model and state machine, Checkout page with UPI QR (qrcode.react), copy UPI ID, proof upload with paste/drag-drop, seller review UI with confirm/reject, 30-minute auto-cancel job, order timeline.*

## Phase 5 – Chat + inbox
**Prompt:** *Read docs/07 (Chat). Implement Conversation/Message models, Socket.IO auth via cookie, realtime messages, typing, read receipts, unread badges, OLX-style Inbox (list + thread + 3-pane on ≥1920), payment-proof message cards with inline confirm/reject, system messages, quick replies.*

## Phase 6 – NLP pipeline
**Prompt:** *Read docs/08. Build the FastAPI pipeline (clean, extract, classify, compose, price, flags), seed dataset, trainer, tests. Add Express proxy and the "✦ Improve" suggestion panel with Accept/Dismiss on the New Listing page. Add `Ctrl+J` shortcut.*

## Phase 7 – Shortcuts, polish, QA
**Prompt:** *Implement all shortcuts in docs/06 with a command palette (Ctrl+K) and shortcuts help (?). Audit every page against the responsive matrix in docs/09, fix gaps, add Playwright E2E for the golden path, run Lighthouse and fix regressions. Add PWA manifest.*

## Phase 8 – Optional
Admin panel, reviews, email notifications, PostgreSQL deploy (Render/Railway), image storage on Cloudinary.

## Golden path acceptance test
1. Imported User A logs in with PRN, changes the temporary password, sets UPI ID, and lists "Hero cycle" using NLP assist.
2. Imported User B changes the temporary password, finds the listing via `/` search, opens it, and presses **B**.
3. B sees A's QR, uploads screenshot with UTR.
4. A gets live badge in Inbox, sees proof card, taps Confirm.
5. Listing shows **Sold**; both see status timeline; chat history intact in separate thread.
6. Everything usable at 360px and 2560px, keyboard only.

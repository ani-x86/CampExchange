# AGENTS.md – Master rules for Antigravity

You are building **Camp-Exchange**, a campus marketplace. Read `docs/` in numeric order before writing code.

## Non-negotiables
1. **Theme**: white background, squarish UI (radius 2–4px, never pill/rounded-full except avatars), one accent colour, thin 1px borders, almost no shadows.
2. **Stack is fixed**: React+Vite+Tailwind (client), Express+Prisma+Socket.IO (server), FastAPI (nlp). Do not swap frameworks.
3. **Windows first**: every npm script must work in PowerShell/CMD. Use `cross-env`, never `export` or `rm -rf`. Use `path.join`, never hard-coded `/` paths.
4. **Responsive everywhere**: 320px phone → 3840px ultrawide. Use fluid grids (`auto-fill, minmax`), `max-w-[1600px]` only for reading content, sidebar on ≥1024px, bottom nav below.
5. **Accessibility**: keyboard reachable, visible focus ring, `prefers-reduced-motion` respected, contrast ≥ 4.5:1.
6. **Validation**: Zod on every API input; TypeScript strict on client and server.
7. **No fake payment verification**: payments are peer-to-peer; the seller manually confirms. Never claim the app verifies money.
8. **Security**: bcrypt, httpOnly JWT cookie, rate limits, upload MIME + size checks (see `docs/09`).

## Working style
- Build in the phases of `docs/10-BUILD-PLAN.md`; finish and run each phase before the next.
- After each phase: run lint, type-check, tests; open the app in the browser and verify at 360px, 768px, 1440px.
- Small commits, conventional messages (`feat:`, `fix:`, `chore:`).
- Do not add libraries beyond those listed in `docs/02-ARCHITECTURE.md` without a one-line justification in the PR.
- Keep components under ~150 lines; extract hooks to `client/src/hooks`.

## Definition of done (every feature)
- Works with keyboard only
- Loading, empty, and error states exist
- Mobile + desktop verified
- API has Zod schema + test

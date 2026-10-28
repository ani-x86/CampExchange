---
description: Scaffold a new client page following the Camp-Exchange conventions
---
1. Create `client/src/pages/<Name>Page.tsx` using `PageShell` and `motion` page transition.
2. Add route in `client/src/app/routes.tsx` (lazy loaded).
3. Add loading skeleton, empty state, error state.
4. Register keyboard shortcut in `client/src/lib/shortcuts.ts` if navigational.
5. Verify at 360 / 768 / 1440px and keyboard-only.

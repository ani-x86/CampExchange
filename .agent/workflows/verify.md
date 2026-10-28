---
description: Full verification before finishing a phase
---
1. `npm run lint && npm run typecheck && npm test` in `server` and `client`.
2. `pytest` in `nlp`.
3. Start all three services, open http://localhost:5173, test the golden path: register → list item → second user views → buys → uploads proof → seller confirms → chat.
4. Report anything failing; fix before continuing.

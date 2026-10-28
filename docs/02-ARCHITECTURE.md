# 02 – Architecture

```
Browser (React SPA)
   │ REST (JSON, cookie auth)        │ WebSocket (Socket.IO)
   ▼                                  ▼
Express API ───────────── Socket.IO server (same process)
   │ Prisma                │
   ▼                       ▼ HTTP (internal)
PostgreSQL             FastAPI NLP service (:8001)
   │
Local /uploads (images, payment proofs)  → swap to S3/Cloudinary later
```

## Client (`client/`)
```
src/
├─ app/            routes.tsx, providers.tsx, layout/ (AppShell, Sidebar, BottomNav, TopBar)
├─ pages/          Login, ChangePassword, Dashboard, ListingDetail, NewListing, MyDashboard,
│                  Profile, Checkout, Inbox, Chat, NotFound
├─ components/ui/  Button, Input, Select, Tabs, Modal, Toast, Skeleton, Badge, EmptyState, Kbd
├─ components/     ListingCard, ListingGrid, FilterBar, ImageUploader, UpiQr, ProofUploader,
│                  ChatBubble, ConversationItem, CommandPalette, ShortcutsHelp
├─ hooks/          useAuth, useListings, useChat, useShortcuts, useMediaQuery
├─ lib/            api.ts (axios), socket.ts, shortcuts.ts, upi.ts, format.ts
└─ store/          auth.ts, ui.ts (Zustand)
```
Libraries: react-router-dom, @tanstack/react-query, zustand, framer-motion, axios, react-hook-form + zod, qrcode.react, socket.io-client, lucide-react, clsx, react-hotkeys-hook.

## Server (`server/`)
```
src/
├─ index.ts        bootstrap (Express + http + Socket.IO)
├─ config/         env.ts (Zod-validated)
├─ middleware/     auth.ts, validate.ts, upload.ts, rateLimit.ts, error.ts
├─ modules/        auth, users, listings, orders, chat, uploads, nlp (each: routes, controller, service, schema)
├─ sockets/        chat.socket.ts
└─ prisma/         schema.prisma, seed.ts
```
Libraries: express, cors, helmet, cookie-parser, jsonwebtoken, bcryptjs, zod, prisma, @prisma/client, multer, sharp (resize/compress), socket.io, express-rate-limit, pino, axios, cross-env, tsx.

## NLP (`nlp/`)
```
app/ main.py, schemas.py, pipeline/ (clean.py, classify.py, extract.py, compose.py, price.py), data/ (categories.json, templates.json)
tests/
```

## Environment variables
`server/.env.example`
```
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/camp_exchange?schema=public
SHADOW_DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/camp_exchange_shadow?schema=public
JWT_SECRET=change_me_long_random
NLP_URL=http://localhost:8001
UPLOAD_DIR=./uploads
MAX_IMAGE_MB=5
```
`client/.env.example`
```
VITE_API_URL=/api
VITE_SOCKET_URL=
```

Vite proxies `/api` and `/socket.io` to the local Express service during
development.

In the Vercel multi-service deployment, the client uses same-origin `/api` and
Socket.IO paths. The Express service receives `NLP_URL` through its service
binding to the internal FastAPI service; do not configure that binding variable
manually in Vercel.

## Performance rules
Route-level code splitting · images resized to 1200px WebP via sharp + 400px thumbnails · cursor pagination · React Query caching · skeletons not spinners · `loading="lazy"` on images · virtualise inbox/message lists > 200 items.

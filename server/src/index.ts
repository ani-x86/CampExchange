import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';
import fs from 'fs';
import { env } from './config/env.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { userRouter } from './modules/users/user.routes.js';
import { listingRouter, meRouter } from './modules/listings/listing.routes.js';
import { orderRouter, meOrdersHandler } from './modules/orders/order.routes.js';
import { chatRouter } from './modules/chat/chat.routes.js';
import { uploadRouter } from './modules/uploads/upload.routes.js';
import { adminRouter } from './modules/admin/admin.routes.js';
import { nlpRouter } from './modules/nlp/nlp.routes.js';
import { registerChatSocket } from './sockets/chat.socket.js';
import { errorHandler } from './middleware/error.js';
import { passwordChangeGate } from './middleware/auth.js';

const app = express();
const server = http.createServer(app);

// Trust Render/Vercel proxies
app.set('trust proxy', 1);

const allowedOrigins = env.CLIENT_ORIGIN.split(',').map((v) => v.trim()).filter(Boolean);

const corsOrigin: cors.CorsOptions['origin'] = (origin, callback) => {
  if (!origin) { callback(null, true); return; }
  if (allowedOrigins.includes(origin)) { callback(null, true); return; }
  callback(new Error(`CORS: origin ${origin} not allowed`));
};

// Socket.IO
export const io = new SocketIOServer(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});
registerChatSocket(io);

// Middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api', passwordChangeGate);

// Upload directory static serving
const uploadPath = path.resolve(process.cwd(), env.UPLOAD_DIR);
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}
app.use('/uploads', express.static(uploadPath));

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/users', userRouter);
app.use('/api/listings', listingRouter);
app.use('/api/me/orders', meOrdersHandler);
app.use('/api/me', meRouter);
app.use('/api/orders', orderRouter);
app.use('/api/conversations', chatRouter);
app.use('/api/uploads', uploadRouter);
app.use('/api/nlp', nlpRouter);

// Health check
app.get('/api/health', async (_req, res) => {
  try {
    const { prisma } = await import('./prisma/client.js');
    const userCount = await prisma.user.count();
    const demoUser = await prisma.user.findUnique({
      where: { prn: '241107068' },
      select: { prn: true, name: true, role: true, isActive: true },
    });
    res.json({ ok: true, db: true, userCount, demoUser, timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(500).json({ ok: false, db: false, error: err?.message || String(err), timestamp: new Date().toISOString() });
  }
});

// Error handling
app.use(errorHandler);

// Start server
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  server.listen(env.PORT, () => {
    console.log(`Camp-Exchange server running on http://localhost:${env.PORT}`);

    // Keep Render free tier alive by self-pinging every 10 minutes (Render sleeps after 15 min)
    if (process.env.NODE_ENV === 'production') {
      const keepAliveUrl = process.env.RENDER_EXTERNAL_URL
        ? `${process.env.RENDER_EXTERNAL_URL}/api/health`
        : 'https://campexchange.onrender.com/api/health';

      const TEN_MINUTES_MS = 10 * 60 * 1000;
      setInterval(async () => {
        try {
          const res = await fetch(keepAliveUrl);
          console.log(`[Keep-Alive] Pinged ${keepAliveUrl} -> status ${res.status}`);
        } catch (err: any) {
          console.warn(`[Keep-Alive] Ping failed:`, err?.message || err);
        }
      }, TEN_MINUTES_MS);
    }
  });
}

export { app, server };
export default app;

# 07 – Payment (UPI QR + proof) and Chat Inbox

> The app never moves money. Buyer pays the seller directly in their UPI app. The seller confirms receipt manually. Make this explicit in UI copy.

## Payment flow
```
Buyer taps Buy → POST /orders (PENDING_PAYMENT, listing RESERVED)
→ /checkout/:orderId
   • Item summary (image, title, ₹ amount)
   • Seller QR (generated client-side from seller UPI)  + UPI ID with Copy button
   • Mobile: "Open UPI app" deep link button
   • Instructions: 1 Pay exact amount · 2 Take screenshot · 3 Upload below
   • ProofUploader (drag-drop / paste Ctrl+V / camera) + optional UTR (12 digits)
→ POST /uploads/image (kind=proof) → POST /orders/:id/proof
→ Order PROOF_SUBMITTED; message of type PAYMENT_PROOF appears in chat; seller gets inbox:update + order:update
Seller: opens proof → Confirm (CONFIRMED, listing SOLD) or Reject with reason (listing ACTIVE, buyer notified)
```
### UPI URI
```ts
// client/src/lib/upi.ts
export const buildUpiUri = ({ pa, pn, am, tn }: { pa: string; pn: string; am: number; tn: string }) =>
  `upi://pay?pa=${encodeURIComponent(pa)}&pn=${encodeURIComponent(pn)}&am=${am.toFixed(2)}&cu=INR&tn=${encodeURIComponent(tn)}`;
```
Render with `qrcode.react` (`QRCodeSVG`, level "M", 220px, white bg, ink fg, quiet zone 4). `tn` = `CampExchange-<orderId short>`.

### Rules
- Seller must have a valid UPI ID (`^[\w.\-]{2,}@[\w]{2,}$`) to receive orders; otherwise Buy is disabled with "Seller hasn't set up payments – chat instead".
- Show the QR only to the buyer of an active order (server returns payee info only to buyer/seller).
- Proof: JPG/PNG/WebP ≤ 5MB, preview before submit, replace allowed until seller acts.
- Order timeout: PENDING_PAYMENT auto-cancels after 30 min (cron in server) → listing back to ACTIVE.
- Statuses displayed as a 4-step timeline: Reserved → Paid (proof sent) → Seller review → Completed.
- Add a small notice: "Meet on campus for handover. Check the item before confirming."

## Chat / Inbox (OLX-style)
### Model
One conversation per (listing, buyer, seller). Buyer starts via "Chat with seller" or via Buy. Each thread lists the item at top (thumb, title, price, status).

### Inbox layout
- **Left pane** (list): filter tabs All · Buying · Selling · Unread; search by name/item; each row = other user avatar, name, item title, last message preview, time, unread count badge, item thumbnail on right. Sorted by `lastMessageAt`.
- **Right pane** (thread): header (user, item card with link, ⋮ menu: report, block later), message list (day separators, grouped bubbles, delivered/read tick), composer (textarea autosize, attach image, `Enter` sends, `Shift+Enter` newline).
- **Mobile**: list full screen → tap → thread full screen with back animation.
- **Payment proof bubble**: special card with thumbnail, amount, UTR, status chip; seller sees inline Confirm/Reject buttons.
- **System messages**: "Order created", "Payment proof sent", "Seller confirmed", etc.
- Quick replies chips for buyer: "Is this available?", "Can you lower the price?", "Where can we meet?".

### Realtime
Socket.IO rooms `user:{id}` (inbox/badges) and `conv:{id}` (messages/typing/read). Optimistic send with `tempId`, retry on fail, reconnect with backoff, REST fallback. Unread = messages after `lastReadAt` from the other party; update the sidebar badge live.

### Safety
Sanitise text (render as plain text), cap 2000 chars, rate limit 30 msgs/min, images re-encoded, block links to non-campus payments? (just show a warning when message contains a UPI ID or "pay advance": "Never pay before seeing the item.").

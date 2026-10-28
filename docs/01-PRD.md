# 01 – Product Requirements

## Vision
A fast, clean, trustworthy place for students of one college to sell and buy items (books, cycles, electronics, lab coats, hostel gear) without middlemen.

## Users
- **Student** (buyer and seller – same account). Imported from the department student roster and logs in with PRN.
- **Admin** (optional, phase 6): removes listings/users, views reports.

## Core features
| # | Feature | Summary |
|---|---|---|
| F1 | Auth | Department-provisioned PRN/password login. First login requires a password change. Session via httpOnly JWT cookie. |
| F2 | Global dashboard | Grid feed of all active listings. Search, category chips, price range, condition, sort. Infinite scroll. |
| F3 | My dashboard | Tabs: My listings · Orders (buying) · Sales (selling) · Saved. |
| F4 | Profile | Name, avatar, branch, year, hostel/location, bio, UPI ID (seller), contact visibility. Edit inline. |
| F5 | Create listing | Title, category, condition, price, negotiable flag, up to 6 images, description with **NLP assist** (see doc 08). |
| F6 | Listing detail | Image gallery, details, seller card, Buy, Chat, Save, Report. |
| F7 | Payment page | Buyer sees seller's UPI QR + amount + UPI ID, pays in their UPI app, uploads screenshot + optional UTR. |
| F8 | Seller confirmation | Seller receives proof in Sales tab and chat, taps Confirm / Reject. Listing becomes Sold on confirm. |
| F9 | Chat + Inbox | Real-time 1:1 chat per (listing, buyer, seller). Inbox with conversation list, unread badges, search, OLX-style layout. |
| F10 | Keyboard shortcuts | Global shortcuts + command palette (doc 06). |
| F11 | Notifications | In-app toasts + unread badges (email optional later). |

## User stories (acceptance criteria summarised)
1. *As an imported student I can log in with my PRN, change my temporary password, and land on the global dashboard.*
2. *As a seller I can add an item in < 60 seconds; typing a rough description gets a polished suggestion I can accept or edit.*
3. *As a buyer I can open an item, press Buy, scan the QR, upload my payment screenshot, and see status "Waiting for seller".*
4. *As a seller I can see the screenshot, amount and buyer, then Confirm or Reject with a reason.*
5. *As a buyer or seller I can open Inbox, see every conversation separately, and reply in real time.*
6. *As any user on any device from 320px to 4K I never see horizontal scroll or wasted space.*

## Out of scope (v1)
Online payment gateway, delivery/shipping, reviews/ratings (v2), push notifications, multi-college tenancy.

## Success metrics
Time-to-list < 60s · LCP < 2s on 4G · Lighthouse ≥ 90 (Perf, A11y, Best Practices).

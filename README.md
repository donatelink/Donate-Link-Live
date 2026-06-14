# DonateLink

**A Transparent Donation Platform with Blockchain-Verified Fund Tracking**

Final Year Design Project (FYDP) 2026 — Iqra University
Team: Hasnain Sher Ayoub · Syed Saqlain · Usman Ali
Supervisor: Hafiz Muhammad Rafi

---

DonateLink connects **donors, NGOs, beneficiaries, and admins** on one platform that
makes every donation traceable from giver to receiver, with photo/document **proof**
at each stage and on-chain verification for permanent transparency.

## Run locally

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
#    Copy .env.local.example to .env.local and fill in real values
#    (Supabase URL + keys, Stripe test key, blockchain RPC URLs)

# 3. Start the dev server
npm run dev
```

Then open **http://localhost:3000** in your browser.

## Tech stack

| Layer       | Technology                                  |
|-------------|---------------------------------------------|
| Frontend    | Next.js 16 (Pages Router), React 19         |
| Styling     | Tailwind CSS 4                              |
| Icons       | lucide-react                                |
| Backend/DB  | Supabase (PostgreSQL + Row-Level Security)  |
| Auth        | Supabase Auth + Google OAuth                |
| Payments    | Stripe (card)                              |
| Blockchain  | Polygon + Ethereum (on-chain records)       |

## Project layout

```
pages/          → all routes (donor, ngo, beneficiary, admin, auth, landing)
components/     → reusable UI (modals, forms, avatar, rating, etc.)
utils/          → supabase client + helper data
hooks/          → custom React hooks
styles/         → global Tailwind styles
supabase/       → SQL schema + RLS policies for every table
public/         → logos, images, static assets
```

See **DOCUMENTATION.md** for a full explanation of how the code works.

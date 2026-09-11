# Village Temple Finance Management System

MERN-stack financial ledger system for a Tamil Nadu village temple.

## What's in this delivery (Modules 1-3 of the development order)
1. Complete backend architecture (see ARCHITECTURE.md)
2. Database models for the entire system (all modules, since they're related)
3. Authentication (JWT) + Role-based access control (ADMIN / COMMITTEE_MEMBER / VIEWER)
4. Pangali Management (full CRUD + financial summary endpoint)
5. Central ledger service (`ledgerService.js`) - the core accounting engine

## Getting started

```bash
cd backend
cp .env.example .env      # edit MONGO_URI, JWT_SECRET, seed admin credentials
npm install
npm run seed               # creates the first ADMIN user + default Settings
npm run dev                 # starts on http://localhost:5000
```

Login: `POST /api/auth/login` with the phone/password you set in `.env` (SEED_ADMIN_PHONE / SEED_ADMIN_PASSWORD).

## Verified in this sandbox
- All backend files pass `node --check` (no syntax errors).
- The Express app boots and every route in this delivery registers correctly (confirmed by walking the live router stack).
- Money conversion utilities (rupeesToPaise/paiseToRupees) were unit-tested against your own worked example (₹50,000 principal, 12% → ₹6,000 interest → ₹56,000 return) with no floating-point drift.
- The ledger direction-safety guard was unit-tested to confirm it rejects a mislabeled entry (e.g. logging FUND_GIVEN as a CREDIT).

I could not run a live MongoDB instance in this sandbox (no internet access to MongoDB's binary download servers, and MongoDB Community isn't in the default Ubuntu apt repos), so full end-to-end DB integration wasn't exercised here. Run `npm run seed` and `npm run dev` in your own environment (with MongoDB installed or Atlas) to do that — the code is written and structured for it.

## Next modules (not yet built)
Vari Collection → Contributions & Donations → Temple Fund/Interest → Expenses → Ledger endpoints → Dashboard → Reports → Frontend (React).

Say "continue" and I'll build the next module in the same order.

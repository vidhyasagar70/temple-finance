# Village Temple Finance Management System — Architecture

## 1. Core Design Principle

**The ledger is the single source of truth.** No module (Pangali, Vari, Donation, Fund, Expense) stores a running balance. Every financial event writes one or more immutable `LedgerTransaction` documents. The Dashboard, Pangali detail pages, and Reports all *derive* their numbers by aggregating the ledger — never from a cached/manually-edited number. This directly satisfies your rule: "The balance should be calculated from the transaction ledger and should not depend on manually entered values."

Money is stored as **integer paise** (`amountPaise: Number`, an integer) everywhere, never as JS floats. All display formatting divides by 100 only at the UI layer. This avoids floating-point drift entirely and is simpler to query/index than `Decimal128` while still being exact for currency.

## 2. High-Level Module Map

| Domain module | Writes to ledger as | Never deleted, only |
|---|---|---|
| Pangali | (master data, no direct ledger entry) | soft-deactivated |
| Vari Collection | `VARI_RECEIVED` (credit) | status → `CANCELLED` |
| Contributions | `CONTRIBUTION_RECEIVED` (credit) | `CANCELLED` |
| Public Donations | `DONATION_RECEIVED` (credit) | `CANCELLED` |
| Temple Fund (loan given) | `FUND_GIVEN` (debit) at disbursement | `CANCELLED` (rare, admin-only) |
| Fund repayments | `INTEREST_RECEIVED` / `PRINCIPAL_RECEIVED` (credit) | `CANCELLED` |
| Expenses | `EXPENSE` (debit) | `CANCELLED` |
| Opening balance / correction | `ADJUSTMENT` (credit or debit) | `CANCELLED`, ADMIN-only |

Every domain document (VariPayment, Donation, FundTransaction, Expense…) stores a `ledgerTransactionId` back-reference, and every `LedgerTransaction` stores a `sourceType` + `sourceId` forward-reference. This two-way link is what makes the ledger filterable by Pangali/type/method while still letting each module page show its own filtered history.

**Cancellation, not deletion**: every transactional schema has `status: ACTIVE | CANCELLED` and `cancelledAt`, `cancelledBy`, `cancelReason`. A cancelled record is excluded from balance aggregation but remains visible in the ledger (shown struck-through) — this is the audit trail requirement.

## 3. Backend Folder Structure

```
backend/
  config/
    db.js                 # mongoose connection
    env.js                # centralized env var validation
  models/
    User.js
    Pangali.js
    VariPayment.js
    Contribution.js
    Donation.js
    FundAdvance.js         # the loan/advance "master" record (principal, rate, terms)
    FundTransaction.js     # each disbursement/repayment event against a FundAdvance
    Expense.js
    Festival.js
    LedgerTransaction.js
    Settings.js
    Counter.js              # atomic sequence generator for receipt numbers
  services/
    ledgerService.js        # createLedgerEntry(), reverseLedgerEntry() — ONLY way to write to ledger
    balanceService.js        # aggregation pipelines for dashboard/balance
    interestService.js       # simple/monthly/yearly interest calculators
    receiptService.js        # receipt number generation via Counter
  controllers/
    authController.js
    pangaliController.js
    variController.js
    contributionController.js
    donationController.js
    fundController.js
    expenseController.js
    ledgerController.js
    dashboardController.js
    reportController.js
    festivalController.js
    settingsController.js
    userController.js
  middleware/
    auth.js                 # verifyToken
    rbac.js                  # requireRole(...roles)
    validate.js               # express-validator error handler
    errorHandler.js
  routes/
    auth.routes.js
    pangali.routes.js
    vari.routes.js
    contribution.routes.js
    donation.routes.js
    fund.routes.js
    expense.routes.js
    ledger.routes.js
    dashboard.routes.js
    report.routes.js
    festival.routes.js
    settings.routes.js
    user.routes.js
    index.js                  # mounts all routers under /api
  utils/
    money.js                 # rupeesToPaise, paiseToRupees, formatINR
    asyncHandler.js
    ApiError.js
  server.js
  app.js
  .env.example
  package.json
```

## 4. Frontend Folder Structure

```
frontend/src/
  api/                # one axios wrapper per backend resource (pangaliApi.js, variApi.js, ...)
  components/
    layout/           # Sidebar, Topbar, AppLayout
    common/           # DataTable, Modal, StatCard, FilterBar, StatusBadge, Pagination
    forms/            # reusable form field wrappers around React Hook Form
  pages/
    Dashboard/
    Pangalis/         # List, Detail, Form
    VariCollection/
    Contributions/
    Donations/
    TempleFund/       # List, Detail (with repayment timeline), Form
    Expenses/
    Festivals/
    Ledger/
    Reports/
    Users/
    Settings/
    Login/
  context/
    AuthContext.jsx
  hooks/
    useAuth.js, usePagination.js, useDebounce.js
  utils/
    money.js (mirrors backend formatting), constants.js
  routes/
    AppRoutes.jsx      # React Router v6, role-guarded routes
```

## 5. Key Mongoose Schemas (summary — full code follows in implementation)

- **User**: name, phone/email, passwordHash, role (`ADMIN|COMMITTEE_MEMBER|VIEWER`), isActive.
- **Pangali**: pangaliCode (auto), familyName, houseName, phone, address, memberCount, annualVariAmountPaise, notes, isActive.
- **VariPayment**: pangaliId, financialYear, amountPaise, paymentDate, paymentMethod, receiptNumber, notes, status, ledgerTransactionId.
- **Contribution**: personType (`PANGALI|OTHER`), pangaliId?, personName?, contributionType (from configurable list in Settings), amountPaise, date, paymentMethod, receiptNumber, status, ledgerTransactionId.
- **Donation**: donorName, phone?, amountPaise, donationDate, purpose, paymentMethod, receiptNumber, status, festivalId?, ledgerTransactionId.
- **FundAdvance** (the loan itself): recipientType (`PANGALI|INDIVIDUAL`), pangaliId?, recipientName, principalPaise, interestType (`SIMPLE|MONTHLY|YEARLY|CUSTOM`), interestRatePercent, startDate, dueDate, purpose, notes, status (`ACTIVE|PARTIALLY_REPAID|CLOSED|OVERDUE`). **Principal here is immutable once created** — never edited.
- **FundTransaction** (every event against an advance): fundAdvanceId, type (`DISBURSEMENT|PRINCIPAL_REPAYMENT|INTEREST_PAYMENT`), amountPaise, date, paymentMethod, receiptNumber, notes, status, ledgerTransactionId. Outstanding principal = principalPaise − Σ(active PRINCIPAL_REPAYMENT). Interest is *never* netted against principal.
- **Expense**: category, amountPaise, date, paidTo, paymentMethod, festivalId?, billNumber, description, notes, status, ledgerTransactionId.
- **Festival**: name, startDate, endDate, year, description, budgetPaise.
- **LedgerTransaction**: date, type (enum you listed), direction (`CREDIT|DEBIT`), amountPaise, sourceType, sourceId, pangaliId?, paymentMethod, referenceNumber, description, createdBy, createdAt, status.
- **Settings**: templeName, address, logoUrl, currentFinancialYear, variTypes[], contributionTypes[], expenseCategories[], receiptPrefixes{}, interestDefaults.
- **Counter**: `_id` (e.g. `"receipt_VARI_2026"`), seq — used with `findOneAndUpdate({$inc:{seq:1}}, {upsert:true, new:true})` for atomic, gap-free receipt numbering per type per year.

## 6. Ledger Write Pattern (the most important architectural rule)

No controller ever calls `LedgerTransaction.create()` directly, and no controller ever computes a balance by reading a cached field. Every write goes through `ledgerService.createLedgerEntry()` inside a **MongoDB session/transaction**, so the domain document and its ledger entry are created atomically — if one fails, both roll back.

```js
// services/ledgerService.js (pattern)
async function createLedgerEntry({ session, date, type, direction, amountPaise,
    sourceType, sourceId, pangaliId, paymentMethod, referenceNumber, description, createdBy }) {
  const [txn] = await LedgerTransaction.create([{
    date, type, direction, amountPaise, sourceType, sourceId,
    pangaliId, paymentMethod, referenceNumber, description,
    createdBy, status: 'ACTIVE'
  }], { session });
  return txn;
}
```

A typical controller (e.g. recording a Vari payment) looks like:

```js
const session = await mongoose.startSession();
await session.withTransaction(async () => {
  const [payment] = await VariPayment.create([{...}], { session });
  const ledgerTxn = await ledgerService.createLedgerEntry({
    session, type: 'VARI_RECEIVED', direction: 'CREDIT',
    amountPaise: payment.amountPaise, sourceType: 'VariPayment',
    sourceId: payment._id, pangaliId: payment.pangaliId, ...
  });
  payment.ledgerTransactionId = ledgerTxn._id;
  await payment.save({ session });
});
```

**Cancellation** reverses via `status: 'CANCELLED'` on both documents (never a delete), and balance aggregation always filters `status: 'ACTIVE'`.

## 7. Balance & Dashboard Aggregation

`balanceService.getCurrentBalance()` runs a single aggregation over `LedgerTransaction` with `status: 'ACTIVE'`:

```js
[
  { $match: { status: 'ACTIVE' } },
  { $group: { _id: '$direction', total: { $sum: '$amountPaise' } } }
]
```
`balance = creditsTotal - debitsTotal`. Dashboard cards (Vari this year, donations, interest, etc.) are the same pattern with an added `$match` on `type` and a financial-year date range. This guarantees the dashboard can never drift from the ledger.

## 8. Interest Calculation Logic (`interestService.js`)

- **SIMPLE**: `interest = principal * rate/100 * (days/365)`
- **MONTHLY**: `interest = principal * (rate/100) * monthsElapsed`
- **YEARLY**: `interest = principal * (rate/100) * yearsElapsed`
- **CUSTOM**: rate/period stored, calculation deferred to manual entry with a mandatory note (system computes nothing, just displays what was entered).

All interest amounts computed for *display/expected* purposes only — actual interest received is always whatever is entered on a `FundTransaction`, because real-world partial/negotiated payments won't always match the formula exactly. This matches your rule "never overwrite the original principal or interest values."

## 9. Auth & RBAC

- JWT access token (short-lived, e.g. 8h) issued on login; password hashed with bcrypt.
- `middleware/auth.js` verifies the token and attaches `req.user`.
- `middleware/rbac.js` exposes `requireRole('ADMIN','COMMITTEE_MEMBER')` used per-route.
- Permission matrix:
  - **ADMIN**: everything, including user management, settings, cancellations/adjustments.
  - **COMMITTEE_MEMBER**: create Vari/Contribution/Donation/Expense/Fund-repayment records, view all reports/ledger; cannot cancel transactions, manage users, or edit settings.
  - **VIEWER**: read-only on dashboard, ledger, reports.

## 10. API Route Design (representative — full list mirrors the sidebar)

```
POST   /api/auth/login
GET    /api/auth/me

GET    /api/pangalis            POST /api/pangalis
GET    /api/pangalis/:id        PUT  /api/pangalis/:id
GET    /api/pangalis/:id/summary   (Vari expected/paid/remaining, fund status, full history)

GET    /api/vari                POST /api/vari
PUT    /api/vari/:id/cancel

GET    /api/contributions       POST /api/contributions
GET    /api/donations           POST /api/donations
GET    /api/fund-advances       POST /api/fund-advances
GET    /api/fund-advances/:id   POST /api/fund-advances/:id/transactions   (repayment/disbursement events)

GET    /api/expenses            POST /api/expenses
GET    /api/festivals           POST /api/festivals

GET    /api/ledger              (filter: from,to,type,pangaliId,paymentMethod)
GET    /api/dashboard/summary
GET    /api/reports/:reportType  (query params for date range etc.)
GET    /api/settings            PUT  /api/settings
GET    /api/users               POST /api/users   (ADMIN only)
```

## 11. Data Relationships Diagram (conceptual)

```
Pangali ──< VariPayment
        ──< Contribution (optional, personType=PANGALI)
        ──< FundAdvance ──< FundTransaction
Festival ──< Expense (optional)
        ──< Donation (optional)
        ──< Contribution (optional)
Every domain doc ──1:1── LedgerTransaction (via ledgerTransactionId / sourceId)
```

## 12. Development Order (as you specified)

1. Backend scaffold + DB models ✅ (this delivery)
2. Auth (User model, JWT, RBAC) ✅ (this delivery)
3. Pangali management ✅ (this delivery)
4. Vari Collection
5. Contributions & Donations
6. Temple Fund / Interest
7. Expenses
8. Central Ledger endpoints
9. Dashboard
10. Reports
11. Frontend (built alongside from module 2 onward in a real project, but sequenced last here per your instruction to focus backend-first)

Everything below this point implements steps 1–3. I'll continue with Vari Collection next once you confirm this foundation looks right.

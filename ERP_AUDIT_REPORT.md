# SimpleERP — Comprehensive Audit Report

**Date:** 28 February 2026
**Auditor Perspective:** Senior ERP Product Architect & QA Expert
**Scope:** Functional integrity, data integrity, edge cases, best practices, and production readiness for the existing 6-module prototype.

---

## Phase 1: Functional Integrity Check

### 1.1 Supplier Module

| Area | Status | Details |
|------|--------|---------|
| CRUD | ✅ Working | Create, read, update, delete all functional |
| Duplicate prevention | ⚠️ Missing | No check for duplicate supplier name or email — two "TechSupply Co" entries can coexist |
| Required field validation | ✅ Partial | Name and email are required (HTML `required`); phone, company, productsSupplied, rating are optional — correct for MVP |
| Unique identifiers | ✅ OK | Uses Firestore auto-generated document IDs |
| Linked to orders/inventory | ❌ Not linked | Suppliers are standalone; no foreign key to products or purchase orders. Acceptable for MVP but means deleting a supplier has no cascade impact |
| Role-based access | ✅ Working | Employees see read-only forms; delete button hidden for employees |

**Bugs found:**
- **B1-S1:** `filteredItems` filter on `item.company.toLowerCase()` will crash if `company` is undefined/null (optional field). Need `(item.company || '').toLowerCase()`.
- **B1-S2:** No `createdAt`/`updatedAt` timestamps written on create or update operations.

---

### 1.2 Customer Module

| Area | Status | Details |
|------|--------|---------|
| CRUD | ✅ Working | All operations functional |
| Data validation | ✅ Partial | Name + email required; email uses `type="email"` for format check |
| Duplicate prevention | ⚠️ Missing | No duplicate email check — same customer can be created twice |
| Clean data structure | ✅ OK | Flat document, sensible field types |
| Linked to orders | ⚠️ Weak | Orders reference `customerName` (string) not `customerId` (FK). Sales module stores `customerId` but it's empty string for seed data. No automatic `totalOrders`/`totalSpent` sync. |

**Bugs found:**
- **B1-C1:** Same crash risk as suppliers — `item.company.toLowerCase()` in filter will throw if `company` is undefined.
- **B1-C2:** `totalOrders` and `totalSpent` are manually editable fields — they should ideally be computed from actual orders, or at minimum marked as display-only.
- **B1-C3:** No `createdAt`/`updatedAt` timestamps on create/update operations.

---

### 1.3 Inventory Module

| Area | Status | Details |
|------|--------|---------|
| CRUD | ✅ Working | Product create, edit, delete all functional |
| Add Stock | ✅ Working | Bulk stock addition with audit trail (`stockEntries` collection) |
| Negative stock prevention | ⚠️ Partial | `min="0"` on stock input prevents manual negative entry, but no server-side guard — stock could go negative through order operations (none currently deduct stock) |
| Transaction history | ✅ New | `stockEntries` collection logs stock additions with date, items, cost, note |
| Real-time updates on order | ❌ Missing | Placing an order does NOT deduct inventory — this is the **biggest functional gap** |
| Concurrency safety | ❌ Missing | Two users adding stock simultaneously could race. Firestore `increment()` should be used instead of read-then-write |

**Bugs found:**
- **B1-I1 (CRITICAL):** Order creation does not deduct stock from inventory. A product can be "sold" infinitely without affecting inventory levels.
- **B1-I2:** Add Stock modal updates `price` to the cost-per-unit entered, potentially overwriting the selling price with purchase cost. These should be separate fields.
- **B1-I3:** `getStockPercentage` uses hardcoded `100` as max (`stock / 100 * 100`) — should use `minStock` as reference: `Math.min((stock / minStock) * 100, 100)`.

---

### 1.4 Order Module (Sales)

| Area | Status | Details |
|------|--------|---------|
| CRUD | ✅ Working | Create, edit, view, delete all functional |
| Line items | ✅ Working | Product picker, qty, price, add/remove rows |
| Auto-calculation | ✅ Working | Subtotal, discount%, GST 18%, grand total all auto-compute |
| Customer dropdown | ✅ Working | Dynamic search from Customers collection with auto-fill email |
| Order lifecycle | ⚠️ Partial | Status field allows: Pending → Processing → Shipped → Delivered, but there are no lifecycle rules (e.g., can go directly from Pending to Delivered, or back from Delivered to Pending) |
| Inventory deduction | ❌ Missing | Stock is not deducted when order is created or status changes |
| Data integrity | ⚠️ Weak | `customerId` is stored but seed data leaves it blank; `productId` in line items is blank in seed data |
| Orphan records | ⚠️ Risk | Deleting a customer doesn't affect existing orders referencing that customer name |
| Double-submit protection | ❌ Missing | No loading/disabled state on submit button during API call — rapid double-click creates duplicate orders |

**Bugs found:**
- **B1-O1 (CRITICAL):** No inventory deduction on order creation.
- **B1-O2:** Double-click on "Create Order" can create duplicate orders — no `submitting` state guard on the button.
- **B1-O3:** `customerName` in the form is set via `required` but validation allows a typed name that doesn't match any customer in the database (free text fallback). This means orders can reference non-existent customers.
- **B1-O4:** Order number collision possible if two users create orders simultaneously — `nextOrderNumber` is client-side state, not an atomic server counter.

---

### 1.5 Dashboard

| Area | Status | Details |
|------|--------|---------|
| Metrics accuracy | ✅ OK | Revenue, orders, products, customers all summed correctly from Firestore |
| Queries optimized | ⚠️ Concern | Fetches ALL documents from ALL collections on every dashboard load — no pagination, caching, or aggregation. Fine for <1000 docs but will degrade |
| Real-time vs cached | ❌ No caching | Full re-fetch on every mount. No stale-while-revalidate or time-based cache |
| Charts | ✅ Working | Revenue trend (7 months) and order status pie chart render correctly |
| Low stock alerts | ✅ Working | Correctly identifies products where stock < minStock |

**Bugs found:**
- **B1-D1:** Revenue chart groups by month using `toLocaleDateString` — locale-dependent, could produce inconsistent keys across browsers.
- **B1-D2:** "Load Demo Data" button has no duplicate protection — clicking it twice seeds data twice, creating duplicates.

---

### 1.6 User Management (Auth)

| Area | Status | Details |
|------|--------|---------|
| Authentication | ✅ Secure | Firebase Auth handles password hashing, token management |
| Error handling | ✅ Good | Comprehensive error mapping for Firebase v10 codes |
| Role-based access | ✅ Working | Roles stored in Firestore `users` collection, normalized to lowercase |
| Authorization checks | ⚠️ Client-only | All role checks happen in React components (hiding buttons/forms). No Firestore Security Rules enforce role-based write access |
| Privilege escalation | ⚠️ Risk | Any user can register as "Admin" — no approval workflow or admin-only role assignment |
| Password handling | ✅ Secure | Firebase Auth — passwords never stored in Firestore |

**Bugs found:**
- **B1-U1 (SECURITY):** Anyone can self-register as Admin. In a real system, role assignment should be admin-only or require approval.
- **B1-U2 (SECURITY):** Firestore Security Rules are likely permissive (`allow read, write: if request.auth != null`). This means any authenticated user can write to any collection, including `users`, and change their own role to "admin" via the browser console.
- **B1-U3:** No email verification step after registration.

---

## Phase 2: Data Integrity & Architecture Review

### 2.1 Database Design

| Aspect | Assessment |
|--------|------------|
| **Normalization** | Mostly denormalized (NoSQL pattern). Customer name stored as text in orders rather than FK reference. Acceptable for Firestore but creates update anomalies. |
| **Foreign key usage** | Weak. `customerId` and `productId` fields exist in orders but are often empty strings. No enforced referential integrity. |
| **Cascading deletes** | ❌ None. Deleting a customer leaves orphan orders. Deleting a product leaves orphan line items in orders. |
| **Transaction handling** | ❌ No Firestore transactions used. Stock updates, order creation are all independent writes. |
| **Indexing** | Firestore auto-indexes all fields. Composite queries (e.g., `orderBy('date', 'desc')`) may need explicit composite indexes. |
| **Error handling** | Inconsistent. Most modules `console.error` and silently continue. No user-facing error toasts except Login. |
| **Input validation** | Client-side only (HTML5 `required`, `min`, `type`). No server-side validation via Firestore rules. |
| **Separation of concerns** | ⚠️ Weak. Business logic (calculations, validations) is embedded directly in React components. No service layer or custom hooks for data operations. |

### 2.2 Flags

| Flag | Severity | Description |
|------|----------|-------------|
| **Data corruption risk** | 🔴 High | Concurrent stock updates without Firestore `increment()` or transactions can lead to lost updates |
| **Scalability bottleneck** | 🟡 Medium | Dashboard fetches ALL documents. At 10K+ orders this will timeout or hit Firestore read limits |
| **Technical debt** | 🟡 Medium | Business logic in components, no shared service layer, no custom hooks for CRUD, repeated patterns across modules |
| **Security rules** | 🔴 High | Client-only authorization. Any user with browser dev tools can bypass role restrictions via direct Firestore writes |

---

## Phase 3: Edge Case Simulation

| Scenario | Result | Impact |
|----------|--------|--------|
| **Double-click order creation** | ❌ Creates duplicate | Two identical orders with same products, different order numbers |
| **Concurrent inventory updates** | ❌ Race condition | Two simultaneous Add Stock operations → last write wins, first update lost |
| **Delete supplier linked to nothing** | ✅ Safe | Suppliers are standalone, no cascade issues |
| **Delete product with active orders** | ⚠️ Orphan data | Order line items still reference deleted product name, but won't break display since they store name as text |
| **Delete customer with orders** | ⚠️ Orphan data | Orders keep `customerName` text so they still display, but `customerId` points to nothing |
| **Invalid inputs (empty/large/negative)** | ✅ Mostly handled | HTML5 `min` attributes prevent negative. No max limits on quantity (someone could enter 999999999) |
| **Network failure mid-transaction** | ⚠️ Partial writes | Multi-step operations (stock update + stock entry log) aren't atomic — one could succeed while the other fails |
| **Unauthorized API access** | 🔴 Vulnerable | Anyone authenticated can write to any Firestore collection via browser console |

---

## Phase 4: Minimal ERP Best Practices Check

| Practice | Status | Notes |
|----------|--------|-------|
| Clean entity relationships | ⚠️ Partial | Exists conceptually but not enforced. Need stronger FK usage. |
| Proper ID strategy | ✅ OK | Firestore auto-generated IDs (UUID-like). Order numbers are sequential formatted strings. |
| Audit timestamps | ⚠️ Inconsistent | Seed data adds `createdAt`/`updatedAt`. Manual creates in Customers/Suppliers modules do NOT add timestamps. Inventory Add Stock does. Orders do. |
| Soft delete vs hard delete | ❌ Hard delete only | All deletes are permanent `deleteDoc()`. No soft delete, no trash/archive. |
| Logging for critical operations | ⚠️ Partial | `stockEntries` collection logs inventory additions (good). No audit log for order status changes, deletions, or user role changes. |
| Consistent naming conventions | ✅ Mostly good | camelCase throughout. Some inconsistency: `items` (legacy string) vs `lineItems` (array) in orders. |
| Clear error messaging | ⚠️ Partial | Login has great error messages. Other modules show no user-facing error toasts — errors only logged to console. |

---

## Phase 5: Final Evaluation

### Overall MVP Stability Score: **6.5 / 10**

The app works end-to-end for its happy path. Users can register, log in, manage products/customers/suppliers, create orders with line items and GST, and see a functioning dashboard. The UI is clean and responsive. For a capstone project demo, this is solid.

### Production Readiness Score: **3.5 / 10**

Not suitable for real business use without addressing the critical items below. The main gaps are security (Firestore rules), data integrity (no inventory deduction, no transactions), and lack of server-side validation.

---

### Top 5 Critical Fixes Before Real Users

1. **Inventory deduction on order creation** — When an order is created/confirmed, deduct stock from products. When cancelled, restore stock. Use Firestore `runTransaction()` for atomicity. *This is the #1 ERP functional gap.*

2. **Firestore Security Rules** — Move from permissive rules to role-aware rules. Admin role should be verified server-side. At minimum: only admins can write to `users` role field; only authenticated users can read; only admins can delete.

3. **Remove self-registration as Admin** — Either remove the role dropdown from registration (everyone starts as Employee), or add an admin approval workflow. Currently anyone can make themselves an admin.

4. **Double-submit protection** — Add `submitting` state to all forms (Sales, Inventory, Customers, Suppliers) that disables the submit button during API calls. The Sales form especially needs this.

5. **Use Firestore transactions for stock updates** — Replace read-then-write stock updates with `runTransaction()` or `increment()` to prevent race conditions on concurrent stock operations.

---

### Top 5 Quality Improvements

1. **Add `createdAt`/`updatedAt` timestamps to ALL module writes** — Currently only some modules add these. Should be universal for audit trail.

2. **Add user-facing error toasts/notifications** — Currently errors are only logged to console. Use a toast library or simple state-based notifications so users see when operations fail.

3. **Null-safety on search filters** — Add `(item.company || '').toLowerCase()` guards to Customers and Suppliers filter functions to prevent crashes on optional fields.

4. **Separate purchase price from selling price** — The Add Stock modal currently overwrites the product's `price` field with the cost-per-unit. These should be `costPrice` and `sellingPrice` as separate fields.

5. **Extract shared CRUD service layer** — Create a `services/firestore.js` with reusable functions (`fetchCollection`, `createDoc`, `updateDoc`, `deleteDoc`) to reduce code duplication across the 4 CRUD modules and separate business logic from UI.

---

### Architecture Scalability Assessment: ✅ Yes, with caveats

The React + Firebase + Firestore architecture **can scale** without a rewrite. Firestore handles horizontal scaling natively. The component structure is clean and modular. To scale:

- Add pagination (Firestore `startAfter` cursors) instead of fetching all docs
- Add Firestore composite indexes for filtered queries
- Move dashboard aggregations to Cloud Functions (server-side) or Firestore aggregation queries
- Implement proper Firestore Security Rules
- Add a service/hook layer between components and Firestore

None of these require rewriting the app — they're incremental improvements on the existing architecture.

---

*Report generated for SimpleERP capstone project audit. Findings are based on static code review of all source files.*

# SimpleERP — 5-Minute Demo Script

---

## 0:00–0:30 — Opening & Context

- "SimpleERP is a lightweight, cloud-based ERP system built for small businesses to manage day-to-day operations from a single dashboard."
- Mention the tech stack briefly: **React 18, Firebase, Vite, Tailwind CSS**.
- Highlight that it's a fully responsive web app — works on desktop and mobile.
- Show the **login screen**. Point out there's no public signup — access is controlled by the admin, reinforcing data security.

---

## 0:30–1:30 — Dashboard Overview

- Log in as **Admin** to show the full experience.
- Walk through the **Dashboard** — highlight the at-a-glance metrics: total products, active customers, recent sales, revenue summary.
- "This gives the business owner an instant snapshot without digging into individual modules."

---

## 1:30–2:30 — Inventory Module

- Navigate to **Inventory**.
- Show **Add Product** — enter a product name, category, price, stock quantity.
- Show **Add Stock** to an existing product — "Employees can restock, but only admins can add new products or change product status."
- Toggle a product's **active/inactive status** (admin only).
- "This keeps inventory accurate while giving the team just enough access to do their jobs."

---

## 2:30–3:30 — Sales Module

- Navigate to **Sales**.
- **Create a new sale order** — select a customer, add line items, apply a discount, set payment and delivery status.
- Show the **quick actions** in the order view — update payment status, mark as delivered.
- "Both admins and employees can create orders and update statuses, but only admins can edit or delete existing orders."
- Briefly show how totals calculate automatically with discounts.

---

## 3:30–4:15 — Customers & Suppliers

- Quick flip to **Customers** — show the list, add a new customer with contact details.
- Quick flip to **Suppliers** — same pattern, add a new supplier.
- "Employees can add new records to keep the database growing, but editing or disabling existing entries is reserved for admins — preventing accidental data loss."

---

## 4:15–4:45 — Role-Based Access Control

- Switch to an **Employee account** (or describe the difference).
- Show how the UI adapts: edit/delete buttons disappear, form fields lock when viewing existing records.
- "The app doesn't just hide features — it enforces permissions at every level, so the interface stays clean and intuitive for each role."

---

## 4:45–5:00 — Closing

- "SimpleERP is deployed on **GitHub Pages** with Firebase handling authentication and real-time data — zero server management."
- "It's built to be extensible — adding new modules like reporting or analytics is straightforward with the existing architecture."
- "Thank you — happy to take questions."

---

### Tips for Delivery

- **Keep transitions snappy** — have sample data pre-loaded so you're not typing during the demo.
- **Pre-create two accounts** (one admin, one employee) and keep both logged in on separate browser tabs or windows for the role comparison.
- **If something breaks live**, acknowledge it briefly and move on — the architecture talking points carry the demo even without a live walkthrough.

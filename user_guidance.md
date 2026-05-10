# 📊 Sales Monitoring System - Comprehensive Guidance

This document provides a full breakdown of the application flow, financial metrics, and status transition logic for both the Mobile App and Admin Dashboard.

---

## 🔄 Application Workflow (The Full Cycle)

The system is designed to provide a closed-loop flow from the field to the headquarters.

### 1. The Salesman Visit Flow
1.  **Preparation**: Salesman checks the store list. Stores are marked as **Active** (visited this month) or **Inactive** (not yet visited).
2.  **Arrival & Check-In**: 
    *   Salesman must physically be within **10 meters** of the store's GPS coordinates.
    *   The app uses high-accuracy GPS to verify location. If the salesman is outside the radius, the transaction form remains locked.
3.  **Transaction Entry**:
    *   **Orders**: Adding items sold to the store.
    *   **Returns**: Recording physical goods returned (e.g., expired or damaged stock).
4.  **Payment Collection**: Recording the actual cash or bank transfer amount received (**Tagihan**).
5.  **Documentation**: Uploading photos of receipts or stock as proof.
6.  **Checkout**: Data is transmitted to the server. The salesman can now move to the next store.

### 2. The Admin Review Flow
1.  **Dashboard Alert**: Admin sees new activities instantly on the Web Dashboard.
2.  **Audit & Validation**: Admin reviews the visit details. If a salesman edits a visit later, the Admin sees an **Audit Log** showing the `Old Value` vs `New Value` of the transaction.
3.  **Status Oversight**: Admin monitors the **Payment Status** to ensure debt is being collected.

---

## 📈 Dashboard Metrics Explained

The Admin Dashboard provides high-level KPIs to measure business health:

| Metric | Definition | Importance |
| :--- | :--- | :--- |
| **Gross Sales MTD** | Total value of all `Order Amounts` this month. | Measures overall market demand and salesman activity. |
| **Collection MTD** | Total `Tagihan` (Actual Cash) received this month. | The actual liquidity/cash flow of the business. |
| **Returns MTD** | Total value of goods returned this month. | High returns may indicate product quality issues or over-stocking. |
| **Net Performance** | `Gross Sales - Returns` | The real revenue generated after accounting for losses. |
| **Active vs Inactive** | Ratio of stores visited vs. total stores. | Measures salesman "Coverage" efficiency. |
| **Sales Trend** | 15-day rolling line chart. | Visualizes whether sales are growing or declining week-over-week. |

---

## 🏷️ Payment Status Lifecycle & Transitions

The **Payment Status** is the most critical field in the system. It is calculated automatically by the backend based on the visit's financial data.

### 1. Status Definitions
*   🟢 **Full Payment**: `Collected >= (Order - Return)`. The visit is fully paid for.
*   🔵 **Partial Payment**: `0 < Collected < (Order - Return)`. Store paid some, but still owes a balance.
*   🟣 **Collection Only**: `Order == 0` AND `Collected > 0`. This is a "Debt Collection" visit.
*   🔴 **Unpaid**: `Order > 0` AND `Collected == 0`. Goods were delivered on credit.
*   ⚪ **Check-in Only**: `Order == 0` AND `Collected == 0`. A monitoring/maintenance visit.

### 2. Transition Case Study: Debt Recovery
The system handles store debt through status transitions across multiple visits:

*   **Visit 1 (Sales Visit)**: 
    *   Salesman sells Rp 1.000.000 of goods. Store pays Rp 0.
    *   **Status**: 🔴 **Unpaid**. 
    *   **Outstanding**: Rp 1.000.000 is added to the store's debt profile.
*   **Visit 2 (Collection Visit)**:
    *   Salesman visits two days later. No new goods are sold (`Order = 0`).
    *   Store pays Rp 1.000.000.
    *   **Status**: 🟣 **Collection Only**.
    *   **Outstanding**: Rp 1.000.000 is subtracted. Store is now clear (Debt = 0).
*   **Visit 3 (Mixed Visit)**:
    *   Salesman sells Rp 500.000. Store pays Rp 700.000 (paying today's goods + Rp 200.000 extra).
    *   **Status**: 🟢 **Full Payment**.
    *   **Outstanding**: Any existing debt is reduced by the extra Rp 200.000.

---

## 🛠️ Key Application Features

### Mobile Features
*   **Edit History**: Every change to a visit is tracked. Salesmen can correct mistakes, but they cannot "hide" changes from Admin.
*   **Due Info**: If a transaction is on credit, the app tracks the `Due Date` and alerts if it becomes **Overdue**.
*   **Bulk Product Selection**: Interface designed for speed in the field, allowing salesmen to select dozens of products in seconds.

### Admin Features
*   **Expandable History**: Click any visit to see the full "Audit Log" of every edit made to that specific transaction.
*   **Salesman Performance**: Automatic ranking of salesmen based on their Net Sales and Store Coverage.

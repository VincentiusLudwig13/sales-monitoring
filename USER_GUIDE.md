# 🚀 Sales Monitoring Platform - Operational Guide

Welcome to the Sales Monitoring Platform. This guide explains how to use the program, the business flow, and how the financial numbers are calculated for both Salesmen and Administrators.

---

## 👥 Roles & Responsibilities

### 1. Field Salesman (Mobile App)
The primary responsibility is to maintain store relationships and record accurate field data.
*   **Store Setup**: Registering new store locations with photos and verified check-in points.
*   **Transactions**: Recording new orders, processing returns, and collecting payments.
*   **Activity Proof**: Capturing live photos of every visit to ensure transparency.

### 2. Administrator (Web Dashboard)
The primary responsibility is to monitor performance and ensure data accuracy.
*   **Quality Control**: Reviewing salesman activities and "Validating" them to confirm they are correct.
*   **Performance Tracking**: Analyzing sales trends and salesman efficiency.
*   **Management**: Keeping the product list and user accounts up to date.

---

## 📊 Understanding the Metrics (How the Numbers Work)

### 🏬 For the Salesman (Store View)
When a salesman visits a store, they see three key financial indicators for that specific location:
| Metric | Meaning |
| :--- | :--- |
| **Store Sales History** | The total value of all successful orders ever placed by this store. |
| **Store Return History** | The total value of all products ever returned by this store. |
| **Outstanding Balance** | The current amount of money the store still owes. This increases with new orders and decreases when the salesman "collects" payment. |

### 🏢 For the Administrator (Dashboard View)
The dashboard summarizes the performance of the entire company:
| Metric | Calculation |
| :--- | :--- |
| **Gross Sales (Monthly)** | Total value of all validated orders placed this month. |
| **Total Returns (Monthly)** | Total value of all validated returns processed this month. |
| **Net Sales (Monthly)** | The actual income (`Total Orders` minus `Total Returns`). |
| **Total Outstanding** | The total amount of money currently owed to the company by all stores combined. |
| **Active Stores** | How many stores have been visited and had a transaction approved this month. |

---

## 🔄 The Business Flow

### Step 1: Store Onboarding
Before a salesman can visit a store, it must be registered.
1.  The salesman captures the **Store Location** while standing directly in front of it.
2.  A **Map Preview** appears to confirm the location is correct.
3.  Photos of the store are uploaded for identification.

### Step 2: Store Visit & Transaction
1.  **Check-in**: The system only allows check-in if the salesman is physically at the store (within a 50-meter radius).
2.  **Live Map**: A map shows the salesman's current position (blue dot) relative to the store to help them find the correct spot.
3.  **Recording**: The salesman enters the order, any returns, and the amount of money collected today.
4.  **Photo Evidence**: The salesman takes photos of the transaction or the store shelf as proof.

### Step 3: Admin Approval (Validation)
**Important**: No transaction affects the company's financial totals until it is approved by an Admin.
*   Admins check the "Validation Queue" to see photos and visit details.
*   **Approval**: Once approved, the store's balance and the company's sales totals are updated.
*   **Rejection**: If the data or photos are incorrect, the admin can reject it, and it won't count toward the sales totals.

---

## 🧹 System Maintenance

### Resetting for a New Period
When starting a new sales cycle or clearing test data:
*   The system can be reset to a "Fresh" state.
*   This clears all previous visits, transactions, and store balances.
*   All Master Data (Accounts and Product Price List) is kept safe and does not need to be re-entered.

---

## 🛡️ Data Protection & Backups

To ensure your business data is always safe, the system includes an **Automated Backup Service**.

### 1. Backup Schedule
The system automatically takes a full snapshot of your data three times every day:
*   **Mid-day**: 12:00 PM
*   **End of Shift**: 5:00 PM
*   **Evening Audit**: 6:00 PM

### 2. What is Protected?
*   **Transactions**: All sales, returns, and collection records.
*   **Photo Evidence**: All store photos and visit proof attachments.
*   **Master Data**: Your product lists, user accounts, and store locations.

### 3. Retention Policy
The system maintains a rolling **7-day history** of backups. Older backups are automatically cleared to optimize server storage.

---

## 💡 Summary of Activity History
Admins can view the full **Visit History** of any salesman by clicking the clock icon on the performance table. This shows a detailed list of every store they visited, what they sold, and what they collected, ensuring full accountability.

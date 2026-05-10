# Sales Monitoring Application Documentation

## 1. Project Overview
This application is designed for field sales teams to monitor store visits, manage sales orders, track collections (tagihan), and handle returns. It features a React Native (Expo) mobile frontend and a FastAPI backend.

---

## 2. User Workflow (Application Flow)

### 2.1. Authentication
- **Login**: Salesmen log in using their **NIK** (Employee ID) and **Password**.
- **Role-based Access**: Supports 'salesman' and 'admin' roles.

### 2.2. Dashboard (Mobile)
- View performance metrics for the current period:
  - **Sales Net MTD**: Total **Validated** Net Sales (Orders - Returns) for the current month.
  - **Sales Net Today**: Net Sales performance for the current day (includes **Pending** orders).
  - **Budget Retur MTD**: A calculated allowance for returns (1% of Sales Net MTD).
  - **Retur MTD**: Actual returns processed this month.

### 2.3. Store Management
- **Store List**: A searchable list of all registered stores.
- **Register New Store**: Salesmen can register new stores with name, GPS coordinates, and a photo.

### 2.4. Store Visit & Activity
- **Check-In Validation**: Salesmen must be within the configured radius (default: 10 meters, configurable via `EXPO_PUBLIC_CHECKIN_RADIUS`) of the store to check in.
- **Activity Entry**: Input Order, Retur, and Tagihan.
- **Validation State**: All entries are submitted as `pending` and do not affect the store balance until approved by an Admin.
- **Salesman Edit**: Salesmen can edit their own past transactions from the store history list.

---

## 3. Business Logic & Formulas

### 3.1. Net Sales
`Net Sales = Order Amount - Retur Amount`

### 3.2. Outstanding Balance
`New Outstanding = Old Outstanding + Order - Tagihan`
*(Updated only upon Admin validation)*

### 3.3. Payment Status Logic
Visits are automatically categorized:
- **Full Payment**: Order is fully paid by collection (`Order == Tagihan`).
- **Partial Payment**: Collection is made but less than the order amount.
- **Unpaid**: Order placed but no collection made.
- **Collection Only**: No order, just payment for previous debt.

### 3.4. Due Dates & Overdue tracking
- **Conditional Due Dates**: A `Due Date` is generated **only if an order is placed and not fully paid**.
- **Standard Term**: Due Date is set to **3 days** post-visit.
- **Overdue Status**: Highlighted if the current date exceeds the Due Date.

---

## 4. Admin Web Dashboard

### 4.1. Access
- **URL**: `http://localhost:3000`
- **Account**: Dedicated `admin` login.

### 4.2. Core Features
- **3-Point Validation Queue**:
    - Admin must manually check three checkpoints (**Order**, **Retur**, and **Tagihan**) before approval.
- **Performance Analytics**:
    - **Active vs Inactive Stores**: Tracking activity within a 7-day window.
- **Activity Management**:
    - **Advanced Search & Filter**: Search by store/salesman and filter by Payment Status.
    - **Multi-Column Sorting**: Sort by Date, Store Name, or Order Amount.
    - **Edit Transactions**: Admin can modify any transaction; the system automatically adjusts store balances and payment statuses.
- **User Management**: Full CRUD for managing salesman accounts.

---

## 5. Technical Documentation: Backend

### 5.1. API Endpoints
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/login` | Authenticates user. |
| `GET` | `/stats/admin` | Consolidated metrics for Web Dashboard. |
| `GET` | `/visits` | Returns all visits. |
| `POST` | `/visits` | Creates a `pending` visit. |
| `PUT` | `/visits/{id}` | Updates an existing visit and recalculates balances. |
| `POST` | `/visits/{id}/validate` | Approves a visit. |
| `GET` | `/stores` | Returns registered stores. |
| `GET` | `/users` | Lists salesmen accounts. |

---

## 6. Installation & Deployment

### Environment Configuration
The application uses `.env` files to configure network connections and app settings.

**Admin Web (`AdminWeb/.env`)**:
```env
VITE_API_TARGET=http://YOUR_IP:9000
```

**Mobile App (`SalesMonitoring/.env`)**:
```env
EXPO_PUBLIC_API_URL=http://YOUR_IP:9000
EXPO_PUBLIC_CHECKIN_RADIUS=50
```

### Backend (FastAPI)
1. Navigate to `/backend`.
2. Install: `pip install -r requirements.txt`.
3. Start: `python -m uvicorn main:app --host 0.0.0.0 --port 9000 --reload`.

### Admin Web Frontend (React/Vite)
1. Navigate to `/AdminWeb`.
2. Install: `npm install`.
3. Start: `npm run dev -- --host`.

### Mobile Frontend (Expo)
1. Navigate to `/SalesMonitoring`.
2. Install: `npm install`.
3. Start: `npx expo start --host lan`.


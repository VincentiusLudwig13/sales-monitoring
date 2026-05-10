# Running Guide: Sales Monitoring System

This guide explains how to start and configure the three main components of the system: the **Backend API**, the **Admin Web Dashboard**, and the **Mobile Application**.

## 1. Prerequisites

- **Python 3.8+** (for Backend)
- **Node.js 18+** & **npm** (for Admin Web & Mobile)
- **Expo Go** app installed on your physical mobile device (if testing mobile).

---

## 2. Setting Your IP Address (Hostname)

For the Mobile App and Admin Web to communicate with the Backend on a local network, you must use your PC's local IP address instead of `localhost`.

### Step A: Find your IP Address
1. Open **Command Prompt** on Windows.
2. Type `ipconfig` and press Enter.
3. Look for **IPv4 Address** (e.g., `192.168.1.XX`).

### Step B: Update Configuration
Instead of editing source code, use the `.env` files in each project directory:

1.  **Admin Web Dashboard**: Edit `AdminWeb/.env`:
    ```env
    VITE_API_TARGET=http://YOUR_IP:9000
    ```
2.  **Mobile Application**: Edit `SalesMonitoring/.env`:
    ```env
    EXPO_PUBLIC_API_URL=http://YOUR_IP:9000
    EXPO_PUBLIC_CHECKIN_RADIUS=50
    ```

*Note: The system now uses these environment variables to configure the API base path centrally and the store check-in radius.*

*Note: All other pages (like the Admin Stores page or Mobile Store Detail page) now automatically use these centralized settings.*

---

## 3. Starting the Components

Open three separate terminals to run each service.

### Service 1: Backend API
Navigate to the `backend` directory and run:
```powershell
pip install -r requirements.txt
python -m uvicorn main:app --host 0.0.0.0 --port 9000 --reload
```
*The backend is now configured to start on port **9000**.*

### Service 2: Admin Web Dashboard
Navigate to the `AdminWeb` directory and run:
```powershell
npm install
npm run dev -- --host
```
*The dashboard will be available at `http://localhost:3000` or your local IP (e.g. `http://YOUR_IP:3000`).*

### Service 3: Mobile Application
Navigate to the `SalesMonitoring` directory and run:
```powershell
npm install
npx expo start --host lan
```
*A QR code will appear. Scan it with the **Expo Go** app on your phone. Ensure your phone and PC are on the same Wi-Fi network.*

---

## 4. Default Credentials

- **Admin**: NIK: `admin` | Password: `admin`
- **Salesman**: NIK: `12345` | Password: `password`

---

## Troubleshooting

- **Connection Error on Mobile**: Double-check that your phone is on the same Wi-Fi as your PC and that your firewall allows connections on port `9000`.
- **Backend Port**: If port `9000` is occupied, change it in `backend/main.py` and update the `target` in `vite.config.ts` and `API_BASE_URL` in `storage.js` to match.

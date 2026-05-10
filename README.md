# Sales Monitoring System

A comprehensive sales monitoring solution featuring a mobile application for salesmen and a web dashboard for administrators, backed by a FastAPI server.

## Project Structure

- `backend/`: FastAPI server with mock data and image upload support.
- `AdminWeb/`: React + Vite admin dashboard for visit validation and statistics.
- `SalesMonitoring/`: Expo/React Native mobile application for salesmen.

## Prerequisites

- Node.js (v18+)
- Python (3.9+)
- Expo CLI (for mobile app)

## Getting Started

### 1. Backend Setup
1. Navigate to `backend/`.
2. Install dependencies: `pip install -r requirements.txt`.
3. Create a `.env` file from `.env.example`.
4. Run the server: `python main.py`.
5. The API will be available at `http://localhost:9000`.

### 2. Admin Web Setup
1. Navigate to `AdminWeb/`.
2. Install dependencies: `npm install`.
3. Create a `.env` file from `.env.example`.
4. Run the dev server: `npm run dev`.
5. Open `http://localhost:3000` in your browser.

### 3. Mobile App Setup
1. Navigate to `SalesMonitoring/`.
2. Install dependencies: `npm install`.
3. Create a `.env` file from `.env.example`.
4. Run the app: `npx expo start`.
5. Use the Expo Go app on your phone or an emulator to run the project.

## Environment Variables

Each project has an `.env.example` file. Copy these to `.env` and adjust as needed:
- **Backend**: Port and Host settings.
- **AdminWeb**: `VITE_API_TARGET` (The backend URL).
- **SalesMonitoring**: `EXPO_PUBLIC_API_URL` (The backend URL).

## Deployment

For instructions on how to deploy this system on a production server using `systemd` and `nginx`, see the [DEPLOYMENT.md](./DEPLOYMENT.md) guide.

## Security Note


- `.env` files are excluded from version control via `.gitignore`.
- Always use the `.env.example` as a template for new deployments.
- No real production credentials should be committed to this repository.

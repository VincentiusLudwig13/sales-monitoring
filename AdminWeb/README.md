# Sales Monitoring Admin Web

Admin Dashboard for the Sales Monitoring System. Built with React, Vite, and Tailwind CSS (or Ocean Glass theme).

## Features

- **Validation Queue**: Review and validate/reject salesman visits.
- **Store Management**: View store details, locations, and historical sales.
- **Product Management**: Manage inventory and pricing.
- **Live Statistics**: Real-time sales metrics and store status.

## Setup

1. **Installation**:
   ```bash
   npm install
   ```

2. **Configuration**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Set `VITE_API_TARGET` to your backend URL (e.g., `http://localhost:9000`).

3. **Running**:
   ```bash
   npm run dev
   ```
   Access the dashboard at `http://localhost:3000`.

## Tech Stack

- **Framework**: React 18+
- **Build Tool**: Vite
- **Styling**: CSS / Custom Theme
- **Icons**: Lucide React

## Deployment

For production deployment using `systemd` and `nginx`, refer to the root [DEPLOYMENT.md](../DEPLOYMENT.md).


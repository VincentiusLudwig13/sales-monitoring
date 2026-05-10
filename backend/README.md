# Sales Monitoring Backend

FastAPI-based backend for the Sales Monitoring System. It handles user authentication (mock), store registrations, sales visit logging, and image uploads.

## Setup

1. **Environment**:
   Ensure you have Python 3.9+ installed.

2. **Installation**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Configuration**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Adjust `PORT` and `HOST` if necessary.

4. **Running**:
   ```bash
   python main.py
   ```
   The server runs by default on `http://localhost:9000`.

## API Endpoints

- `POST /login`: Dummy login (NIK/Password).
- `GET /stores`: List all stores.
- `POST /stores`: Register a new store (with photo upload).
- `GET /visits`: List all sales visits.
- `POST /visits`: Create a new visit (with attachment).
- `POST /visits/{id}/validate`: Admin validation of a visit.

## Data Storage

This backend uses **in-memory mock data** for demonstration purposes. 
- Photos are saved to the `uploads/` directory.
- `uploads/` is ignored by `.gitignore`.

## Deployment

For production deployment using `systemd`, refer to the root [DEPLOYMENT.md](../DEPLOYMENT.md).

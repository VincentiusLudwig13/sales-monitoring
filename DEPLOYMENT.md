# Deployment Guide (systemd)

This guide explains how to deploy the Sales Monitoring components on a Linux server using `systemd` for process management and `nginx` for serving the frontend.

## 1. Backend Deployment (FastAPI)

### Prerequisites
- Python 3.9+ installed.
- A virtual environment is highly recommended.

### Service Configuration
Create a service file at `/etc/systemd/system/sales-backend.service`:

```ini
[Unit]
Description=Sales Monitoring Backend
After=network.target

[Service]
User=your-user
Group=your-group
WorkingDirectory=/path/to/sales-monitoring/backend
Environment="PATH=/path/to/sales-monitoring/backend/venv/bin"
ExecStart=/path/to/sales-monitoring/backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 9000

Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### Management Commands
```bash
sudo systemctl daemon-reload
sudo systemctl enable sales-backend
sudo systemctl start sales-backend
sudo systemctl status sales-backend
```

---

## 2. Admin Frontend Deployment (React/Vite)

### Option A: Nginx (Recommended)
Build the project and serve it with Nginx.

1. **Build the app**:
   ```bash
   cd AdminWeb
   npm install
   npm run build
   ```
2. **Configure Nginx**:
   Create a config file at `/etc/nginx/sites-available/sales-admin`:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           root /path/to/sales-monitoring/AdminWeb/dist;
           index index.html;
           try_files $uri $uri/ /index.html;
       }

       location /api/ {
           proxy_pass http://localhost:9000/;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }

       location /uploads/ {
           proxy_pass http://localhost:9000/uploads/;
       }
   }
   ```
3. **Enable and Restart**:
   ```bash
   sudo ln -s /etc/nginx/sites-available/sales-admin /etc/nginx/sites-enabled/
   sudo systemctl restart nginx
   ```

### Option B: systemd with Node (Alternative)
If you want to run the frontend as a service using a simple Node server (e.g., `serve`):

1. **Install serve**: `npm install -g serve`
2. **Create service file** at `/etc/systemd/system/sales-frontend.service`:

```ini
[Unit]
Description=Sales Monitoring Frontend
After=network.target

[Service]
User=your-user
Group=your-group
WorkingDirectory=/path/to/sales-monitoring/AdminWeb
ExecStart=/usr/bin/serve -s dist -l 3000

Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

---

## 3. Logs and Monitoring

To view logs for either service:

```bash
# Backend logs
sudo journalctl -u sales-backend -f

# Frontend logs (if using systemd option)
sudo journalctl -u sales-frontend -f

# Nginx logs
sudo tail -f /var/log/nginx/error.log
```

## 4. Restarting Services

```bash
sudo systemctl restart sales-backend
sudo systemctl restart sales-frontend # if using systemd option
```

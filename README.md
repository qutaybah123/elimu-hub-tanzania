# 📚 Elimu Hub Tanzania

An online learning platform for Tanzanian students and teachers. Built with React, Node.js/Express, and PostgreSQL.

## Features
- 🎓 Student & Teacher dashboards
- 📖 Subject resource library (notes, PDFs, videos)
- 📝 NECTA past papers (PSLE, CSEE, ACSEE)
- 🧠 Interactive quizzes with instant scoring
- 📊 Progress tracking & leaderboards
- 🔐 JWT authentication with role-based access

---

## 🚀 Quick Deploy (Docker)

### 1. Prerequisites
- Docker & Docker Compose installed on your server
- Port 80 open on your firewall

### 2. Set up environment variables

```bash
cp .env.example .env
nano .env
```

At minimum, set these in `.env`:
```
JWT_SECRET=your_long_random_secret_here
DB_PASSWORD=a_strong_database_password
FRONTEND_URL=http://your-server-ip-or-domain
REACT_APP_API_URL=http://your-server-ip-or-domain/api
```

### 3. Build and start

```bash
docker compose up -d --build
```

That's it! The app will be available at `http://your-server-ip`.

- **Frontend**: `http://your-server-ip`
- **API**: `http://your-server-ip/api`
- **API Docs (Swagger)**: `http://your-server-ip:5000/api-docs` *(expose port 5000 temporarily if needed)*

### 4. Check logs

```bash
docker compose logs -f
docker compose ps
```

### 5. Stop

```bash
docker compose down
```

---

## 🏗️ Project Structure

```
elimu-hub-tanzania/
├── backend/              Node.js/Express API
│   ├── config/           Database connection
│   ├── middleware/        Auth & error handlers
│   └── routes/           API route handlers
├── frontend/             React app (MUI)
│   └── src/
│       ├── contexts/     Auth & loading contexts
│       ├── pages/        All page components
│       ├── components/   Shared components
│       └── services/     Axios API client
├── database/
│   ├── schema.sql        PostgreSQL schema + seed data
│   └── migrate.js        Migration helper script
├── nginx/
│   └── nginx.conf        Reverse proxy config
├── docker-compose.yaml
└── .env.example
```

---

## 🔧 Local Development (without Docker)

### Backend
```bash
cd backend
cp ../.env.example .env   # fill in values
npm install
npm run dev               # starts on port 5000
```

### Frontend
```bash
cd frontend
npm install --legacy-peer-deps
REACT_APP_API_URL=http://localhost:5000/api npm start
```

---

## 🌍 Production Tips

- **HTTPS**: Put a reverse proxy like Caddy or Certbot in front of Nginx for free SSL.
- **Domain**: Point your domain DNS A record to your server IP, update `FRONTEND_URL` and `REACT_APP_API_URL` in `.env`, then rebuild.
- **Backups**: The Postgres data is in a Docker volume `elimu_hub_postgres_data`. Back it up with `docker exec elimu_hub_db pg_dump -U elimu_user elimu_hub > backup.sql`.

---

## 👤 Default Roles
| Role    | Can do                                              |
|---------|-----------------------------------------------------|
| student | Take quizzes, download resources & papers, track progress |
| teacher | Everything above + create quizzes, upload resources |
| admin   | Everything + manage users, approve resources        |

Register normally — first users will be students/teachers based on what they choose at signup.

---

## 🔐 Default Admin Account

After first deploy, log in with:
- **Email:** `admin@elimuhub.tz`
- **Password:** `admin123`
- **⚠️ Change this password immediately after first login!**

The Admin Panel is accessible at `/admin` or via the sidebar after logging in as admin.

### Admin Capabilities
- **Users** — View all users, change roles (student/teacher/admin)
- **Subjects** — Add, edit subjects dynamically (no code changes needed!)
- **Resources** — Approve/reject uploaded resources, delete content

### Adding Admin to Existing Deploy
If already deployed, run this SQL to create the admin account:
```bash
docker exec -i elimu_hub_db psql -U elimu_user -d elimu_hub < database/add_admin.sql
```

# DigiSakhi Backend

Node.js + Express + MongoDB backend for the DigiSakhi website.

## Features
- POST /api/reports — save scam reports
- POST /api/stories — save story submissions  
- POST /api/reviews — save review submissions
- GET  /api/stories — return approved stories
- GET  /api/reviews — return approved reviews
- GET  /api/alerts  — return active scam alerts
- Admin dashboard at /admin — approve/reject/delete content

## Local Setup

### 1. Install dependencies
```
cd backend
npm install
```

### 2. Set up environment
```
cp .env.example .env
```
Edit `.env` and fill in:
- `MONGODB_URI` — your MongoDB Atlas connection string
- `ADMIN_USERNAME` — admin login username
- `ADMIN_PASSWORD` — admin login password
- `JWT_SECRET` — any long random string (min 32 chars)
- `FRONTEND_URL` — your Netlify URL

### 3. Set up MongoDB Atlas (free)
1. Go to mongodb.com/atlas → Create free account
2. Create a free M0 cluster
3. Database Access → Add user with password
4. Network Access → Add IP: 0.0.0.0/0 (allow all)
5. Connect → Drivers → copy the connection string
6. Paste into MONGODB_URI in .env

### 4. Run locally
```
npm run dev
```
Server runs at http://localhost:3000
Admin panel at http://localhost:3000/admin

## Deploy to Render (free)

1. Push backend folder to GitHub
2. Go to render.com → New Web Service
3. Connect your GitHub repo
4. Settings:
   - Root directory: `backend`
   - Build command: `npm install`
   - Start command: `npm start`
5. Add environment variables (same as .env)
6. Deploy

Your backend URL will be: https://your-app-name.onrender.com

### After deploying:
Update `API_BASE` in `website/js/main.js`:
```js
const API_BASE = 'https://your-app-name.onrender.com/api';
```

## API Reference

### Public endpoints (no auth)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/stories | Get approved stories |
| GET | /api/reviews | Get approved reviews |
| GET | /api/alerts | Get active scam alerts |
| POST | /api/stories | Submit a story |
| POST | /api/reviews | Submit a review |
| POST | /api/reports | Submit a scam report |

### Admin endpoints (JWT required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/admin/login | Get JWT token |
| GET | /api/admin/dashboard | Stats summary |
| GET | /api/admin/reports | All reports |
| GET | /api/admin/stories | All stories |
| GET | /api/admin/reviews | All reviews |
| GET | /api/admin/alerts | All alerts |
| PATCH | /api/admin/:model/:id/status | Approve/reject |
| DELETE | /api/admin/:model/:id | Delete |
| POST | /api/admin/alerts | Create alert |
| PATCH | /api/admin/alerts/:id | Update alert |

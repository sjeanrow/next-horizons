# Next Horizons Starter

This is a starter codebase for **Next Horizons** with:

- Express backend
- Supabase connection
- JWT auth starter
- static frontend
- candidate and employer dashboards
- simple matching starter

## Quick start

### 1. Create a GitHub repo
Upload this folder to GitHub.

### 2. Backend setup
In Render, create a **Web Service** from the `backend` folder.

Environment variables:
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `JWT_SECRET`
- `PORT`

Build command:
```bash
npm install
```

Start command:
```bash
npm start
```

### 3. Frontend setup
In Vercel, deploy the `frontend` folder.

Environment variable:
- `API_URL` = your Render backend URL, for example:
```bash
https://next-horizons-backend.onrender.com
```

## Notes
- This is a clean starter, not a finished production app.
- Payments, cron jobs, and advanced messaging can be layered in after this is online.

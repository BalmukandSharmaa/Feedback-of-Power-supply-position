# Feedback of Power supply position

Full-stack Laravel, React, and MySQL application for monitoring area-wise power supply status and handling electricity consumer complaints.

## Stack

- Backend: Laravel 9 REST API with JWT auth
- Frontend: React with Vite
- Database: MySQL

## Local Setup

1. Create a MySQL database named `feedback_power_supply`.
2. Update `backend/.env` with your MySQL credentials:

```env
DB_DATABASE=feedback_power_supply
DB_USERNAME=root
DB_PASSWORD=your_mysql_password
```

3. Run migrations and seed demo data:

```bash
cd backend
php artisan migrate --seed
```

4. Start the API:

```bash
php artisan serve --host=127.0.0.1 --port=8000
```

5. Start the React app:

```bash
cd ../frontend
npm run dev -- --host 127.0.0.1 --port 5173
```

Frontend URL: `http://127.0.0.1:5173`

API URL: `http://127.0.0.1:8000/api`

## Demo Accounts

After seeding:

- Admin: `admin@power.test` / `password123`
- User: `user@power.test` / `password123`

## Main API Areas

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/locations`
- `GET /api/power-statuses`
- `GET|POST /api/complaints`
- `PUT /api/complaints/{complaint}`
- `POST /api/complaints/{complaint}/rate`
- `GET /api/admin/analytics`
- `GET|POST /api/admin/users`
- `GET|POST /api/admin/notifications`
- `GET /api/admin/reports`

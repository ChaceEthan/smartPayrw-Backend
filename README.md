# SmartPay RW Backend

Node.js/Express API for SmartPay RW payroll, RSSB, authentication, and AI assistant workflows.

## Scripts

```bash
npm install
npm run dev
npm start
```

## Environment

Copy `.env.example` to `.env` locally and configure:

```bash
PORT=5000
MONGO_URI=your_mongodb_uri
JWT_SECRET=your_long_random_secret
OPENROUTER_API_KEY=your_openrouter_key
CORS_ORIGIN=https://your-frontend-domain.com
```

Optional values include `JWT_EXPIRES_IN`, `OPENROUTER_MODEL`, `OPENROUTER_TIMEOUT_MS`, `MONGO_TIMEOUT_MS`, `APP_URL`, and `APP_NAME`.

## Core Endpoints

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/ai/chat`
- `GET|POST /api/companies`
- `GET|POST /api/employees`
- `POST /api/payroll/calculate`
- `GET /api/payroll/history`
- `GET /api/reports/tax`

Protected endpoints require `Authorization: Bearer <token>`.

## Render

Use `npm start` as the start command. Set all required environment variables in Render, including `PORT`, `MONGO_URI`, `JWT_SECRET`, `OPENROUTER_API_KEY`, and `CORS_ORIGIN`.

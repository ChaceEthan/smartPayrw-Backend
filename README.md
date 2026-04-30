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
MTN_API_KEY=your_mtn_key
AIRTEL_API_KEY=your_airtel_key
CORS_ORIGIN=https://your-frontend-domain.com
```

Optional values include `JWT_EXPIRES_IN`, `OPENROUTER_MODEL`, `OPENROUTER_TIMEOUT_MS`, `MONGO_TIMEOUT_MS`, `APP_URL`, and `APP_NAME`. Payment APIs run in safe simulated mode when `MTN_API_KEY` or `AIRTEL_API_KEY` is not configured.

## Core Endpoints

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/ai/chat`
- `GET /api/admin/overview`
- `GET /api/analytics/dashboard`
- `POST /api/business/transactions`
- `GET /api/business/transactions`
- `GET /api/compliance`
- `POST /api/company/register`
- `GET|POST /api/companies`
- `GET|POST /api/employees`
- `GET /api/payments`
- `POST /api/payments/mtn/request`
- `POST /api/payments/airtel/request`
- `POST /api/payments/callback`
- `POST /api/payments/webhook`
- `GET /api/pension`
- `POST /api/payroll/calculate`
- `GET /api/payroll/history`
- `GET /api/reports/tax`
- `GET /api/tax/dashboard/:tin`
- `GET /api/tax/payment-guide`

Protected endpoints require `Authorization: Bearer <token>`. `GET /api/admin/overview` requires an `admin` user role. Tax payment guide responses are instructional only and do not process real tax payments. Mobile list endpoints accept `page` and `limit` query parameters where supported.

## Render

Use `npm start` as the start command. Set all required environment variables in Render, including `PORT`, `MONGO_URI`, `JWT_SECRET`, `OPENROUTER_API_KEY`, and `CORS_ORIGIN`.

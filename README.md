# Workineh Chalachew Portfolio

The repository is organized as two npm workspaces:

- `frontend/` contains the React/Vite portfolio and admin interface.
- `backend/` contains the Express API, MySQL schema, and server-side admin authentication.

The backend follows a layered source layout:

```text
backend/
  schema.sql
  src/
    app.js
    server.js
    config/       # Environment and MySQL pool configuration
    middleware/   # Error and not-found handlers
    routes/       # HTTP API routes
    services/     # MySQL access, chat logic, and admin sessions
  test/
```

Firebase has been removed. Chat messages and visitor profiles are stored in MySQL, and live chat updates are delivered through server-sent events.

## Requirements

- Node.js 20.19+ (or 22.12+)
- MySQL 8+

## Configure MySQL and the backend

1. Create a MySQL database and user (or use an existing local database).
2. Copy `backend/.env.example` to `backend/.env` (PowerShell: `Copy-Item backend\.env.example backend\.env`).
3. Set `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_DATABASE`, `MYSQL_USER`, and `MYSQL_PASSWORD` in `backend/.env`. For the first startup only, set `ADMIN_PASSWORD` to a unique password with at least 12 characters; it is stored as a salted hash in MySQL. Remove `ADMIN_PASSWORD` from the environment after the account has been initialized. The admin can change the password later in the dashboard. Keep `.env` private; it is ignored by Git.
4. Apply the schema with your MySQL client:

   ```powershell
   Get-Content backend\schema.sql | mysql -u YOUR_USER -p YOUR_DATABASE
   ```

The API also checks the schema at startup and creates missing tables if the configured MySQL user has the required `CREATE` privileges. Set `APP_ORIGIN` to the public website origin in production. The default is `http://localhost:5173`.

## Contact form email notifications

Contact submissions are stored in the MySQL `contact_submissions` table and are visible in the authenticated admin dashboard under **Website inquiries**. Email notifications are sent from the backend using SMTP; the default destination is `1.workinehwor@gmail.com` and can be changed with `CONTACT_EMAIL_TO`.

To enable email, configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, and optionally `CONTACT_EMAIL_FROM` in the private `backend/.env`. For Gmail, use `smtp.gmail.com`, port `587`, and a Google app password (not your account password). Do not commit or share SMTP credentials. If SMTP is not configured or delivery fails, the inquiry is still saved in MySQL and its email delivery status is shown in the admin dashboard.

## Install and run locally

From the repository root:

```sh
npm install
npm run dev:backend
```

In a second terminal:

```sh
npm run dev:frontend
```

The Vite development server proxies `/api` requests to Express at `http://localhost:4000`. The portfolio is available at `http://localhost:5173`, and the admin console at `/admin-portal`.

## Build and production

```sh
npm run build
npm run lint
npm test
npm start
```

Express serves the built frontend from `frontend/dist` and the API from the same origin. Configure the production environment variables and provide a MySQL database before starting the server.

## Chat and admin security

- Visitor chat is public; administrators authenticate using the backend-only `ADMIN_PASSWORD`.
- The initial admin password is bootstrap-only. MySQL stores a salted password hash, never the plaintext password.
- Admins can update their password from the dashboard. The current session remains active; other admin sessions are revoked.
- Admin sessions use random, HttpOnly, SameSite cookies and are stored as hashes in MySQL.
- Set `NODE_ENV=production` behind HTTPS so admin cookies are marked Secure.
- The application does not migrate Firebase data; chat history starts empty as requested.

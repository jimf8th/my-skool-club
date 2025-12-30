# MySkoolClub – Local Development Guide

What this is: a high-school club management platform that helps staff and students run clubs, memberships, checkouts, invoices, and announcements in one place. It is built for school admins, club advisors, and student leaders who need a simple, self-hostable tool.

Project creator: Jim Edward (jimf8th@gmail.com). Always looking for active contributors—reach out if you want to help.

This project is split into a Spring Boot backend (`backend/`) and a React + Vite frontend (`frontend/`). Use this guide to run everything locally for day-to-day development.

## Prerequisites
- Java 17 (set `JAVA_HOME` accordingly)
- Maven 3.8+
- Node.js 20+ and npm (or pnpm/yarn if you prefer)
- cURL (for quick health checks)
- MongoDB access: configure connection in `.env` file (see setup below)

## Quick Start (happy path)

### First-time setup
1) Copy environment template: `cp .env.example .env`
2) Edit `.env` and fill in your MongoDB credentials and JWT secret
3) Backend: `cd backend && mvn spring-boot:run`
4) Frontend: `cd frontend && npm install && npm run dev`
5) Open http://localhost:5173 and sign in with a demo user (see below).

## Backend (Spring Boot)
- Default profile: `dev` (set in `application.properties`).
- Port: 8080.
- MongoDB: uses environment variables `MONGODB_URI` and `MONGODB_DATABASE` from your `.env` file. No credentials are stored in source code.
- JWT: configure via `JWT_SECRET` environment variable (required for security).

Common commands
```bash
cd backend
mvn spring-boot:run                 # start with dev profile
mvn spring-boot:run -Dspring-boot.run.profiles=dev
mvn test
mvn clean package
```

Health checks
```bash
curl http://localhost:8080/api/health
curl http://localhost:8080/api/public/info
```

Authentication quick test
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```
Use the returned token for protected endpoints, e.g.:
```bash
curl http://localhost:8080/api/health/db \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Frontend (React + Vite)
- Dev server: http://localhost:5173 (proxy-free; the client calls the backend at http://localhost:8080 in dev).
- API base URL: configured in `src/services/apiService.js` (`http://localhost:8080` for dev; same-origin in production).

Common commands
```bash
cd frontend
npm install
npm run dev        # start Vite
npm run build      # production bundle
npm run preview    # serve the built bundle locally
npm run test:integration  # pings backend health/public endpoints
```

## Demo users
Use these to log in quickly:
- admin / admin123
- student / student123
- teacher / teacher123

## Typical workflow
1) Start backend: `cd backend && mvn spring-boot:run`
2) Start frontend: `cd frontend && npm run dev`
3) Visit http://localhost:5173, log in with a demo account, and exercise UI flows.
4) Run integration sanity check from frontend: `npm run test:integration` (backend must be up).

## Troubleshooting
- Port in use: stop anything on 8080 (backend) or 5173 (frontend), or override via `server.port` (backend) and `--port` flag for Vite.
- Mongo connectivity issues: ensure your `.env` file has correct `MONGODB_URI` and the MongoDB cluster allows connections from your IP.
- CORS errors: dev CORS is pre-configured for http://localhost:5173 in `application-dev.properties`.
- JWT errors (401): ensure `JWT_SECRET` is set in `.env` file; tokens expire after 24h.
- Missing `.env`: copy `.env.example` to `.env` and fill in your credentials.

## Security Notes
- **Never commit `.env` files** - they contain secrets
- All credentials should be in environment variables or `.env` files (already in [.gitignore](.gitignore))
- Use [.env.example](.env.example) as a template for setting up your local environment
- Generate a new secure `JWT_SECRET` for production (minimum 256 bits)

## Project layout
- backend/: Spring Boot service and Maven build
- frontend/: React + Vite app
- scripts/: helper scripts for seeding demo data (optional)

## License
Distributed under the MIT License. See [LICENSE](LICENSE) for full terms. Contributions are welcome; by submitting a pull request you agree to license your contributions under the same terms.

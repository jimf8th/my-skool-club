# My Skool Club v2.0

A comprehensive high school club management platform with mobile-first design, featuring a React Native mobile app and responsive web frontend, backed by a Spring Boot API.

## 🎯 Overview

My Skool Club enables high school students to:
- Connect with their school community
- Create and join student clubs
- Manage memberships with approval workflows
- Receive notifications and announcements
- Participate in club activities and events

## 🏗️ Architecture

### Three-Tier Application

1. **Backend API** (Spring Boot)
   - RESTful API with JWT authentication
   - PostgreSQL database with Flyway migrations
   - Profile-controlled email verification: disabled locally, Google SMTP in production
   - Stateless session management

2. **Mobile App** (React Native/Expo)
   - Native iOS and Android experience
   - Material Design components
   - Tab-based navigation
   - Offline-ready with AsyncStorage

3. **Web Frontend** (React/Vite)
   - Mobile-first responsive design
   - Tailwind CSS for styling
   - Progressive web app capabilities
   - Server-side rendering ready

## 📱 Mobile-First Design

**Both the mobile app and web frontend are designed with mobile-first principles.**

See [MOBILE_FIRST.md](./MOBILE_FIRST.md) for detailed documentation on:
- Mobile app architecture and screens
- Responsive web design patterns
- Touch-friendly UI components
- API integration
- Testing strategies

## 🚀 Quick Start

### Prerequisites

- **Java 21** (backend)
- **Node.js 20+** (frontend and mobile)
- **Docker** (for local PostgreSQL)
- **Maven 3.8+** (included as wrapper)

### 1. Start the Full Stack Locally

```bash
# Clone the repository
git clone <repository-url>
cd my-skool-club

# Create .env file (copy from .env.example)
cp .env.example .env

# Start PostgreSQL, MailHog, the backend API, and the Vite frontend
./scripts/dev.sh

# In another terminal, start mobile app
cd mobile
npm install
npm start
```

### 2. Access the Applications

- **Backend API**: http://localhost:8080/api
- **Web Frontend**: http://localhost:3000
- **Mobile App**: Scan QR code from Expo
- **MailHog inbox**: http://localhost:8025 (when testing email verification)
### 3. Test the Flow

1. Register a new account at http://localhost:3000/register
2. The `dev` profile marks the account verified and signs you in immediately
3. Explore the app using the Docker PostgreSQL database

## 📂 Project Structure

```
my-skool-club/
├── backend/                 # Spring Boot API
│   ├── src/main/
│   │   ├── java/           # Java source code
│   │   │   └── com/myskoolclub/backend/
│   │   │       ├── config/
│   │   │       ├── controller/
│   │   │       ├── dto/
│   │   │       ├── model/
│   │   │       ├── repository/
│   │   │       ├── security/
│   │   │       └── service/
│   │   └── resources/
│   │       ├── application.properties
│   │       └── db/migration/  # Flyway SQL migrations
│   └── pom.xml             # Maven dependencies
│
├── frontend/               # React web app
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── context/       # React context (auth, etc.)
│   │   ├── pages/         # Page components
│   │   ├── services/      # API client
│   │   ├── App.jsx        # Main app with routing
│   │   └── main.jsx       # Entry point
│   ├── package.json
│   └── tailwind.config.js # Tailwind CSS config
│
├── mobile/                # React Native app
│   ├── app/              # Expo Router structure
│   │   ├── (auth)/       # Auth screens (login, register)
│   │   ├── (tabs)/       # Main app tabs
│   │   └── _layout.js    # Root layout
│   ├── context/          # Auth context
│   ├── services/         # API client
│   ├── theme/            # Theme configuration
│   ├── app.json          # Expo config
│   └── package.json
│
├── scripts/              # Deployment and dev scripts
│   ├── dev.sh           # Local dev environment
│   ├── build.sh         # Build production JAR
│   ├── deploy.sh        # Deploy to Cloud Run
│   └── setup-gcp.sh     # GCP infrastructure setup
│
├── docker-compose.yml   # PostgreSQL + MailHog
├── Dockerfile           # Production container
├── cloud-run-service.yaml  # Cloud Run config
└── README.md           # This file
```

## 🔐 Authentication & Membership System

### User Roles Hierarchy

```
APP_ADMIN (Platform Administrator)
    ↓
SCHOOL_ADMIN (School Administrator)
    ↓
SCHOOL_MEMBER (School Member)
    ↓
CLUB_ADMIN (Club Administrator)
    ↓
CLUB_MEMBER (Club Member)
```

### Key Flows

1. **Registration**: Local users are immediately verified; production users enter an emailed six-digit code
2. **School Creation**: APP_ADMIN creates schools → assigns SCHOOL_ADMIN
3. **School Membership**: Users request → SCHOOL_ADMIN approves → becomes SCHOOL_MEMBER
4. **Club Creation**: SCHOOL_ADMIN creates clubs → assigns first CLUB_ADMIN
5. **Club Membership**: SCHOOL_MEMBERS request → CLUB_ADMIN approves → becomes CLUB_MEMBER

### Promoting an App Administrator

Use the guarded interactive script after the user has registered, verified their
email, and remains enabled:

```bash
./scripts/set-app-admin.sh local
./scripts/set-app-admin.sh gcp
```

Local mode updates the Docker Compose PostgreSQL service. GCP mode asks for the
account, project, region, Cloud SQL database, service account, VPC, subnet, and
Secret Manager resource names before displaying a production confirmation. It
runs `psql` in a temporary Cloud Run Job attached to private Cloud SQL and deletes
the job afterward. Database passwords remain in Secret Manager and are never
written to the repository or local files.

### Mobile App Store Screenshot Data

Create or refresh a screenshot-ready school in the local Docker database:

```bash
./scripts/seed-mobile-demo.sh
```

The script prompts without echo for one shared local demo password and creates
**Cypress Ridge Academy** with 10 verified accounts covering application admin,
school admin, club admin, approved member, pending/rejected membership, and
account-deletion experiences. It also adds
two clubs, announcements, dynamically dated future events and RSVPs, invoices in
every lifecycle status, inventory and checkout history, notifications, and a
small content-moderation queue. The demo school is explicitly Premium so App
Review can exercise AI receipt scanning; every other newly created school
defaults to Standard.

Demo account emails:

| Email | Screenshot role |
| --- | --- |
| `app.admin@cypressridge.test` | Application administrator |
| `school.admin@cypressridge.test` | School administrator |
| `robotics.admin@cypressridge.test` | Robotics club administrator |
| `arts.admin@cypressridge.test` | Creative Arts club administrator |
| `member@cypressridge.test` | School and club member |
| `pending@cypressridge.test` | Pending school membership |
| `club.pending@cypressridge.test` | Pending club membership |
| `school.rejected@cypressridge.test` | Rejected school membership |
| `club.rejected@cypressridge.test` | Rejected club membership |
| `deletion@cypressridge.test` | Disposable account-deletion user |

The password is supplied only at runtime and is never stored in the repository.
The script starts the local PostgreSQL container if needed, refuses any database
name other than `myskoolclub_dev`, and never invokes Google Cloud or a deployed
API. If this is a brand-new database, start `./scripts/dev.sh --api-only` once to
apply the Flyway schema before seeding.

### Approval Workflow

- All membership requests start with `PENDING` status
- Admins can `APPROVE` or `REJECT` requests
- Approved memberships can be `REVOKED` by admins
- Cascade revocation: Revoking school membership revokes all club memberships

## 🗄️ Database Schema

### Core Tables

- **users**: User accounts with email verification
- **email_verifications**: One-time verification tokens
- **schools**: School entities
- **school_memberships**: User-school relationships with roles
- **clubs**: Club entities (belongs to school)
- **club_memberships**: User-club relationships with roles
- **notifications**: In-app notification system
- **invoices**: Club invoices and approval state
- **invoice_line_items**: Invoice line items
- **invoice_audit_logs**: Invoice workflow history
- **events**: School events
- **event_rsvps**: User responses to events
- **announcements**: School announcements
- **inventory_items**: Club-owned inventory
- **inventory_checkouts**: Inventory checkout history
- **content_reports**: User reports, evidence snapshots, and moderation outcomes
- **password_reset_codes**: Hashed, expiring password-reset codes
- **friend_invitations**: Secure account and school-administrator invitations
- **school_requests**: Public school onboarding requests and review decisions

### Migrations

Database schema managed with Flyway migrations in `backend/src/main/resources/db/migration/`:

- `V1__create_users_table.sql`
- `V2__create_email_verifications_table.sql`
- `V3__create_schools_table.sql`
- `V4__create_school_memberships_table.sql`
- `V5__create_clubs_table.sql`
- `V6__create_club_memberships_table.sql`
- `V7__create_notifications_table.sql`
- `V8__add_enabled_to_schools.sql`
- `V9__create_invoices_tables.sql`
- `V10__create_events_tables.sql`
- `V11__create_announcements_table.sql`
- `V12__create_inventory_tables.sql`
- `V13__create_deleted_user_identity.sql`
- `V14__secure_email_verification_codes.sql`
- `V15__add_content_safety.sql`
- `V16__create_password_reset_codes.sql`
- `V17__record_registration_consent.sql`
- `V18__create_friend_invitations_table.sql`
- `V19__add_school_tier.sql`
- `V20__create_school_requests.sql`

`db/schema-manifest.txt` is the deployment-time inventory of all 19 application
tables. A test keeps it synchronized with the JPA entities and Flyway DDL.

## 🛠️ Development Scripts

### Local Development

```bash
# Start full stack (frontend + backend + DB + email)
./scripts/dev.sh

# Start without frontend (backend only)
./scripts/dev.sh --no-frontend

# Features:
# - Kills existing processes on ports 8080, 3000
# - Starts PostgreSQL + MailHog containers
# - Runs Spring Boot and the Vite frontend with hot reload
# - Color-coded logs (ERROR=red, WARN=yellow, INFO=green)
# - Health check polling
# - Cleanup on exit (Ctrl+C)
```

### Production Build

```bash
# Build production JAR (includes frontend)
./scripts/build.sh

# Skip tests
./scripts/build.sh --skip-tests

# Output: backend/target/my-skool-club-backend-2.0.0.jar
```

### Cloud Deployment

```bash
# 1. Configure GCP project (one-time)
vim scripts/config.sh  # Set your GCP_PROJECT_ID, etc.

# 2. Deploy to Cloud Run
# The script detects and creates only missing infrastructure. On the first run,
# it securely prompts only for missing DB, JWT, SMTP, and OpenAI credentials.
MAIL_FROM=support@myskoolclub.com ./scripts/deploy.sh

# Existing GCP installation: add/rotate only the SMTP secrets, without touching
# the database or JWT secret
bash ./scripts/configure-email.sh

# Existing GCP installation: add/rotate only the OpenAI API key
bash ./scripts/configure-openai.sh

# Custom tag
./scripts/deploy.sh --tag v2.0.1

# Skip Docker build (reuse existing image)
./scripts/deploy.sh --skip-build
```

Every deployment enables missing APIs and checks the VPC, private service
connection, Cloud SQL PostgreSQL instance, database/user, Artifact Registry,
service account, IAM roles, and secrets. Only missing resources are provisioned;
existing credentials are not rotated. It then runs Flyway in a one-off Cloud Run Job and verifies
all tables in the schema manifest before releasing the application revision.
The setup script stores the Google SMTP username, app password, and OpenAI API key
in Secret Manager. Cloud Run receives those secrets plus the non-secret SMTP and
OpenAI model settings during deployment.
The default database size is the shared-core `db-f1-micro` tier on the regular
Cloud SQL Enterprise edition. Override `CLOUD_SQL_TIER` before provisioning if a
larger instance is needed later.

Cloud SQL is private-IP only. Provisioning creates a dedicated VPC, a `/26`
Cloud Run subnet, and a `/24` private-services range. Both the migration job and
application service use Direct VPC egress, so no Serverless VPC Access connector
or public database address is required.

The web service disables the Cloud Run Invoker IAM check to allow public website
and API traffic without an `allUsers` IAM binding. This is compatible with Google
Cloud organizations that enforce domain-restricted sharing. Spring Security still
requires application JWT authentication for protected API routes.


## 🌐 API Endpoints

### Authentication

```
POST   /api/auth/register          # Register new user
POST   /api/auth/login             # Login with credentials
POST   /api/auth/verify-email      # Verify email with email + six-digit code
POST   /api/auth/resend-verification # Resend verification email
```

### Schools

```
GET    /api/schools                # List all schools
GET    /api/schools/{id}           # Get school details
POST   /api/schools                # Create school (APP_ADMIN)
POST   /api/schools/{id}/admins    # Assign school admin (APP_ADMIN)
DELETE /api/schools/{id}/admins/{userId}  # Revoke school admin
PATCH  /api/schools/{id}/tier      # Set STANDARD/PREMIUM (APP_ADMIN only)

POST   /api/schools/{id}/memberships/request    # Request membership
GET    /api/schools/{id}/memberships/pending    # List pending requests
GET    /api/schools/{id}/memberships            # List all members
POST   /api/schools/{id}/memberships/{membershipId}/approve
POST   /api/schools/{id}/memberships/{membershipId}/reject
DELETE /api/schools/{id}/memberships/{membershipId}  # Revoke
```

### Clubs

```
GET    /api/schools/{schoolId}/clubs   # List clubs in school
POST   /api/schools/{schoolId}/clubs   # Create club (SCHOOL_ADMIN)
GET    /api/clubs/{clubId}            # Get club details

POST   /api/clubs/{clubId}/memberships/request    # Request membership
GET    /api/clubs/{clubId}/memberships/pending    # List pending
GET    /api/clubs/{clubId}/memberships            # List members
POST   /api/clubs/{clubId}/memberships/{membershipId}/approve
POST   /api/clubs/{clubId}/memberships/{membershipId}/reject
DELETE /api/clubs/{clubId}/memberships/{membershipId}  # Revoke
```

### Notifications

```
GET    /api/notifications           # List user's notifications
GET    /api/notifications/unread-count  # Count unread
POST   /api/notifications/{id}/read    # Mark as read
POST   /api/notifications/read-all     # Mark all as read
```

### Health

```
GET    /api/health                 # Health check (no auth)
```

## 🧪 Testing

### Backend Tests

```bash
cd backend
./mvnw test
```

### Frontend Tests

```bash
cd frontend
npm test
```

### Manual Testing

1. **Email Verification**: Check MailHog at http://localhost:8025
2. **Database**: Connect to PostgreSQL at `localhost:5432/myskoolclub_dev`
   - Username: `postgres`
   - Password: `postgres`
3. **API Testing**: Use Postman, curl, or HTTPie
4. **Mobile Testing**: Use Expo Go app on physical device

## 📦 Deployment

### Target: Google Cloud Run

The application deploys as a **single JAR** to Cloud Run:

1. **Frontend** builds into `backend/src/main/resources/static/`
2. **Backend** serves frontend static files and `/api/*` endpoints
3. **Docker** image contains JRE + JAR
4. **Cloud Run** scales 0→N based on traffic

### Infrastructure

- **Cloud Run**: Serverless container platform
- **Cloud SQL**: Managed PostgreSQL 16
- **Secret Manager**: Stores DB, JWT, SMTP, and OpenAI credentials
- **Artifact Registry**: Docker image storage
- **Service Account**: Minimal permissions for Cloud Run

### Cost Optimization

- **Min instances**: 0 (scales to zero when idle)
- **Max instances**: 10 (adjust based on load)
- **Memory**: 512Mi (adjust if needed)
- **CPU**: Always allocated (change to "CPU is only allocated during request processing" for cost savings)

## 🔒 Security

- **JWT Authentication**: Stateless tokens with configurable expiration
- **Password Hashing**: BCrypt with salt
- **CORS**: Configurable allowed origins
- **SQL Injection**: Prevented via JPA and parameterized queries
- **XSS**: React auto-escapes user input
- **CSRF**: Disabled for stateless API (JWT in Authorization header)
- **Secrets**: Stored in Secret Manager (GCP) or environment variables

## 🐛 Troubleshooting

### Port Already in Use

The dev script automatically kills processes on ports 8080 and 3000. If it fails:

```bash
# Manually kill process
lsof -ti tcp:8080 | xargs kill -9
lsof -ti tcp:3000 | xargs kill -9
```

### Database Connection Failed

```bash
# Check Docker containers
docker ps

# Restart containers
docker-compose down
docker-compose up -d

# Check logs
docker-compose logs postgres
```

### Lombok Not Working

Ensure `maven-compiler-plugin` has `annotationProcessorPaths` in `backend/pom.xml`.

### Frontend Build Fails

```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Mobile App Won't Connect

- For dev, run `./scripts/mobile-dev.sh` to start Docker, Spring Boot, and Expo together
- For a local app using deployed APIs, run `./scripts/mobile-test.sh`
- Add `--dev-client --clear` to either command when using an installed native variant
- Dev physical devices derive the Metro host automatically; ensure port 8080 is reachable through the firewall
- Check firewall settings
- See [mobile/ENVIRONMENTS.md](./mobile/ENVIRONMENTS.md) for app identifiers and EAS build commands

## 📚 Additional Documentation

- [MOBILE_FIRST.md](./MOBILE_FIRST.md) - Mobile-first design documentation
- [docs/API.md](./docs/API.md) - API documentation (if exists)
- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) - Architecture deep dive (if exists)
- [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) - Deployment guide (if exists)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

See [LICENSE](./LICENSE) for details.

## 👥 Authors

- **My Skool Club Team**

## 🙏 Acknowledgments

- Spring Boot community
- React Native and Expo teams
- Tailwind CSS
- All open-source contributors

---

**Version**: 2.0.0
**Last Updated**: July 2026

# MySkoolClub Architecture

## Overview

MySkoolClub is a full-stack web application built with a Java Spring Boot backend and React frontend. The system follows a modern three-tier architecture with clear separation of concerns.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend (React)                     │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Components (UI)                                  │  │
│  │  - Home, Clubs, Members, Invoices, etc.         │  │
│  └────────────────┬─────────────────────────────────┘  │
│                   │                                      │
│  ┌────────────────▼─────────────────────────────────┐  │
│  │  Services (API Client)                           │  │
│  │  - apiService.js (Axios)                        │  │
│  └────────────────┬─────────────────────────────────┘  │
└────────────────────┼─────────────────────────────────────┘
                     │ HTTP/REST (JWT)
                     │
┌────────────────────▼─────────────────────────────────────┐
│              Backend (Spring Boot)                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Controllers (REST API)                          │  │
│  │  - Health, Auth, Schools, Clubs, Members, etc.  │  │
│  └────────────────┬─────────────────────────────────┘  │
│                   │                                      │
│  ┌────────────────▼─────────────────────────────────┐  │
│  │  Services (Business Logic)                       │  │
│  │  - Authentication, CRUD operations               │  │
│  └────────────────┬─────────────────────────────────┘  │
│                   │                                      │
│  ┌────────────────▼─────────────────────────────────┐  │
│  │  Repositories (Data Access)                      │  │
│  │  - Spring Data MongoDB                           │  │
│  └────────────────┬─────────────────────────────────┘  │
│                   │                                      │
│  ┌────────────────▼─────────────────────────────────┐  │
│  │  Security & Config                                │  │
│  │  - JWT Filter, CORS, Security Config            │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────┼─────────────────────────────────────┘
                     │
                     │ MongoDB Protocol
                     │
┌────────────────────▼─────────────────────────────────────┐
│              MongoDB Atlas (Database)                     │
│  - Collections: schools, clubs, members, invoices, etc.  │
└───────────────────────────────────────────────────────────┘
```

## Technology Stack

### Frontend
- **React 19** - UI framework
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **Bootstrap 5 (Bootswatch)** - Styling
- **Font Awesome** - Icons

### Backend
- **Java 17** - Programming language
- **Spring Boot 3.2** - Application framework
- **Spring Security** - Authentication & authorization
- **Spring Data MongoDB** - Database access
- **JWT (jjwt)** - Token-based authentication
- **Maven** - Build tool

### Database
- **MongoDB Atlas** - Cloud-hosted NoSQL database

### DevOps
- **Docker** - Containerization
- **GitHub Actions** - CI/CD
- **Google Cloud Run** - Deployment (production)

## Key Components

### Frontend Structure

```
frontend/src/
├── components/        # React components
│   ├── Home.jsx
│   ├── ClubsManagement.jsx
│   ├── MemberLogin.jsx
│   └── ...
├── services/         # API client
│   └── apiService.js
├── assets/           # Static assets
├── App.jsx           # Root component
└── main.jsx         # Entry point
```

### Backend Structure

```
backend/src/main/java/com/myskoolclub/backend/
├── config/           # Configuration classes
│   ├── CorsConfig.java
│   ├── SecurityConfig.java
│   └── JwtConfig.java
├── controller/       # REST controllers
│   ├── HealthController.java
│   ├── AuthController.java
│   └── ...
├── model/           # Entity models
│   ├── School.java
│   ├── Club.java
│   ├── Member.java
│   └── ...
├── repository/      # Data repositories
│   ├── SchoolRepository.java
│   └── ...
├── service/         # Business logic
│   ├── AuthService.java
│   └── ...
└── security/        # Security components
    ├── JwtFilter.java
    └── JwtUtil.java
```

## Data Model

### Core Entities

1. **School**
   - id, name, address, phone, createdAt

2. **Club**
   - id, name, description, schoolId, advisorId, members[]

3. **Member**
   - id, firstName, lastName, email, schoolId, gradeLevel, clubs[]

4. **Invoice**
   - id, memberId, clubId, amount, description, dueDate, paid

5. **Checkout**
   - id, memberId, itemName, checkoutDate, returnDate, returned

6. **Announcement**
   - id, clubId, title, content, priority, createdAt

## Security Architecture

### Authentication Flow

1. User submits credentials to `/api/auth/login`
2. Backend validates credentials
3. JWT token generated with user claims
4. Token returned to client
5. Client stores token in localStorage
6. Client includes token in Authorization header for protected requests
7. Backend validates token on each request via JWT filter

### JWT Structure

```json
{
  "sub": "username",
  "iat": 1234567890,
  "exp": 1234654290,
  "roles": ["ADMIN"]
}
```

### Security Configuration

- Public endpoints: `/api/health`, `/api/auth/**`, `/api/public/**`
- Protected endpoints: All other `/api/**` routes
- CORS: Configured for localhost:5173 (dev) and production domain
- Password hashing: BCrypt

## API Design

### REST Principles
- Resource-based URLs (`/api/clubs`, `/api/members`)
- HTTP methods: GET, POST, PUT, DELETE
- JSON request/response format
- Consistent error responses
- JWT authentication via Bearer token

### Response Format

Success:
```json
{
  "data": { ... },
  "timestamp": "2025-12-30T10:00:00Z"
}
```

Error:
```json
{
  "error": "Error type",
  "message": "Detailed message",
  "timestamp": "2025-12-30T10:00:00Z"
}
```

## Deployment

### Development
- Frontend: Vite dev server (port 5173)
- Backend: Spring Boot embedded Tomcat (port 8080)
- Database: MongoDB Atlas (cloud)

### Production
- Frontend: Static files served from Cloud Run
- Backend: Spring Boot on Cloud Run
- Database: MongoDB Atlas (cloud)
- HTTPS: Automatic via Cloud Run

## Future Enhancements

1. **Real-time Features**
   - WebSocket support for live updates
   - Push notifications

2. **File Storage**
   - Profile pictures
   - Document uploads (Google Cloud Storage)

3. **Analytics**
   - Dashboard with charts
   - Reports generation

4. **Payment Integration**
   - Stripe for invoice payments
   - Payment history tracking

5. **Mobile App**
   - React Native mobile client
   - Push notifications

6. **Testing**
   - Increased unit test coverage
   - E2E tests with Cypress/Playwright
   - Load testing

# MySkoolClub Backend

Spring Boot backend application for the MySkoolClub High School Club Management System.

## Technology Stack

- **Java 17**
- **Spring Boot 3.2.0**
- **Spring Data MongoDB**
- **Spring Security**
- **Maven**
- **MongoDB Atlas**

## Profiles

### Development Profile (`dev`)
- **Database**: MongoDB Atlas Cloud
- **Port**: 8080
- **CORS**: Enabled for `http://localhost:5173` (React frontend)
- **Security**: Basic configuration with public endpoints
- **Logging**: DEBUG level for development

## API Endpoints

### Public Endpoints (No Authentication Required)
- `GET /api/health` - Application health check
- `GET /api/public/info` - API information
- `POST /api/auth/login` - Authenticate and get JWT token
- `POST /api/auth/validate` - Validate JWT token
- `POST /api/auth/refresh` - Refresh JWT token
- `GET /api/auth/info` - Authentication server information

### Protected Endpoints (JWT Authentication Required)
- `GET /api/health/db` - Database connectivity check (requires JWT)
- `GET /api/protected/test` - Test protected endpoint
- `GET /api/protected/user-info` - Get authenticated user information
- `GET /api/protected/db-status` - Protected database status endpoint (for JWT testing)

## Running the Application

### Prerequisites
- Java 17 or higher
- Maven 3.6+
- MongoDB Atlas connection (configured in `application-dev.properties`)

### Development Mode
```bash
# Install dependencies and run
mvn spring-boot:run

# Or with explicit profile
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

### Build
```bash
mvn clean package
```

### Test
```bash
mvn test
```

## Configuration

### MongoDB Connection
The application connects to MongoDB Atlas using the connection string configured in `application-dev.properties`.

### CORS Configuration
CORS is configured to allow requests from the React frontend running on `http://localhost:5173`.

## Project Structure

```
src/
├── main/
│   ├── java/com/myskoolclub/backend/
│   │   ├── config/          # Configuration classes
│   │   ├── controller/      # REST controllers
│   │   ├── model/          # MongoDB entities
│   │   ├── repository/     # Data repositories
│   │   └── MySkoolClubBackendApplication.java
│   └── resources/
│       ├── application.properties
│       └── application-dev.properties
└── test/
    ├── java/               # Test classes
    └── resources/          # Test configuration
```

## Default Port
The application runs on port **8080** by default.

Access the health check at: `http://localhost:8080/api/health`

## Authentication

### JWT-Based Security
The application uses JSON Web Tokens (JWT) for authentication with:
- **Dynamic key generation** - No static secrets in configuration
- **Stateless authentication** - No server-side sessions
- **Token expiration** - 24-hour token validity
- **Secure endpoints** - Database health check requires authentication

### Demo Users
For testing purposes, the following demo users are available:
- **admin** / admin123
- **student** / student123  
- **teacher** / teacher123

### Getting a JWT Token
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### Using JWT Token for Protected Endpoints
```bash
# Access protected database health check
curl -X GET http://localhost:8080/api/health/db \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Test protected endpoint
curl -X GET http://localhost:8080/api/protected/test \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Validate Token
```bash
curl -X POST http://localhost:8080/api/auth/validate \
  -H "Content-Type: application/json" \
  -d '{"token":"YOUR_JWT_TOKEN"}'
```
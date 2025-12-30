# MySkoolClub API Documentation

Base URL (development): `http://localhost:8080/api`

## Authentication

All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

### Get JWT Token

**POST** `/auth/login`

Request:
```json
{
  "username": "admin",
  "password": "admin123"
}
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzUxMiJ9...",
  "type": "Bearer",
  "username": "admin",
  "expiresIn": 86400000
}
```

### Validate Token

**POST** `/auth/validate`

Request:
```json
{
  "token": "YOUR_JWT_TOKEN"
}
```

Response:
```json
{
  "valid": true,
  "username": "admin"
}
```

### Refresh Token

**POST** `/auth/refresh`

Request:
```json
{
  "token": "YOUR_CURRENT_TOKEN"
}
```

Response:
```json
{
  "token": "NEW_JWT_TOKEN",
  "type": "Bearer",
  "expiresIn": 86400000
}
```

## Public Endpoints

### Health Check

**GET** `/health`

Response:
```json
{
  "status": "UP",
  "timestamp": "2025-12-30T10:00:00Z"
}
```

### API Info

**GET** `/public/info`

Response:
```json
{
  "name": "MySkoolClub API",
  "version": "0.1.0",
  "description": "High School Club Management System"
}
```

## Protected Endpoints

### Database Health Check

**GET** `/health/db`

Requires: JWT Authentication

Response:
```json
{
  "status": "UP",
  "database": "MongoDB",
  "connected": true
}
```

### User Info

**GET** `/protected/user-info`

Requires: JWT Authentication

Response:
```json
{
  "username": "admin",
  "roles": ["ADMIN"],
  "email": "admin@myskoolclub.com"
}
```

## Schools

### Get All Schools

**GET** `/schools`

Response:
```json
[
  {
    "id": "school123",
    "name": "Lincoln High School",
    "address": "123 Main St",
    "createdAt": "2025-01-01T00:00:00Z"
  }
]
```

### Get School by ID

**GET** `/schools/{id}`

### Create School

**POST** `/schools`

Request:
```json
{
  "name": "Lincoln High School",
  "address": "123 Main St",
  "phone": "555-1234"
}
```

### Update School

**PUT** `/schools/{id}`

### Delete School

**DELETE** `/schools/{id}`

## Clubs

### Get All Clubs

**GET** `/clubs`

### Get Club by ID

**GET** `/clubs/{id}`

### Create Club

**POST** `/clubs`

Request:
```json
{
  "name": "Basketball Club",
  "description": "School basketball team",
  "schoolId": "school123",
  "advisorId": "user456"
}
```

### Update Club

**PUT** `/clubs/{id}`

### Delete Club

**DELETE** `/clubs/{id}`

## Members

### Get All Members

**GET** `/members`

### Get Member by ID

**GET** `/members/{id}`

### Create Member

**POST** `/members`

Request:
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "schoolId": "school123",
  "gradeLevel": 10
}
```

### Update Member

**PUT** `/members/{id}`

### Delete Member

**DELETE** `/members/{id}`

## Invoices

### Get All Invoices

**GET** `/invoices`

### Get Invoice by ID

**GET** `/invoices/{id}`

### Create Invoice

**POST** `/invoices`

Request:
```json
{
  "memberId": "member123",
  "clubId": "club456",
  "amount": 50.00,
  "description": "Club membership fee",
  "dueDate": "2025-02-01"
}
```

## Checkouts

### Get All Checkouts

**GET** `/checkouts`

### Get Checkout by ID

**GET** `/checkouts/{id}`

### Create Checkout

**POST** `/checkouts`

Request:
```json
{
  "memberId": "member123",
  "itemName": "Basketball Jersey",
  "checkoutDate": "2025-01-15",
  "expectedReturnDate": "2025-06-01"
}
```

## Announcements

### Get All Announcements

**GET** `/announcements`

### Get Announcement by ID

**GET** `/announcements/{id}`

### Create Announcement

**POST** `/announcements`

Request:
```json
{
  "title": "Practice Schedule Update",
  "content": "Practice moved to 4 PM",
  "clubId": "club456",
  "priority": "HIGH"
}
```

## Error Responses

All endpoints may return these error responses:

### 400 Bad Request
```json
{
  "error": "Bad Request",
  "message": "Invalid input data",
  "timestamp": "2025-12-30T10:00:00Z"
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "JWT token is expired or invalid",
  "timestamp": "2025-12-30T10:00:00Z"
}
```

### 404 Not Found
```json
{
  "error": "Not Found",
  "message": "Resource not found",
  "timestamp": "2025-12-30T10:00:00Z"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred",
  "timestamp": "2025-12-30T10:00:00Z"
}
```

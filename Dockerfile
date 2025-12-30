# Multi-stage build for MySkoolClub application
# Stage 1: Build the React frontend
FROM node:20-alpine AS frontend-build

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# Stage 2: Build the Spring Boot backend
FROM maven:3.9-eclipse-temurin-17-alpine AS backend-build

WORKDIR /app/backend
COPY backend/pom.xml ./
RUN mvn dependency:go-offline -B

COPY backend/src ./src
RUN mvn clean package -DskipTests

# Stage 3: Runtime image with both frontend and backend
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# Copy the backend JAR
COPY --from=backend-build /app/backend/target/*.jar app.jar

# Copy the frontend build files to be served by Spring Boot
COPY --from=frontend-build /app/frontend/dist ./static

# Expose port 8080
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/api/health || exit 1

# Run the application
ENTRYPOINT ["java", "-jar", "app.jar"]
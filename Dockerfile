# ---- Build stage ----
FROM maven:3.9.9-eclipse-temurin-21-alpine AS build
WORKDIR /app

# Copy frontend source (frontend-maven-plugin will install Node and build it)
COPY frontend/ frontend/

# Copy backend source
COPY backend/pom.xml backend/pom.xml
COPY backend/src/ backend/src/

WORKDIR /app/backend
RUN mvn package -DskipTests

# ---- Runtime stage ----
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/backend/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]

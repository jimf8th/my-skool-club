# MySkoolClub Deployment Guide

This guide covers deploying MySkoolClub to production environments.

## Prerequisites

- Google Cloud Platform account (for Cloud Run deployment)
- MongoDB Atlas account with production cluster
- Docker installed locally (for building images)
- `gcloud` CLI installed and configured

## Environment Setup

### 1. MongoDB Atlas Production Setup

1. Create a new cluster in MongoDB Atlas
2. Configure network access:
   - Add `0.0.0.0/0` to IP whitelist (or restrict to Cloud Run IPs)
3. Create database user with read/write permissions
4. Get connection string:
   ```
   mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
   ```
5. Create production database: `myskoolclub_prod`

### 2. Set Environment Variables

Create a `.env.prod` file (DO NOT commit to git):

```bash
# Production MongoDB
SPRING_DATA_MONGODB_URI=mongodb+srv://prod-user:PASSWORD@cluster.mongodb.net/myskoolclub_prod?retryWrites=true&w=majority

# Production JWT Secret (generate a secure random string)
JWT_SECRET=your-production-secret-minimum-512-bits-change-this

# Production Profile
SPRING_PROFILES_ACTIVE=prod

# CORS (set to your production domain)
CORS_ALLOWED_ORIGINS=https://yourdomain.com

# Email (optional)
SPRING_MAIL_HOST=smtp.gmail.com
SPRING_MAIL_PORT=587
SPRING_MAIL_USERNAME=your-email@gmail.com
SPRING_MAIL_PASSWORD=your-app-password
```

## Docker Build

### Backend Dockerfile

Create `backend/Dockerfile`:

```dockerfile
FROM eclipse-temurin:17-jdk-alpine as build
WORKDIR /workspace/app

COPY mvnw .
COPY .mvn .mvn
COPY pom.xml .
COPY src src

RUN ./mvnw clean package -DskipTests

FROM eclipse-temurin:17-jre-alpine
VOLUME /tmp
ARG JAR_FILE=/workspace/app/target/*.jar
COPY --from=build ${JAR_FILE} app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app.jar"]
```

### Frontend Dockerfile

Create `frontend/Dockerfile`:

```dockerfile
FROM node:20-alpine as build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### Frontend nginx.conf

Create `frontend/nginx.conf`:

```nginx
server {
    listen 80;
    server_name _;
    
    root /usr/share/nginx/html;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://backend:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Google Cloud Run Deployment

### 1. Build and Push Docker Images

```bash
# Set your project ID
export PROJECT_ID=your-gcp-project-id
export REGION=us-central1

# Configure Docker for GCR
gcloud auth configure-docker

# Build and push backend
cd backend
docker build -t gcr.io/${PROJECT_ID}/myskoolclub-backend:latest .
docker push gcr.io/${PROJECT_ID}/myskoolclub-backend:latest

# Build and push frontend
cd ../frontend
docker build -t gcr.io/${PROJECT_ID}/myskoolclub-frontend:latest .
docker push gcr.io/${PROJECT_ID}/myskoolclub-frontend:latest
```

### 2. Deploy Backend to Cloud Run

```bash
gcloud run deploy myskoolclub-backend \
  --image gcr.io/${PROJECT_ID}/myskoolclub-backend:latest \
  --platform managed \
  --region ${REGION} \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --set-env-vars SPRING_PROFILES_ACTIVE=prod \
  --set-env-vars SPRING_DATA_MONGODB_URI="your-mongodb-uri" \
  --set-env-vars JWT_SECRET="your-jwt-secret"
```

### 3. Deploy Frontend to Cloud Run

```bash
gcloud run deploy myskoolclub-frontend \
  --image gcr.io/${PROJECT_ID}/myskoolclub-frontend:latest \
  --platform managed \
  --region ${REGION} \
  --allow-unauthenticated \
  --port 80 \
  --memory 256Mi \
  --cpu 1 \
  --set-env-vars VITE_API_BASE_URL="https://backend-url-from-step2"
```

### 4. Configure Custom Domain (Optional)

```bash
# Map custom domain
gcloud run domain-mappings create \
  --service myskoolclub-frontend \
  --domain yourdomain.com \
  --region ${REGION}

# Update DNS records as instructed by the output
```

## Alternative: Docker Compose Deployment

For self-hosting on a VPS:

1. Copy `docker-compose.yml` to your server
2. Create `.env` file with production values
3. Run:

```bash
docker-compose up -d
```

## Monitoring and Logging

### Cloud Run Monitoring

```bash
# View logs
gcloud run services logs read myskoolclub-backend --region ${REGION}
gcloud run services logs read myskoolclub-frontend --region ${REGION}

# View metrics in GCP Console
https://console.cloud.google.com/run
```

### Application Health Checks

Monitor these endpoints:
- `https://your-backend-url/api/health`
- `https://your-backend-url/api/health/db`

### Set up Uptime Checks

1. Go to Cloud Console > Monitoring > Uptime checks
2. Create check for `/api/health` endpoint
3. Configure alerting

## Security Considerations

### Production Checklist

- [ ] Change default JWT secret to a strong random value
- [ ] Use production MongoDB cluster with backups enabled
- [ ] Enable MongoDB authentication and use strong passwords
- [ ] Restrict MongoDB network access to specific IPs
- [ ] Enable HTTPS (automatic with Cloud Run)
- [ ] Configure CORS for production domain only
- [ ] Remove or disable demo users in production
- [ ] Set up proper logging and monitoring
- [ ] Enable rate limiting on API endpoints
- [ ] Regular security updates for dependencies
- [ ] Use environment variables for all secrets (never hardcode)
- [ ] Enable Cloud Run authentication for admin endpoints

### Environment Variables Management

Never commit secrets to git. Use:
- Google Cloud Secret Manager
- `.env` files (gitignored)
- Cloud Run environment variables

## Backup and Recovery

### MongoDB Backups

1. Enable automated backups in MongoDB Atlas
2. Configure backup retention policy
3. Test restore procedures regularly

### Application Backups

1. Tag Docker images with versions
2. Keep previous deployments available for rollback
3. Document deployment procedures

## Rollback Procedure

```bash
# List revisions
gcloud run revisions list --service myskoolclub-backend --region ${REGION}

# Rollback to previous revision
gcloud run services update-traffic myskoolclub-backend \
  --to-revisions REVISION_NAME=100 \
  --region ${REGION}
```

## Performance Optimization

### Backend
- Enable caching for frequently accessed data
- Configure connection pooling for MongoDB
- Set appropriate JVM memory settings
- Use Spring Boot Actuator for metrics

### Frontend
- Enable compression in nginx
- Configure browser caching headers
- Use CDN for static assets
- Implement lazy loading for routes

## Cost Optimization

### Cloud Run
- Scale to zero when not in use
- Set max instances to control costs
- Use minimum necessary CPU/memory

### MongoDB Atlas
- Choose appropriate cluster tier
- Enable auto-pause for dev environments
- Monitor and optimize queries

## Troubleshooting

### Common Issues

**502 Bad Gateway**
- Check backend is running: `gcloud run services describe myskoolclub-backend`
- Verify environment variables are set correctly
- Check MongoDB connection string

**Authentication Errors**
- Verify JWT_SECRET is set and matches
- Check token expiration settings
- Ensure CORS is configured correctly

**Database Connection Issues**
- Verify MongoDB Atlas IP whitelist
- Check connection string format
- Ensure database user has correct permissions

## Support

For deployment issues, contact: jimf8th@gmail.com

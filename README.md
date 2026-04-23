# 🎓 Training Management System (TMS)

A **production-ready, three-tier microservices application** built for practicing Kubernetes, CI/CD pipelines, ArgoCD, and Helm charts. The domain is a corporate Learning & Development Training Management System.

---

## 📐 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT BROWSER                           │
└───────────────────────────┬─────────────────────────────────────┘
                            │  HTTP :3000
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                  FRONTEND  (React + Vite + Tailwind)            │
│                   Served by Nginx (:80 inside container)        │
│   Nginx reverse-proxies /api/* routes to backend services       │
└────┬──────────┬────────────┬────────────────┬───────────────────┘
     │          │            │                │
     │/api/auth │/api/users  │/api/trainings  │/api/attendance
     ▼          ▼            ▼                ▼
┌─────────┐ ┌──────────┐ ┌──────────────┐ ┌──────────────────┐
│  Auth   │ │  User    │ │  Training    │ │  Attendance      │
│ Service │ │ Service  │ │  Service     │ │  Service         │
│ :4001   │ │ :4002    │ │  :4003       │ │  :4004           │
└────┬────┘ └────┬─────┘ └──────┬───────┘ └──────┬───────────┘
     │           │              │                 │
     ▼           ▼              ▼                 ▼
┌─────────┐ ┌──────────┐ ┌──────────────┐ ┌──────────────────┐
│auth-    │ │user-     │ │training-     │ │attendance-       │
│mongo    │ │mongo     │ │mongo         │ │mongo             │
│:27017   │ │:27018    │ │:27019        │ │:27020            │
└─────────┘ └──────────┘ └──────────────┘ └──────────────────┘
```

### Inter-Service Communication (Traffic Flow)

A full request lifecycle for **marking attendance**:

```
1. Browser  →  POST /api/attendance  (with JWT Bearer token)
2. Nginx    →  Proxies to attendance-service:4004
3. attendance-service → GET http://auth-service:4001/api/auth/verify  (validates JWT)
4. attendance-service → GET http://user-service:4002/api/users/internal/validate/{userId}
5. attendance-service → GET http://training-service:4003/api/trainings/internal/validate/{trainingId}
6. attendance-service → Writes record to attendance-mongo
7. attendance-service → Returns 201 response to browser
```

---

## 🗂️ Project Structure

```
/capstone
├── docker-compose.yml          ← Spins up entire ecosystem
├── .env                        ← Root-level shared env
├── .gitignore
├── README.md
│
├── /frontend                   ← React + Vite + Tailwind SPA
│   ├── Dockerfile              ← Multi-stage: Vite build → Nginx
│   ├── nginx.conf              ← SPA routing + API reverse proxy
│   ├── .env
│   └── /src
│       ├── App.jsx
│       ├── main.jsx
│       ├── index.css
│       ├── /context            ← AuthContext (JWT + profile)
│       ├── /services           ← Axios API layer (one client per service)
│       ├── /components         ← Layout, ProtectedRoute, Sidebar
│       └── /pages              ← Login, Register, Dashboard, Users,
│                                  Trainings, TrainingDetail, Attendance
│
├── /services
│   ├── /auth-service           ← JWT register/login/refresh/verify
│   ├── /user-service           ← User profile CRUD
│   ├── /training-service       ← Training sessions + enrollments
│   └── /attendance-service     ← Attendance marking + reports
│
└── /k8s                        ← K8s manifests (placeholder — ready to fill)
```

---

## ⚡ Quick Start

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (v24+)
- [Docker Compose](https://docs.docker.com/compose/) v2 (`docker compose` — note: no hyphen)

### 1. Clone / Enter the project

```bash
cd capstone
```

### 2. Start the entire stack

```bash
docker compose up --build -d
```

This builds all images and starts:
- 4 MongoDB instances
- 4 Node.js microservices
- 1 React/Nginx frontend

### 3. Verify services are healthy

```bash
docker compose ps
```

All containers should show `healthy` or `running`.

### 4. Access the application

| Service        | URL                          |
|----------------|------------------------------|
| Frontend UI    | http://localhost:3000        |
| Auth Service   | http://localhost:4001/health |
| User Service   | http://localhost:4002/health |
| Training Svc   | http://localhost:4003/health |
| Attendance Svc | http://localhost:4004/health |

### 5. Create your first account

1. Open http://localhost:3000/register
2. Fill in User ID, email, password, name
3. Log in at http://localhost:3000/login

> **Tip:** To set a user as `admin`, connect to the auth-mongo:
> ```bash
> docker exec -it tms-auth-mongo mongosh auth_db
> db.authusers.updateOne({ email: "you@example.com" }, { $set: { role: "admin" } })
> ```
> Then do the same on user-mongo for the User collection.

### 6. Stop the stack

```bash
docker compose down          # stop, keep volumes
docker compose down -v       # stop + delete all data volumes
```

---

## 🔌 API Reference

### Auth Service — `http://localhost:4001`

| Method | Path                        | Description            | Auth |
|--------|-----------------------------|------------------------|------|
| POST   | /api/auth/register          | Register user          | No   |
| POST   | /api/auth/login             | Login → tokens         | No   |
| POST   | /api/auth/refresh           | Refresh access token   | No   |
| POST   | /api/auth/logout            | Invalidate token       | No   |
| GET    | /api/auth/verify            | Validate JWT (S2S)     | Bearer |
| PUT    | /api/auth/change-password   | Change password        | Bearer |

### User Service — `http://localhost:4002`

| Method | Path                              | Description             | Role    |
|--------|-----------------------------------|-------------------------|---------|
| POST   | /api/users                        | Create user             | admin   |
| GET    | /api/users                        | List users              | admin, trainer |
| GET    | /api/users/me                     | My profile              | any     |
| GET    | /api/users/:userId                | Get user by ID          | admin, trainer |
| PUT    | /api/users/:userId                | Update user             | admin   |
| DELETE | /api/users/:userId                | Deactivate user         | admin   |
| GET    | /api/users/internal/validate/:id  | S2S user validation     | internal |

### Training Service — `http://localhost:4003`

| Method | Path                                    | Description             | Role    |
|--------|-----------------------------------------|-------------------------|---------|
| GET    | /api/trainings                          | List trainings          | any     |
| POST   | /api/trainings                          | Create training         | admin, trainer |
| GET    | /api/trainings/:trainingId              | Get training            | any     |
| PUT    | /api/trainings/:trainingId              | Update training         | admin, trainer |
| DELETE | /api/trainings/:trainingId              | Cancel training         | admin, trainer |
| POST   | /api/trainings/:trainingId/enroll       | Enroll user             | any     |
| POST   | /api/trainings/:trainingId/unenroll     | Unenroll user           | any     |
| GET    | /api/trainings/internal/validate/:id   | S2S training validation | internal |

### Attendance Service — `http://localhost:4004`

| Method | Path                                    | Description            | Role    |
|--------|-----------------------------------------|------------------------|---------|
| POST   | /api/attendance                         | Mark single attendance | admin, trainer |
| POST   | /api/attendance/bulk                    | Bulk mark attendance   | admin, trainer |
| GET    | /api/attendance/training/:trainingId    | Get by training        | admin, trainer |
| GET    | /api/attendance/training/:trainingId/summary | Attendance stats  | admin, trainer |
| GET    | /api/attendance/user/:userId            | Get by user            | any (own only for trainee) |
| PUT    | /api/attendance/:attendanceId           | Update record          | admin, trainer |

---

## 🔒 Security Design

| Feature | Implementation |
|---------|---------------|
| Authentication | JWT access tokens (15m) + refresh tokens (7d), stored hashed in MongoDB |
| Non-root containers | All Dockerfiles use `adduser -S appuser` + `USER appuser` |
| Password hashing | bcryptjs with 12 salt rounds |
| Rate limiting | express-rate-limit on all service endpoints |
| Security headers | Helmet.js on all services |
| Inter-service auth | Services call auth-service `/api/auth/verify` to validate tokens |
| CORS | Configurable `ALLOWED_ORIGINS` per service |

---

## 🐳 Docker Image Details

| Service | Base Image | Build Strategy |
|---------|-----------|---------------|
| auth-service | node:20-alpine | Multi-stage deps → final |
| user-service | node:20-alpine | Multi-stage deps → final |
| training-service | node:20-alpine | Multi-stage deps → final |
| attendance-service | node:20-alpine | Multi-stage deps → final |
| frontend | node:20-alpine → nginx:1.27-alpine | Multi-stage Vite build → Nginx |

All images run as **non-root users** and include **HEALTHCHECK** instructions.

---

## ☸️ Kubernetes Deployment (Next Steps)

The `/k8s` directory is a structured placeholder. Typical next steps:

```bash
# 1. Push images to a registry
docker tag tms-auth-service  your-registry/tms-auth-service:v1.0.0
docker push your-registry/tms-auth-service:v1.0.0
# ... repeat for all services

# 2. Create namespace
kubectl apply -f k8s/namespace.yaml

# 3. Apply manifests
kubectl apply -f k8s/ --recursive

# 4. Or use Helm
helm install tms ./helm/tms -n tms

# 5. Or use ArgoCD
argocd app create tms --repo https://github.com/you/tms \
  --path helm/tms --dest-server https://kubernetes.default.svc \
  --dest-namespace tms
```

---

## 🔧 Environment Variables

Each service has its own `.env` and `.env.example` file. See:

- `services/auth-service/.env.example`
- `services/user-service/.env.example`
- `services/training-service/.env.example`
- `services/attendance-service/.env.example`

**Important:** Never commit `.env` files with real secrets. Use `.env.example` as templates.

---

## 🧹 Useful Commands

```bash
# View logs for a specific service
docker compose logs -f auth-service

# Rebuild a single service
docker compose up --build -d training-service

# Connect to MongoDB
docker exec -it tms-auth-mongo mongosh auth_db

# Health check all services
curl http://localhost:4001/health
curl http://localhost:4002/health
curl http://localhost:4003/health
curl http://localhost:4004/health

# Scale a service (for load testing)
docker compose up -d --scale training-service=3
```

---

## 📦 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS v3, React Router v6 |
| Backend | Node.js 20, Express 4, Mongoose 8 |
| Database | MongoDB 7 (one instance per service) |
| Auth | JWT (jsonwebtoken), bcryptjs |
| Containerization | Docker, Docker Compose, Nginx |
| Logging | Winston |
| Validation | express-validator |

---

*Built for DevOps practice — Kubernetes, CI/CD, ArgoCD, Helm.*

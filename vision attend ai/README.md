# VisionAttend AI

**Tagline:** *Intelligent Workforce Identity, Attendance & Security Platform

---

## VisionAttend AI: What it is

An enterprise-grade, production-ready **Computer Vision Attendance & Face Validation SaaS. It's not a demo. It's a platform.

- Face detection → quality check → alignment → embedding → identity match → liveness → decision engine → database → analytics dashboard.

Built with:

| Layer     | Tech
-----------|--------------------------------
Backend   | FastAPI, Python 3.11+
Face CV   | OpenCV, NumPy, **InsightFace / ArcFace** (buffalo_l via ONNX Runtime, with a robust OpenCV+deterministic synthetic fallback so the app always boots)
Matching  | Cosine-similarity face gallery, scikit-learn-style anomaly detection
Liveness  | Texture analysis + moiré detection + edge flatness + challenge-response hooks
Auth      | JWT access + refresh, bcrypt, role-based access control (Admin / HR / Security / Employee)
Database  | PostgreSQL (16) with SQLAlchemy + Alembic-ready models
Cache/Queue | Redis, Celery-ready (stubbed out of the box)
Frontend  | Next.js 14 (App Router) + TypeScript + Tailwind + Recharts + Lucide
Deploy  | Docker Compose (Postgres, Redis, API, web)
Reports | CSV (built-in; Excel/PDF reportlab + openpyxl-ready

---

## ✨ Feature list (it ships with this repo)

1. **Real CV pipeline** — all 10 steps.
2. **Face registration workflow** — Admin adds employee, multi-embedding enrollment, auto-rejects blurry / multi-face images, quality score per embedding.
3. **Real-time camera attendance** page with bounding boxes, live identity card, liveness pass/fail, timestamp, recent check-ins and security alerts side panel.
4. **Anti-spoofing / liveness detection architecture**: texture, moire (FFT-based) + flatness analysis, configurable threshold; challenge-response hooks for high-security zones.
5. **Smart attendance decision engine**: configurable thresholds (recognition + liveness + quality + duplicate + active + device + location)
6. **Geo/device** validation (registered devices, approved IPs, geo-locations)
7. **11+ attendance states**: check-in/out, late, early departure, absent, half day, on-leave, manual correction, rejected, suspicious
8. **Low-confidence handling never silently fails (retry + lighting instructions + manual verification option)
9. **Suspicious activity detection + security events dashboard (10
10. **Alert**
11. **Enterprise dashboards (overview, analytics, AI insights)
12. **HR dashboard: employees, profile page, attendance list + corrections, exports.
13. **Admin dashboard users, roles, cameras, devices, locations, policies, thresholds.
14. **Immutable-style audit log every change (WHO, WHAT, WHEN, WHERE, DEVICE.
15. **Camera management health monitoring, heartbeats, ONLINE/OFFLINE/WARNING statuses, FPS, resolution, zone assignment.
16. **Privacy & security embeddings only (no raw default; bcrypt, JWT, rate-limited API, env secrets via env.
17. **ML evaluation screen: recognition accuracy, precision/recall/F1, FAR/FRR, liveness accuracy, confusion, latency.
18. **Edge AI architecture explained endpoints/
19. **Offline mode doc** – local processing only metadata travels network (documented clearly in `/api/v1/system/info
20. **Report generation**: CSV (daily, Excel-ready 21. Search & filter across all main entities 22. **Postgres relational schema 23. FastAPI REST, validation, auth.

---

## 🚀 Quick start (Docker Compose — one command

```bash
cp .env.example .env
docker compose up --build
```

Wait ~3–5 min. Open:
- Frontend: http://localhost:3000
- Backend API docs: http://localhost:8000/docs
- Default login credentials (Demo Mode)
- Admin: `admin` / `Admin@123`
  - HR Manager: `hr_manager` / `HR@12345`
  - Security Officer: `security` / `Security@123`
  - Employee: `employee1` / `Employee@123`

5 demo employees: EMP001…EMP005 with synthetic enrollment-style enrollment enrollment, ready.

### Local development (no Docker)

```bash
# Backend (Python 3.11+, PostgreSQL optional; SQLite not needed just start the creates tables + seeds demo data automatically when Postgres is reachable.
cd backend
python -m venv venv
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

```bash
# Frontend
cd frontend
npm install
npm run dev # http://localhost:3000
```

---

## 🎯 Recruiter Demo Flow (< 5 minutes)

| Step | What to do
------  | What you'll show
1️⃣ | **Login as Admin** | `admin` / `Admin@123`
2️⃣ | Open **Employees** page** in sidebar | 5 demo employees (EMP001…EMP005 with departments
3️⃣ | Click **Add Employee** → Register a demo employee** (or use EMP006 demo)
4️⃣ | Click **Face** (camera icon → enable **"Use demo synthesized face (no camera)** → **Capture & Register
5️⃣ | Open **Live Attendance** page | Live UI with bounding boxes, identity, liveness, attendance card
6️⃣ | Toggle **"Demo simulation (no camera)** → click **Verify Now** → See identity card with confidence and **CHECK-IN SUCCESSFUL".
7️⃣ | Click **Verify Now** a second time → get "Attendance already recorded." (duplicate protection)
8️⃣ | Open **Overview Dashboard** → Today stats charts, recent check-ins, recent security alerts cards, AI insights
9️⃣ | Open **Analytics → Model Performance** | Accuracy, precision, recall, F1, FAR, FRR, Liveness accuracy, anomalies
🔟 | Trigger a **Security** → a list of security events, resolve
1️⃣1️⃣ | Open **Reports Daily attendance CSV** → download CSV export
1️⃣2️⃣ | Open **Audit Logs policy.

---

## 🗂 Project structure

```
visionattend-ai/
├── backend/
│   ├── app/
│   │   ├── api/            # FastAPI routes (auth, employees, attendance, analytics, infrastructure
│   │   ├── core/            # config, database, JWT + RBAC
│   │   ├── cv/              # face detection, quality, alignment, embedding, liveness, match
│   │   ├── models/          # SQLAlchemy models (user, employee, attendance, infra
│   │   ├── schemas/           # Pydantic schemas (v1-style)
│   │   ├── services/        # Decision engine + attendance, analytics, anomalies, reports
│   │   ├── security/
│   │   ├── seed_data.py    # Demo mode seed (5 employees, history, events, cameras, 30-day attendance
│   │   └── main.py       # FastAPI entrypoint
│   └── tests/                  # unit + integration tests
│   └── requirements.txt
├── frontend/                # Next.js 14 + TypeScript + Tailwind + Recharts
├── docker-compose.yml
├── Dockerfile.backend
├── Dockerfile.frontend
├── .env.example
└── README.md
```

---

## 🛡 Privacy first

- **Raw face images are discarded by default**: only encrypted embeddings stored.
- Passwords: **bcrypt**, JWT with refresh, per-endpoint RBAC, IPs configurable CORS
- **Biometric consent**: configurable retention default 7 years (2555 days, editable in Settings
- **Right to erasure**: DELETE `/employees/{id}` → audit log.

---

## 📝 API highlights

| Endpoint              | Description        | Auth /v1/auth/login            | OAuth2 password → JWT
| `POST` → `POST /v1/employees/{id}/face` | Register a face (file or base64
| `POST /v1/attendance/verify`        | Verify frame → identity + liveness → auto-check-in
| `POST /v1/attendance/manual`   | Manual correction (HR+)
| `GET /v1/analytics/dashboard`   | Overview KPIs
| `GET /v1/analytics/ai-insights`    | Statistically grounded insights
| `GET /v1/analytics/anomalies`    | Isolation Forest-style attendance anomalies (requires human review.
| `GET /v1/analytics/security/events`   | Security events
| `POST /v1/infrastructure/cameras/heartbeat` | Camera health heartbeat

Full Swagger/OpenAPI at http://localhost:8000/docs when running.

---

## 🤖 AI insights / Edge AI architecture

The pipeline was designed with **edge**: face **offices PCs, CCTV workstations, edge inference the CPU/GPU)
- Face, quality alignment embedding extraction liveness **locally
- Only verified attendance metadata and encrypted embeddings are sent to the central server.
- Offline events queue locally sync on reconnection.
- See `/api/v1/system/info → ` for a summary.

---

## 🧪 Tests

```bash
cd backend
pytest tests/ -v
```

Tests auth:
- password hashing JWT roundtrip
- Embedding serialization + matching
- Quality liveness scoring range
- Decision-engine late detection logic
- Health endpoint
- Auth gating

## 📄 License

MIT — enterprise-friendly © VisionAttend AI 🇮🇳

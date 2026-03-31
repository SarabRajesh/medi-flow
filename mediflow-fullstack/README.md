# 🏥 MediFlow — Smart Hospital Management System

A fully working, production-ready hospital management system with real backend, database, and JWT authentication.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Start the Server
```bash
npm start
```

### 3. Open in Browser
```
http://localhost:3000
```

That's it! The database auto-seeds with demo data on first run.

---

## 🔑 Demo Login Credentials

| Role    | Email                    | Password    |
|---------|--------------------------|-------------|
| Admin   | admin@mediflow.com       | admin123    |
| Doctor  | priya@mediflow.com       | doctor123   |
| Doctor  | arjun@mediflow.com       | doctor123   |
| Patient | patient@mediflow.com     | patient123  |

---

## 🏗️ Architecture

```
mediflow/
├── backend/
│   ├── server.js          # Express server + all API routes
│   ├── mediflow.db        # SQLite database (auto-created)
│   └── package.json
└── frontend/
    └── public/
        └── index.html     # Full SPA frontend
```

## ⚡ Tech Stack

| Layer      | Technology                        |
|------------|-----------------------------------|
| Backend    | Node.js + Express                 |
| Database   | SQLite (via better-sqlite3)       |
| Auth       | JWT (jsonwebtoken) + bcryptjs     |
| Frontend   | Vanilla HTML/CSS/JS (SPA)         |
| Serving    | Express static files              |

---

## 🔌 API Endpoints

### Authentication
| Method | Endpoint           | Description                |
|--------|--------------------|----------------------------|
| POST   | /api/auth/login    | Login & get JWT token      |
| POST   | /api/auth/register | Register new patient       |
| GET    | /api/auth/me       | Get current user profile   |

### Dashboard
| GET | /api/dashboard/admin   | Admin stats & recent data  |
| GET | /api/dashboard/doctor  | Doctor's today schedule    |
| GET | /api/dashboard/patient | Patient health summary     |

### Patients
| GET  | /api/patients        | List all patients (search) |
| GET  | /api/patients/:id    | Patient detail + history   |
| POST | /api/patients        | Create patient (admin)     |

### Doctors
| GET  | /api/doctors         | List doctors (filter dept) |
| POST | /api/doctors         | Add doctor (admin)         |

### Appointments
| GET    | /api/appointments          | List appointments (role-filtered) |
| GET    | /api/appointments/slots    | Available time slots       |
| POST   | /api/appointments          | Book appointment           |
| PUT    | /api/appointments/:id      | Update status/notes        |
| DELETE | /api/appointments/:id      | Cancel appointment         |

### Prescriptions
| GET  | /api/prescriptions  | List prescriptions (role-filtered) |
| POST | /api/prescriptions  | Create prescription (doctor only)  |

### Billing
| GET | /api/billing         | List bills (role-filtered) |
| POST | /api/billing        | Create bill (admin)        |
| PUT | /api/billing/:id/pay | Mark bill as paid          |

### Inventory
| GET  | /api/inventory      | List all inventory items   |
| POST | /api/inventory      | Add item (admin)           |
| PUT  | /api/inventory/:id  | Update stock               |

### Messages
| GET  | /api/messages/:userId | Conversation with user   |
| POST | /api/messages         | Send message             |

### Reports
| GET | /api/reports/summary  | Monthly stats + dept data  |

---

## ✨ Features

### Admin Portal
- Hospital dashboard with live stats
- Patient & doctor management (add/view)
- All appointments with status updates
- Billing management & payment tracking
- Inventory with low-stock alerts
- Department overview with load indicators
- Monthly reports & export buttons

### Doctor Portal
- Personalized dashboard with today's schedule
- Appointment management with status updates
- Patient list with medical history
- Prescription creation
- Profile management

### Patient Portal
- Health dashboard with health score ring
- Book appointments (department → doctor → date → slot)
- View upcoming & past appointments
- Prescriptions with medication list
- Bill viewing & online payment
- Secure messaging with doctor
- Emergency contacts & first aid

---

## 🔒 Security Features
- JWT-based authentication (7 day expiry)
- bcrypt password hashing (10 rounds)
- Role-based access control on all routes
- Auto-filtering: doctors see only their data, patients see only their data

## 🛠️ Environment Variables
```env
PORT=3000            # Server port (default: 3000)
JWT_SECRET=xxx       # JWT signing secret (change in production!)
```

## 📦 Production Deployment

### On a VPS (Ubuntu)
```bash
npm install -g pm2
cd backend
pm2 start server.js --name mediflow
pm2 startup
pm2 save
```

### With nginx reverse proxy
```nginx
location / {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
}
```

### Using Railway / Render / Fly.io
Just set `PORT` env variable and deploy the `backend/` folder with `frontend/public/` included.

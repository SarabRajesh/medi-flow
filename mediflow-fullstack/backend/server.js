/**
 * MediFlow Hospital Management System — Backend Server
 * Stack: Node.js + Express + better-sqlite3 + JWT
 * Run: npm install && node server.js
 */

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'mediflow-secret-2026';

// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend/public')));

// ─── DATABASE ─────────────────────────────────────────────────────────────────
const db = new Database(path.join(__dirname, 'mediflow.db'));
db.pragma('journal_mode = WAL');

// ─── SCHEMA ───────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin','doctor','patient')),
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS doctors (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    specialization TEXT,
    department TEXT,
    experience INTEGER DEFAULT 0,
    qualifications TEXT,
    available_days TEXT DEFAULT 'Mon,Tue,Wed,Thu,Fri',
    consultation_fee INTEGER DEFAULT 500,
    rating REAL DEFAULT 4.5
  );

  CREATE TABLE IF NOT EXISTS patients (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    dob TEXT,
    gender TEXT,
    phone TEXT,
    blood_group TEXT,
    address TEXT,
    emergency_contact TEXT,
    health_score INTEGER DEFAULT 85
  );

  CREATE TABLE IF NOT EXISTS appointments (
    id TEXT PRIMARY KEY,
    patient_id TEXT REFERENCES patients(id),
    doctor_id TEXT REFERENCES doctors(id),
    date TEXT NOT NULL,
    time_slot TEXT NOT NULL,
    status TEXT DEFAULT 'scheduled' CHECK(status IN ('scheduled','confirmed','completed','cancelled','no-show')),
    type TEXT DEFAULT 'consultation',
    chief_complaint TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS prescriptions (
    id TEXT PRIMARY KEY,
    appointment_id TEXT REFERENCES appointments(id),
    patient_id TEXT REFERENCES patients(id),
    doctor_id TEXT REFERENCES doctors(id),
    diagnosis TEXT,
    medications TEXT,
    instructions TEXT,
    follow_up_date TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS medical_records (
    id TEXT PRIMARY KEY,
    patient_id TEXT REFERENCES patients(id),
    doctor_id TEXT REFERENCES doctors(id),
    record_type TEXT,
    title TEXT,
    description TEXT,
    file_url TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS billing (
    id TEXT PRIMARY KEY,
    patient_id TEXT REFERENCES patients(id),
    appointment_id TEXT REFERENCES appointments(id),
    amount INTEGER NOT NULL,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending','paid','overdue','refunded')),
    items TEXT,
    due_date TEXT,
    paid_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS inventory (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    quantity INTEGER DEFAULT 0,
    unit TEXT DEFAULT 'units',
    min_level INTEGER DEFAULT 10,
    supplier TEXT,
    unit_cost REAL DEFAULT 0,
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    sender_id TEXT REFERENCES users(id),
    receiver_id TEXT REFERENCES users(id),
    content TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    title TEXT,
    body TEXT,
    type TEXT DEFAULT 'info',
    is_read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// ─── SEED DATA ────────────────────────────────────────────────────────────────
function seedDatabase() {
  const count = db.prepare('SELECT COUNT(*) as c FROM users').get();
  if (count.c > 0) return;

  console.log('🌱 Seeding database...');
  const hash = (p) => bcrypt.hashSync(p, 10);

  // Admin
  const adminId = uuidv4();
  db.prepare(`INSERT INTO users VALUES (?,?,?,?,?,datetime('now'))`).run(adminId, 'Admin Sharma', 'admin@mediflow.com', hash('admin123'), 'admin');

  // Doctors
  const doctorUsers = [
    { name: 'Dr. Priya Nair', email: 'priya@mediflow.com', spec: 'Cardiologist', dept: 'Cardiology', exp: 12, quals: 'MBBS, MD Cardiology', fee: 800 },
    { name: 'Dr. Arjun Sharma', email: 'arjun@mediflow.com', spec: 'Neurologist', dept: 'Neurology', exp: 9, quals: 'MBBS, DM Neurology', fee: 700 },
    { name: 'Dr. Kavita Reddy', email: 'kavita@mediflow.com', spec: 'Orthopedic Surgeon', dept: 'Orthopedics', exp: 15, quals: 'MBBS, MS Orthopedics', fee: 900 },
    { name: 'Dr. Suresh Patel', email: 'suresh@mediflow.com', spec: 'Pediatrician', dept: 'Pediatrics', exp: 8, quals: 'MBBS, MD Pediatrics', fee: 600 },
  ];

  const doctorIds = [];
  for (const d of doctorUsers) {
    const uid = uuidv4(); const did = uuidv4();
    db.prepare(`INSERT INTO users VALUES (?,?,?,?,?,datetime('now'))`).run(uid, d.name, d.email, hash('doctor123'), 'doctor');
    db.prepare(`INSERT INTO doctors VALUES (?,?,?,?,?,?,?,?,?)`).run(did, uid, d.spec, d.dept, d.exp, d.quals, 'Mon,Tue,Wed,Thu,Fri', d.fee, (4.0 + Math.random()).toFixed(1));
    doctorIds.push(did);
  }

  // Patients
  const patientData = [
    { name: 'Rajesh Kumar', email: 'rajesh@example.com', dob: '1980-05-15', gender: 'Male', phone: '+91 98765 43210', blood: 'O+' },
    { name: 'Mohit Gupta', email: 'mohit@example.com', dob: '1992-08-22', gender: 'Male', phone: '+91 87654 32109', blood: 'A+' },
    { name: 'Deepa Singh', email: 'deepa@example.com', dob: '1975-11-30', gender: 'Female', phone: '+91 76543 21098', blood: 'B+' },
    { name: 'Anita Mehta', email: 'patient@mediflow.com', dob: '1990-03-10', gender: 'Female', phone: '+91 65432 10987', blood: 'AB+' },
  ];

  const patientIds = [];
  for (const p of patientData) {
    const uid = uuidv4(); const pid = uuidv4();
    db.prepare(`INSERT INTO users VALUES (?,?,?,?,?,datetime('now'))`).run(uid, p.name, p.email, hash('patient123'), 'patient');
    db.prepare(`INSERT INTO patients VALUES (?,?,?,?,?,?,?,?,?)`).run(pid, uid, p.dob, p.gender, p.phone, p.blood, 'Chennai, Tamil Nadu', p.phone, 75 + Math.floor(Math.random() * 25));
    patientIds.push(pid);
  }

  // Appointments
  const slots = ['09:00','09:30','10:00','10:30','11:00','11:30','14:00','14:30','15:00'];
  const statuses = ['scheduled','confirmed','completed','cancelled'];
  const dates = ['2026-03-28','2026-03-29','2026-03-30','2026-03-31','2026-04-01','2026-04-02'];
  for (let i = 0; i < 20; i++) {
    db.prepare(`INSERT INTO appointments VALUES (?,?,?,?,?,?,?,?,?,datetime('now'))`).run(
      uuidv4(), patientIds[i % patientIds.length], doctorIds[i % doctorIds.length],
      dates[i % dates.length], slots[i % slots.length],
      statuses[i % statuses.length], 'consultation',
      ['Chest pain','Headache','Back pain','Fever','Follow-up'][i % 5], ''
    );
  }

  // Prescriptions
  db.prepare(`INSERT INTO prescriptions VALUES (?,NULL,?,?,?,?,?,?,datetime('now'))`).run(
    uuidv4(), patientIds[0], doctorIds[0],
    'Hypertension Stage 1',
    JSON.stringify([{name:'Amlodipine 5mg', dosage:'Once daily morning'},{name:'Metoprolol 25mg', dosage:'Twice daily'}]),
    'Avoid salt. Regular exercise. Monitor BP daily.',
    '2026-04-15'
  );

  // Billing
  for (let i = 0; i < 8; i++) {
    db.prepare(`INSERT INTO billing VALUES (?,?,NULL,?,?,?,?,NULL,datetime('now'))`).run(
      uuidv4(), patientIds[i % patientIds.length],
      500 + (i * 200), ['paid','pending','overdue'][i % 3],
      JSON.stringify([{desc:'Consultation',amt:500},{desc:'Lab Tests',amt: i*100}]),
      '2026-04-30'
    );
  }

  // Inventory
  const items = [
    ['Paracetamol 500mg','Medicine',500,'strips',50,'PharmaCo',12],
    ['Surgical Gloves (L)','Supplies',200,'boxes',30,'MediSupply',45],
    ['Blood Glucose Strips','Diagnostics',150,'packs',20,'DiagCo',85],
    ['Insulin Syringes','Supplies',8,'boxes',25,'MediSupply',120],
    ['Oxygen Cylinders','Equipment',12,'units',5,'OxyGen',1200],
    ['Saline IV 500ml','Medicine',80,'bags',40,'PharmaCo',35],
    ['Betadine Solution','Medicine',45,'bottles',20,'PharmaCo',55],
    ['Disposable Masks','PPE',300,'packs',100,'SafeCo',18],
  ];
  for (const [name,cat,qty,unit,min,sup,cost] of items) {
    db.prepare(`INSERT INTO inventory VALUES (?,?,?,?,?,?,?,?,datetime('now'))`).run(uuidv4(),name,cat,qty,unit,min,sup,cost);
  }

  // Notifications
  for (const [uid, title, body] of [
    [adminId,'New Patient Registration','Anita Mehta has registered as a new patient'],
    [adminId,'Low Inventory Alert','Oxygen Cylinders stock is critically low (8 units)'],
  ]) {
    db.prepare(`INSERT INTO notifications VALUES (?,?,?,?,?,0,datetime('now'))`).run(uuidv4(),uid,title,body,'warning');
  }

  console.log('✅ Database seeded. Demo logins:');
  console.log('   Admin:   admin@mediflow.com  / admin123');
  console.log('   Doctor:  priya@mediflow.com  / doctor123');
  console.log('   Patient: patient@mediflow.com / patient123');
}

seedDatabase();

// ─── AUTH MIDDLEWARE ──────────────────────────────────────────────────────────
function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const getDoctor = (userId) => db.prepare('SELECT d.*, u.name, u.email FROM doctors d JOIN users u ON d.user_id=u.id WHERE d.user_id=?').get(userId);
const getPatient = (userId) => db.prepare('SELECT p.*, u.name, u.email FROM patients p JOIN users u ON p.user_id=u.id WHERE p.user_id=?').get(userId);

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

// POST /api/auth/login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const user = db.prepare('SELECT * FROM users WHERE email=?').get(email.toLowerCase().trim());
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  if (!bcrypt.compareSync(password, user.password))
    return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '7d' });

  // Get role-specific profile
  let profile = null;
  if (user.role === 'doctor') profile = getDoctor(user.id);
  if (user.role === 'patient') profile = getPatient(user.id);

  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role }, profile });
});

// POST /api/auth/register
app.post('/api/auth/register', (req, res) => {
  const { name, email, password, role, phone, dob, gender, blood_group } = req.body;
  if (!name || !email || !password || !role) return res.status(400).json({ error: 'All fields required' });

  const existing = db.prepare('SELECT id FROM users WHERE email=?').get(email.toLowerCase());
  if (existing) return res.status(400).json({ error: 'Email already registered' });

  const uid = uuidv4();
  const hashed = bcrypt.hashSync(password, 10);
  db.prepare(`INSERT INTO users VALUES (?,?,?,?,?,datetime('now'))`).run(uid, name, email.toLowerCase(), hashed, role);

  if (role === 'patient') {
    const pid = uuidv4();
    db.prepare(`INSERT INTO patients VALUES (?,?,?,?,?,?,?,?,?)`).run(pid, uid, dob||null, gender||null, phone||null, blood_group||null, null, null, 85);
  }

  const token = jwt.sign({ id: uid, role, name }, JWT_SECRET, { expiresIn: '7d' });
  res.status(201).json({ token, user: { id: uid, name, email, role } });
});

// GET /api/auth/me
app.get('/api/auth/me', auth, (req, res) => {
  const user = db.prepare('SELECT id, name, email, role, created_at FROM users WHERE id=?').get(req.user.id);
  let profile = null;
  if (user.role === 'doctor') profile = getDoctor(user.id);
  if (user.role === 'patient') profile = getPatient(user.id);
  res.json({ user, profile });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD STATS
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/dashboard/admin', auth, requireRole('admin'), (req, res) => {
  const totalPatients = db.prepare('SELECT COUNT(*) as c FROM patients').get().c;
  const totalDoctors = db.prepare('SELECT COUNT(*) as c FROM doctors').get().c;
  const todayAppts = db.prepare("SELECT COUNT(*) as c FROM appointments WHERE date=date('now')").get().c;
  const revenue = db.prepare("SELECT SUM(amount) as total FROM billing WHERE status='paid'").get().total || 0;
  const emergencies = db.prepare("SELECT COUNT(*) as c FROM appointments WHERE type='emergency'").get().c;
  const pendingBills = db.prepare("SELECT COUNT(*) as c FROM billing WHERE status='pending'").get().c;
  const lowInventory = db.prepare('SELECT COUNT(*) as c FROM inventory WHERE quantity <= min_level').get().c;
  const recentAppts = db.prepare(`
    SELECT a.*, p.name as patient_name, d.name as doctor_name
    FROM appointments a
    JOIN patients pt ON a.patient_id=pt.id
    JOIN users p ON pt.user_id=p.id
    JOIN doctors dc ON a.doctor_id=dc.id
    JOIN users d ON dc.user_id=d.id
    ORDER BY a.created_at DESC LIMIT 10
  `).all();

  res.json({ totalPatients, totalDoctors, todayAppts, revenue, emergencies, pendingBills, lowInventory, recentAppts });
});

app.get('/api/dashboard/doctor', auth, requireRole('doctor'), (req, res) => {
  const doctor = getDoctor(req.user.id);
  if (!doctor) return res.status(404).json({ error: 'Doctor profile not found' });

  const todayAppts = db.prepare(`
    SELECT a.*, p.name as patient_name, pt.blood_group, pt.gender
    FROM appointments a
    JOIN patients pt ON a.patient_id=pt.id
    JOIN users p ON pt.user_id=p.id
    WHERE a.doctor_id=? AND a.date=date('now')
    ORDER BY a.time_slot
  `).all(doctor.id);

  const totalPatients = db.prepare('SELECT COUNT(DISTINCT patient_id) as c FROM appointments WHERE doctor_id=?').get(doctor.id).c;
  const completed = db.prepare("SELECT COUNT(*) as c FROM appointments WHERE doctor_id=? AND status='completed'").get(doctor.id).c;
  const pending = db.prepare("SELECT COUNT(*) as c FROM appointments WHERE doctor_id=? AND status IN ('scheduled','confirmed')").get(doctor.id).c;

  res.json({ doctor, todayAppts, totalPatients, completed, pending });
});

app.get('/api/dashboard/patient', auth, requireRole('patient'), (req, res) => {
  const patient = getPatient(req.user.id);
  if (!patient) return res.status(404).json({ error: 'Patient profile not found' });

  const upcomingAppts = db.prepare(`
    SELECT a.*, d.name as doctor_name, dc.specialization, dc.department
    FROM appointments a
    JOIN doctors dc ON a.doctor_id=dc.id
    JOIN users d ON dc.user_id=d.id
    WHERE a.patient_id=? AND a.date >= date('now') AND a.status NOT IN ('cancelled')
    ORDER BY a.date, a.time_slot LIMIT 5
  `).all(patient.id);

  const prescriptions = db.prepare(`
    SELECT p.*, d.name as doctor_name
    FROM prescriptions p
    JOIN doctors dc ON p.doctor_id=dc.id
    JOIN users d ON dc.user_id=d.id
    WHERE p.patient_id=?
    ORDER BY p.created_at DESC LIMIT 3
  `).all(patient.id);

  const bills = db.prepare("SELECT * FROM billing WHERE patient_id=? AND status='pending'").all(patient.id);

  res.json({ patient, upcomingAppts, prescriptions, bills });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PATIENTS
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/patients', auth, requireRole('admin','doctor'), (req, res) => {
  const { search, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  let query = `SELECT p.*, u.name, u.email FROM patients p JOIN users u ON p.user_id=u.id`;
  const params = [];
  if (search) { query += ` WHERE u.name LIKE ? OR p.phone LIKE ?`; params.push(`%${search}%`, `%${search}%`); }
  query += ` ORDER BY u.name LIMIT ? OFFSET ?`;
  params.push(+limit, +offset);
  const patients = db.prepare(query).all(...params);
  const total = db.prepare(`SELECT COUNT(*) as c FROM patients p JOIN users u ON p.user_id=u.id`).get().c;
  res.json({ patients, total, page: +page, limit: +limit });
});

app.get('/api/patients/:id', auth, (req, res) => {
  const patient = db.prepare('SELECT p.*, u.name, u.email FROM patients p JOIN users u ON p.user_id=u.id WHERE p.id=?').get(req.params.id);
  if (!patient) return res.status(404).json({ error: 'Not found' });

  const appointments = db.prepare(`
    SELECT a.*, d.name as doctor_name, dc.specialization FROM appointments a
    JOIN doctors dc ON a.doctor_id=dc.id JOIN users d ON dc.user_id=d.id
    WHERE a.patient_id=? ORDER BY a.date DESC LIMIT 10
  `).all(patient.id);

  const prescriptions = db.prepare('SELECT * FROM prescriptions WHERE patient_id=? ORDER BY created_at DESC').all(patient.id);
  const records = db.prepare('SELECT * FROM medical_records WHERE patient_id=? ORDER BY created_at DESC').all(patient.id);
  const bills = db.prepare('SELECT * FROM billing WHERE patient_id=? ORDER BY created_at DESC LIMIT 5').all(patient.id);

  res.json({ patient, appointments, prescriptions, records, bills });
});

app.post('/api/patients', auth, requireRole('admin'), (req, res) => {
  const { name, email, dob, gender, phone, blood_group, address } = req.body;
  const uid = uuidv4(); const pid = uuidv4();
  const tmpPwd = bcrypt.hashSync('Patient@123', 10);
  db.prepare(`INSERT INTO users VALUES (?,?,?,?,?,datetime('now'))`).run(uid, name, email, tmpPwd, 'patient');
  db.prepare(`INSERT INTO patients VALUES (?,?,?,?,?,?,?,?,?)`).run(pid, uid, dob, gender, phone, blood_group, address, null, 80);
  res.status(201).json({ id: pid, message: 'Patient created. Default password: Patient@123' });
});

app.put('/api/patients/:id', auth, (req, res) => {
  const { phone, address, emergency_contact, blood_group } = req.body;
  db.prepare('UPDATE patients SET phone=?, address=?, emergency_contact=?, blood_group=?, WHERE id=?')
    .run(phone, address, emergency_contact, blood_group, req.params.id);
  res.json({ success: true });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DOCTORS
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/doctors', auth, (req, res) => {
  const { department, search } = req.query;
  let query = 'SELECT d.*, u.name, u.email FROM doctors d JOIN users u ON d.user_id=u.id';
  const params = [];
  const where = [];
  if (department) { where.push('d.department=?'); params.push(department); }
  if (search) { where.push('(u.name LIKE ? OR d.specialization LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }
  if (where.length) query += ' WHERE ' + where.join(' AND ');
  res.json(db.prepare(query).all(...params));
});

app.get('/api/doctors/:id', auth, (req, res) => {
  const doctor = db.prepare('SELECT d.*, u.name, u.email FROM doctors d JOIN users u ON d.user_id=u.id WHERE d.id=?').get(req.params.id);
  if (!doctor) return res.status(404).json({ error: 'Not found' });
  res.json(doctor);
});

app.post('/api/doctors', auth, requireRole('admin'), (req, res) => {
  const { name, email, specialization, department, experience, qualifications, consultation_fee } = req.body;
  const uid = uuidv4(); const did = uuidv4();
  const tmpPwd = bcrypt.hashSync('Doctor@123', 10);
  db.prepare(`INSERT INTO users VALUES (?,?,?,?,?,datetime('now'))`).run(uid, name, email, tmpPwd, 'doctor');
  db.prepare(`INSERT INTO doctors VALUES (?,?,?,?,?,?,?,?,?)`).run(did, uid, specialization, department, experience||0, qualifications||'', 'Mon,Tue,Wed,Thu,Fri', consultation_fee||500, 4.5);
  res.status(201).json({ id: did, message: 'Doctor created. Default password: Doctor@123' });
});

// ═══════════════════════════════════════════════════════════════════════════════
// APPOINTMENTS
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/appointments', auth, (req, res) => {
  const { date, status, doctor_id, patient_id } = req.query;
  let query = `
    SELECT a.*, p.name as patient_name, pt.blood_group, d.name as doctor_name, dc.specialization, dc.department
    FROM appointments a
    JOIN patients pt ON a.patient_id=pt.id
    JOIN users p ON pt.user_id=p.id
    JOIN doctors dc ON a.doctor_id=dc.id
    JOIN users d ON dc.user_id=d.id
    WHERE 1=1
  `;
  const params = [];

  // Role-based filtering
  if (req.user.role === 'doctor') {
    const doc = getDoctor(req.user.id);
    query += ' AND a.doctor_id=?'; params.push(doc?.id);
  } else if (req.user.role === 'patient') {
    const pat = getPatient(req.user.id);
    query += ' AND a.patient_id=?'; params.push(pat?.id);
  }

  if (date) { query += ' AND a.date=?'; params.push(date); }
  if (status) { query += ' AND a.status=?'; params.push(status); }
  if (doctor_id) { query += ' AND a.doctor_id=?'; params.push(doctor_id); }
  if (patient_id) { query += ' AND a.patient_id=?'; params.push(patient_id); }

  query += ' ORDER BY a.date, a.time_slot';
  res.json(db.prepare(query).all(...params));
});

app.get('/api/appointments/slots', auth, (req, res) => {
  const { doctor_id, date } = req.query;
  if (!doctor_id || !date) return res.status(400).json({ error: 'doctor_id and date required' });
  const booked = db.prepare(`SELECT time_slot FROM appointments WHERE doctor_id=? AND date=? AND status NOT IN ('cancelled')`)
    .all(doctor_id, date).map(r => r.time_slot);
  const allSlots = ['09:00','09:30','10:00','10:30','11:00','11:30','12:00','14:00','14:30','15:00','15:30','16:00','16:30','17:00'];
  res.json(allSlots.map(s => ({ time: s, available: !booked.includes(s) })));
});

app.post('/api/appointments', auth, (req, res) => {
  const { doctor_id, patient_id, date, time_slot, type, chief_complaint } = req.body;

  let actualPatientId = patient_id;
  if (req.user.role === 'patient') {
    const pat = getPatient(req.user.id);
    actualPatientId = pat?.id;
  }
  if (!actualPatientId || !doctor_id || !date || !time_slot)
    return res.status(400).json({ error: 'Required fields missing' });

  // Check slot availability
  const conflict = db.prepare(`SELECT id FROM appointments WHERE doctor_id=? AND date=? AND time_slot=? AND status NOT IN ('cancelled')`).get(doctor_id, date, time_slot);
  if (conflict) return res.status(409).json({ error: 'Slot already booked' });

  const id = uuidv4();
  db.prepare(`INSERT INTO appointments VALUES (?,?,?,?,?,?,?,?,?,datetime('now'))`).run(
    id, actualPatientId, doctor_id, date, time_slot, 'scheduled', type||'consultation', chief_complaint||'', ''
  );

  // Create notification
  const doc = db.prepare('SELECT u.id FROM doctors d JOIN users u ON d.user_id=u.id WHERE d.id=?').get(doctor_id);
  if (doc) {
    db.prepare(`INSERT INTO notifications VALUES (?,?,?,?,?,0,datetime('now'))`).run(
      uuidv4(), doc.id, 'New Appointment', `Appointment booked for ${date} at ${time_slot}`, 'info'
    );
  }

  res.status(201).json({ id, message: 'Appointment booked successfully' });
});

app.put('/api/appointments/:id', auth, (req, res) => {
  const { status, notes } = req.body;
  const appt = db.prepare('SELECT * FROM appointments WHERE id=?').get(req.params.id);
  if (!appt) return res.status(404).json({ error: 'Not found' });
  db.prepare('UPDATE appointments SET status=?, notes=? WHERE id=?').run(status||appt.status, notes||appt.notes, req.params.id);

  // Auto-create billing on completion
  if (status === 'completed') {
    const doc = db.prepare('SELECT consultation_fee FROM doctors WHERE id=?').get(appt.doctor_id);
    if (doc) {
      db.prepare(`INSERT INTO billing VALUES (?,?,?,?,?,?,?,NULL,datetime('now'))`).run(
        uuidv4(), appt.patient_id, appt.id, doc.consultation_fee, 'pending',
        JSON.stringify([{desc:'Consultation Fee', amt: doc.consultation_fee}]),
        new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0]
      );
    }
  }

  res.json({ success: true });
});

app.delete('/api/appointments/:id', auth, (req, res) => {
  db.prepare("UPDATE appointments SET status='cancelled' WHERE id=?").run(req.params.id);
  res.json({ success: true });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PRESCRIPTIONS
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/prescriptions', auth, (req, res) => {
  let query = `
    SELECT pr.*, p.name as patient_name, d.name as doctor_name, dc.specialization
    FROM prescriptions pr
    JOIN patients pt ON pr.patient_id=pt.id
    JOIN users p ON pt.user_id=p.id
    JOIN doctors dc ON pr.doctor_id=dc.id
    JOIN users d ON dc.user_id=d.id
    WHERE 1=1
  `;
  const params = [];
  if (req.user.role === 'doctor') {
    const doc = getDoctor(req.user.id);
    query += ' AND pr.doctor_id=?'; params.push(doc?.id);
  } else if (req.user.role === 'patient') {
    const pat = getPatient(req.user.id);
    query += ' AND pr.patient_id=?'; params.push(pat?.id);
  }
  query += ' ORDER BY pr.created_at DESC';
  const prescriptions = db.prepare(query).all(...params).map(p => ({
    ...p, medications: JSON.parse(p.medications || '[]')
  }));
  res.json(prescriptions);
});

app.post('/api/prescriptions', auth, requireRole('doctor'), (req, res) => {
  const { patient_id, appointment_id, diagnosis, medications, instructions, follow_up_date } = req.body;
  const doc = getDoctor(req.user.id);
  const id = uuidv4();
  db.prepare(`INSERT INTO prescriptions VALUES (?,?,?,?,?,?,?,?,datetime('now'))`).run(
    id, appointment_id||null, patient_id, doc.id, diagnosis, JSON.stringify(medications||[]), instructions||'', follow_up_date||null
  );
  res.status(201).json({ id });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BILLING
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/billing', auth, (req, res) => {
  let query = `SELECT b.*, p.name as patient_name FROM billing b JOIN patients pt ON b.patient_id=pt.id JOIN users p ON pt.user_id=p.id WHERE 1=1`;
  const params = [];
  if (req.user.role === 'patient') {
    const pat = getPatient(req.user.id);
    query += ' AND b.patient_id=?'; params.push(pat?.id);
  }
  query += ' ORDER BY b.created_at DESC';
  res.json(db.prepare(query).all(...params).map(b => ({ ...b, items: JSON.parse(b.items||'[]') })));
});

app.post('/api/billing', auth, requireRole('admin'), (req, res) => {
  const { patient_id, amount, items, due_date } = req.body;
  const id = uuidv4();
  db.prepare(`INSERT INTO billing VALUES (?,?,NULL,?,?,?,?,NULL,datetime('now'))`).run(id, patient_id, amount, 'pending', JSON.stringify(items||[]), due_date||null);
  res.status(201).json({ id });
});

app.put('/api/billing/:id/pay', auth, requireRole('admin','patient'), (req, res) => {
  db.prepare("UPDATE billing SET status='paid', paid_at=datetime('now') WHERE id=?").run(req.params.id);
  res.json({ success: true });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INVENTORY
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/inventory', auth, requireRole('admin'), (req, res) => {
  const items = db.prepare('SELECT * FROM inventory ORDER BY category, name').all();
  res.json(items.map(i => ({ ...i, low: i.quantity <= i.min_level })));
});

app.post('/api/inventory', auth, requireRole('admin'), (req, res) => {
  const { name, category, quantity, unit, min_level, supplier, unit_cost } = req.body;
  const id = uuidv4();
  db.prepare(`INSERT INTO inventory VALUES (?,?,?,?,?,?,?,?,datetime('now'))`).run(id, name, category||'General', quantity||0, unit||'units', min_level||10, supplier||'', unit_cost||0);
  res.status(201).json({ id });
});

app.put('/api/inventory/:id', auth, requireRole('admin'), (req, res) => {
  const { quantity, min_level, unit_cost } = req.body;
  db.prepare("UPDATE inventory SET quantity=?, min_level=?, unit_cost=?, updated_at=datetime('now') WHERE id=?")
    .run(quantity, min_level, unit_cost, req.params.id);
  res.json({ success: true });
});

// ═══════════════════════════════════════════════════════════════════════════════
// MESSAGES
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/messages/:otherUserId', auth, (req, res) => {
  const msgs = db.prepare(`
    SELECT m.*, u.name as sender_name FROM messages m JOIN users u ON m.sender_id=u.id
    WHERE (m.sender_id=? AND m.receiver_id=?) OR (m.sender_id=? AND m.receiver_id=?)
    ORDER BY m.created_at
  `).all(req.user.id, req.params.otherUserId, req.params.otherUserId, req.user.id);
  db.prepare('UPDATE messages SET is_read=1 WHERE receiver_id=? AND sender_id=?').run(req.user.id, req.params.otherUserId);
  res.json(msgs);
});

app.post('/api/messages', auth, (req, res) => {
  const { receiver_id, content } = req.body;
  const id = uuidv4();
  db.prepare(`INSERT INTO messages VALUES (?,?,?,?,0,datetime('now'))`).run(id, req.user.id, receiver_id, content);
  res.status(201).json({ id });
});

// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/notifications', auth, (req, res) => {
  const notifs = db.prepare('SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 20').all(req.user.id);
  res.json(notifs);
});

app.put('/api/notifications/read-all', auth, (req, res) => {
  db.prepare('UPDATE notifications SET is_read=1 WHERE user_id=?').run(req.user.id);
  res.json({ success: true });
});

// ═══════════════════════════════════════════════════════════════════════════════
// REPORTS
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/reports/summary', auth, requireRole('admin'), (req, res) => {
  const monthly = db.prepare(`
    SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as appointments,
    (SELECT SUM(amount) FROM billing WHERE strftime('%Y-%m',created_at)=strftime('%Y-%m',a.created_at) AND status='paid') as revenue
    FROM appointments a GROUP BY month ORDER BY month DESC LIMIT 6
  `).all();
  const deptStats = db.prepare(`
    SELECT dc.department, COUNT(*) as count FROM appointments a
    JOIN doctors dc ON a.doctor_id=dc.id GROUP BY dc.department ORDER BY count DESC
  `).all();
  res.json({ monthly, deptStats });
});

// ─── CATCH-ALL → Serve frontend ──────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
});

// ─── START ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🏥 MediFlow Server running on http://localhost:${PORT}`);
  console.log(`📁 API available at http://localhost:${PORT}/api`);
});

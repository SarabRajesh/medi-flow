#!/bin/bash
echo "🏥 Starting MediFlow Hospital Management System..."
cd "$(dirname "$0")/backend"

if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies (first time setup)..."
  npm install
fi

echo "🚀 Server starting at http://localhost:3000"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Admin:   admin@mediflow.com    / admin123"
echo "  Doctor:  priya@mediflow.com    / doctor123"
echo "  Patient: patient@mediflow.com  / patient123"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
node server.js

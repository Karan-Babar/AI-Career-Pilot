# AI Career Pilot — Setup Guide

## Backend
cd backend
npm install
cp .env.example .env   # then fill in MONGO_URI, JWT_SECRET, GEMINI_API_KEY
npm run dev             # starts on http://localhost:5000

## Frontend
cd frontend
npm install
npm run dev             # starts on http://localhost:5173

Open http://localhost:5173, register an account, and you should land on the dashboard.

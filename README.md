# Student Notes Sharing Platform

A full-stack MERN application for students to upload, search, download, and bookmark study notes.

## Stack
- Frontend: React + Vite + plain CSS
- Backend: Node.js + Express
- Database: MongoDB with Mongoose
- Authentication: bcryptjs + JWT
- PDF uploads: Multer (local uploads folder in development)

## Features
- Register / login with hashed passwords and JWT authentication
- Browse and search notes by title, subject, and description
- Upload PDF notes with title, subject, and description
- Download PDFs
- Bookmark/unbookmark notes
- View your uploaded notes and delete your own notes
- Responsive interface

## Requirements
- Node.js 20+
- MongoDB local installation or MongoDB Atlas account

## Setup

### 1. Backend
Open a terminal in `server`:

```bash
npm install
```

Copy `.env.example` to `.env` and fill in the values:
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: long random secret
- `CLIENT_URL`: usually `http://localhost:5173`

Then run:

```bash
npm run dev
```

The API runs on `http://localhost:5000`.

### 2. Frontend
Open another terminal in `client`:

```bash
npm install
npm run dev
```

Open the Vite URL shown in the terminal (usually `http://localhost:5173`).

## Important
- Files are stored locally in `server/uploads` for local development. For a public production deployment, use object storage (for example, Cloudinary or S3) and configure persistent storage.
- Never commit `.env`, uploaded private files, or real secrets to GitHub.
- Before using publicly, add rate limiting, email verification/password reset, moderation/reporting, and production file storage.
- This is a starter project. Test the flows locally and understand the code before describing it as production-ready on a resume.

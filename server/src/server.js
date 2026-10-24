import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import authRoutes from "./routes/auth.js";
import noteRoutes from "./routes/notes.js";
import { errorHandler, notFound } from "./middleware/errors.js";

dotenv.config();
const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsPath = path.resolve(__dirname, "../uploads");

app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json({ limit: "1mb" }));
app.use("/uploads", express.static(uploadsPath));
app.get("/api/health", (_req, res) => res.json({ status: "ok", service: "student-notes-api" }));
app.use("/api/auth", authRoutes);
app.use("/api/notes", noteRoutes);
app.use(notFound);
app.use(errorHandler);

const port = process.env.PORT || 5000;
const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error("Missing MONGODB_URI. Create server/.env from .env.example.");
  process.exit(1);
}

mongoose.connect(uri)
  .then(() => {
    app.listen(port, () => console.log(`API listening on http://localhost:${port}`));
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  });

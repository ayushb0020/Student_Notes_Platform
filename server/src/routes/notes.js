import { Router } from "express";
import multer from "multer";
import path from "path";
import crypto from "crypto";
import fs from "fs";
import { fileURLToPath } from "url";
import Note from "../models/Note.js";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.resolve(__dirname, "../../uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`)
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const isPdf = file.mimetype === "application/pdf" && path.extname(file.originalname).toLowerCase() === ".pdf";
    cb(isPdf ? null : new Error("Only PDF files are allowed."), isPdf);
  }
});

function serialize(note, userId) {
  return {
    id: note._id,
    title: note.title,
    subject: note.subject,
    description: note.description,
    originalFileName: note.originalFileName,
    fileSize: note.fileSize,
    uploadedBy: note.uploadedBy?.name || "Student",
    uploadedById: note.uploadedBy?._id || note.uploadedBy,
    createdAt: note.createdAt,
    downloadUrl: `/api/notes/${note._id}/download`,
    isBookmarked: Boolean(userId && note._bookmarked)
  };
}

router.get("/", async (req, res, next) => {
  try {
    const { q = "", subject = "" } = req.query;
    const filter = {};
    if (subject && subject !== "All subjects") filter.subject = subject;
    if (q.trim()) {
      const escaped = q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped, "i");
      filter.$or = [{ title: regex }, { subject: regex }, { description: regex }];
    }
    const notes = await Note.find(filter).populate("uploadedBy", "name").sort({ createdAt: -1 }).limit(100);
    let bookmarkedIds = new Set();
    const token = req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.slice(7) : null;
    if (token) {
      try {
        const jwt = await import("jsonwebtoken");
        const payload = jwt.default.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(payload.userId).select("bookmarks");
        if (user) bookmarkedIds = new Set(user.bookmarks.map(String));
      } catch {}
    }
    res.json({ notes: notes.map(n => ({ ...serialize(n), isBookmarked: bookmarkedIds.has(String(n._id)) })) });
  } catch (err) { next(err); }
});

router.post("/", requireAuth, upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Please choose a PDF file." });
    const title = String(req.body.title || "").trim();
    const subject = String(req.body.subject || "").trim();
    const description = String(req.body.description || "").trim();
    if (!title || !subject) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: "Title and subject are required." });
    }
    const note = await Note.create({
      title, subject, description,
      originalFileName: path.basename(req.file.originalname),
      storedFileName: req.file.filename,
      fileSize: req.file.size,
      uploadedBy: req.user._id
    });
    const populated = await note.populate("uploadedBy", "name");
    res.status(201).json({ note: serialize(populated) });
  } catch (err) { next(err); }
});

router.get("/:id/download", async (req, res, next) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ message: "Note not found." });
    const filePath = path.join(uploadDir, path.basename(note.storedFileName));
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: "File is no longer available." });
    res.download(filePath, note.originalFileName);
  } catch (err) { next(err); }
});

router.post("/:id/bookmark", requireAuth, async (req, res, next) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ message: "Note not found." });
    const user = await User.findById(req.user._id);
    const id = String(note._id);
    const exists = user.bookmarks.some(b => String(b) === id);
    user.bookmarks = exists ? user.bookmarks.filter(b => String(b) !== id) : [...user.bookmarks, note._id];
    await user.save();
    res.json({ isBookmarked: !exists });
  } catch (err) { next(err); }
});

router.get("/mine/list", requireAuth, async (req, res, next) => {
  try {
    const notes = await Note.find({ uploadedBy: req.user._id }).populate("uploadedBy", "name").sort({ createdAt: -1 });
    res.json({ notes: notes.map(n => serialize(n)) });
  } catch (err) { next(err); }
});

router.get("/bookmarks/list", requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("bookmarks");
    const notes = await Note.find({ _id: { $in: user.bookmarks } }).populate("uploadedBy", "name").sort({ createdAt: -1 });
    res.json({ notes: notes.map(n => ({ ...serialize(n), isBookmarked: true })) });
  } catch (err) { next(err); }
});

router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ message: "Note not found." });
    if (String(note.uploadedBy) !== String(req.user._id)) return res.status(403).json({ message: "You can delete only your own uploads." });
    const filePath = path.join(uploadDir, path.basename(note.storedFileName));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await User.updateMany({ bookmarks: note._id }, { $pull: { bookmarks: note._id } });
    await note.deleteOne();
    res.json({ message: "Note deleted." });
  } catch (err) { next(err); }
});

export default router;

import mongoose from "mongoose";

const noteSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 120 },
  subject: { type: String, required: true, trim: true, maxlength: 60 },
  description: { type: String, trim: true, maxlength: 1000, default: "" },
  originalFileName: { type: String, required: true },
  storedFileName: { type: String, required: true },
  fileSize: { type: Number, required: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });

noteSchema.index({ title: "text", subject: "text", description: "text" });
export default mongoose.model("Note", noteSchema);

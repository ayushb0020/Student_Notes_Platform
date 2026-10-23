import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  bookmarks: [{ type: mongoose.Schema.Types.ObjectId, ref: "Note" }]
}, { timestamps: true });

export default mongoose.model("User", userSchema);

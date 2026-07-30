const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    linkedinUrl: {
      type: String,
      default: "",
    },
    // These will be populated by later modules (resume analysis, ATS, etc.)
    resumeText: { type: String, default: "" },
    atsScore: { type: Number, default: null },
    placementProbability: { type: Number, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);

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
    isAdmin: {
      type: Boolean,
      default: false,
    },
    // Raw extracted resume text
    resumeText: { type: String, default: "" },
    resumeFileName: { type: String, default: "" },

    // Structured fields parsed by Gemini from the resume
    parsedResume: {
      name: { type: String, default: "" },
      education: [{ type: String }],
      skills: [{ type: String }],
      projects: [{ type: String }],
      certifications: [{ type: String }],
      workExperience: [{ type: String }],
    },

    // Detailed ATS breakdown
    atsReport: {
      overallScore: { type: Number, default: null },
      formattingScore: { type: Number, default: null },
      keywordScore: { type: Number, default: null },
      sectionScore: { type: Number, default: null },
      readabilityScore: { type: Number, default: null },
      suggestions: [{ type: String }],
    },

    placementProbability: { type: Number, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);

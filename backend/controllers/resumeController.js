const User = require("../models/User");
const { extractTextFromFile } = require("../services/fileParser");
const { analyzeResume } = require("../services/atsAnalyzer");
const fs = require("fs");

// @route POST /api/resume/upload
// Uploads resume, extracts text, and generates ATS report using local rule-based logic
exports.uploadResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const resumeText = await extractTextFromFile(req.file.path, req.file.mimetype);

    if (!resumeText || resumeText.trim().length < 50) {
      return res.status(400).json({
        message: "Could not extract enough text from this file. Please upload a text-based PDF or DOCX.",
      });
    }

    const { parsedResume, atsReport } = analyzeResume(resumeText);

    const user = await User.findById(req.user.id);
    user.resumeText = resumeText;
    user.resumeFileName = req.file.originalname;
    user.parsedResume = parsedResume;
    user.atsReport = atsReport;
    await user.save();

    // Clean up the uploaded file from disk (we've already stored the extracted text)
    fs.unlink(req.file.path, () => {});

    res.status(200).json({
      message: "Resume analyzed successfully",
      parsedResume: user.parsedResume,
      atsReport: user.atsReport,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || "Failed to analyze resume" });
  }
};

// @route GET /api/resume/me
exports.getMyResumeAnalysis = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      "resumeFileName parsedResume atsReport"
    );
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
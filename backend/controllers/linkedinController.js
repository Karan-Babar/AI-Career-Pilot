const fs = require("fs");
const User = require("../models/User");
const { extractTextFromFile } = require("../services/fileParser");
const { analyzeLinkedIn } = require("../services/linkedinAnalyzer");

// @route POST /api/linkedin/analyze
// Accepts a PDF export of the user's LinkedIn profile (LinkedIn's own
// "Save to PDF" feature), extracts text, and scores it.
exports.analyzeLinkedInProfile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const linkedinText = await extractTextFromFile(req.file.path, req.file.mimetype);

    if (!linkedinText || linkedinText.trim().length < 50) {
      return res.status(400).json({
        message: "Could not extract enough text from this file. Make sure you uploaded a LinkedIn 'Save to PDF' export.",
      });
    }

    const user = await User.findById(req.user.id);
    const extraSkillsText = req.body.extraSkillsText || "";
    const extraAboutText = req.body.extraAboutText || "";
    const result = analyzeLinkedIn(linkedinText, user.resumeText || "", extraSkillsText, extraAboutText);

    user.linkedinReport = result;
    await user.save();

    fs.unlink(req.file.path, () => {});

    res.status(200).json(result);
  } catch (error) {
    console.error("LinkedIn analysis error:", error);
    res.status(500).json({ message: error.message || "Failed to analyze LinkedIn profile" });
  }
};

// @route GET /api/linkedin/me
exports.getMyLinkedInAnalysis = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("linkedinReport");
    res.status(200).json(user.linkedinReport || null);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

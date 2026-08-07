const User = require("../models/User");
const { recommendRoles, compareToJobDescription } = require("../services/jobMatchService");

// @route GET /api/job-match/recommendations
// Recommends best-fitting job roles based on the user's already-analyzed resume
exports.getRecommendations = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user.resumeText || user.resumeText.trim().length < 50) {
      return res.status(400).json({
        message: "Please upload and analyze your resume first (Resume & ATS page) before getting job recommendations.",
      });
    }

    const result = recommendRoles(user.resumeText, 5);
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || "Failed to generate job recommendations" });
  }
};

// @route POST /api/job-match/compare
// Compares the user's resume against a pasted job description
exports.compareJobDescription = async (req, res) => {
  try {
    const { jobDescription } = req.body;

    if (!jobDescription || jobDescription.trim().length < 30) {
      return res.status(400).json({ message: "Please paste a fuller job description (at least a few sentences)." });
    }

    const user = await User.findById(req.user.id);

    if (!user.resumeText || user.resumeText.trim().length < 50) {
      return res.status(400).json({
        message: "Please upload and analyze your resume first (Resume & ATS page) before comparing to a job description.",
      });
    }

    const result = compareToJobDescription(user.resumeText, jobDescription);
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || "Failed to compare resume to job description" });
  }
};
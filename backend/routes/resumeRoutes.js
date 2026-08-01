const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");
const { uploadResume, getMyResumeAnalysis } = require("../controllers/resumeController");

router.post("/upload", protect, upload.single("resume"), uploadResume);
router.get("/me", protect, getMyResumeAnalysis);

module.exports = router;

const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");
const { analyzeLinkedInProfile, getMyLinkedInAnalysis } = require("../controllers/linkedinController");

router.post("/analyze", protect, upload.single("linkedinPdf"), analyzeLinkedInProfile);
router.get("/me", protect, getMyLinkedInAnalysis);

module.exports = router;

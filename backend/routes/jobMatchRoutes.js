const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { getRecommendations, compareJobDescription } = require("../controllers/jobMatchController");

router.get("/recommendations", protect, getRecommendations);
router.post("/compare", protect, compareJobDescription);

module.exports = router;
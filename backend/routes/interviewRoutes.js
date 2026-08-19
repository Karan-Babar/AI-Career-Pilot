const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { getCategories, getQuestions } = require("../controllers/interviewController");

router.get("/categories", protect, getCategories);
router.get("/questions", protect, getQuestions);

module.exports = router;
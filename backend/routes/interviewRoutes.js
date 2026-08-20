const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { getCategories, getQuestions, scoreInterviewAnswer } = require("../controllers/interviewController");

router.get("/categories", protect, getCategories);
router.get("/questions", protect, getQuestions);
router.post("/score", protect, scoreInterviewAnswer);

module.exports = router;
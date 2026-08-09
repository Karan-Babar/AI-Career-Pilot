const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { adminOnly } = require("../middleware/adminMiddleware");
const { getStats, getStudents } = require("../controllers/adminController");

router.get("/stats", protect, adminOnly, getStats);
router.get("/students", protect, adminOnly, getStudents);

module.exports = router;
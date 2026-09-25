const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  getRoadmapRoles,
  getMyRoadmap,
  generateMyRoadmap,
  updateRoadmapTask,
} = require("../controllers/careerRoadmapController");

router.get("/roles", protect, getRoadmapRoles);
router.get("/me", protect, getMyRoadmap);
router.post("/generate", protect, generateMyRoadmap);
router.patch("/tasks/:taskId", protect, updateRoadmapTask);

module.exports = router;

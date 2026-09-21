const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { getPlacementProbability } = require("../controllers/placementController");

router.get("/probability", protect, getPlacementProbability);

module.exports = router;

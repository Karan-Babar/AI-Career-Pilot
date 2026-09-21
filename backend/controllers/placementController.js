const User = require("../models/User");
const { calculatePlacementProbability } = require("../services/placementService");

// @route GET /api/placement/probability
exports.getPlacementProbability = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const result = calculatePlacementProbability(user);

    if (result.error) {
      return res.status(400).json({ message: result.error });
    }

    // Store the latest computed probability on the user record too,
    // so the admin dashboard could surface it later if needed.
    user.placementProbability = result.probability;
    await user.save();

    res.status(200).json(result);
  } catch (error) {
    console.error("Placement probability error:", error);
    res.status(500).json({ message: error.message || "Failed to calculate placement probability" });
  }
};

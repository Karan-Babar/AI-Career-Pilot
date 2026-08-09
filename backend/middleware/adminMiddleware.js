const User = require("../models/User");

const adminOnly = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("isAdmin");
    if (!user || !user.isAdmin) {
      return res.status(403).json({ message: "Admin access only" });
    }
    next();
  } catch (error) {
    res.status(500).json({ message: "Failed to verify admin access" });
  }
};

module.exports = { adminOnly };
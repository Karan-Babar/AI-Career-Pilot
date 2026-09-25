const User = require("../models/User");
const {
  getRoleOptions,
  generateRoadmap,
  updateRoadmapTask,
} = require("../services/careerRoadmapService");

const ROADMAP_UPDATE_ATTEMPTS = 3;

function getRevisionFilter(revision) {
  const numericRevision = Number(revision);
  const currentRevision = Number.isFinite(numericRevision) ? numericRevision : 0;

  if (currentRevision === 0) {
    return {
      $or: [
        { "careerRoadmap.revision": 0 },
        { "careerRoadmap.revision": "0" },
        { "careerRoadmap.revision": { $exists: false } },
      ],
    };
  }

  return {
    $or: [
      { "careerRoadmap.revision": currentRevision },
      { "careerRoadmap.revision": String(currentRevision) },
    ],
  };
}

async function persistRoadmapTask(userId, taskId, completed) {
  let candidate = await User.findById(userId).select("careerRoadmap");
  if (!candidate) return { error: "User not found", status: 404 };

  for (let attempt = 0; attempt < ROADMAP_UPDATE_ATTEMPTS; attempt += 1) {
    const result = updateRoadmapTask(candidate.careerRoadmap, taskId, completed);
    if (result.error) return { error: result.error, status: 400 };

    const updatedUser = await User.findOneAndUpdate(
      { _id: userId, ...getRevisionFilter(candidate.careerRoadmap?.revision) },
      { $set: { careerRoadmap: result.roadmap } },
      { new: true }
    ).select("careerRoadmap");

    if (updatedUser) {
      return { roadmap: updatedUser.careerRoadmap };
    }

    const latest = await User.findById(userId).select("careerRoadmap");
    if (!latest) return { error: "User not found", status: 404 };
    candidate = latest;
  }

  // A final serialized fallback keeps a normal user click from surfacing a
  // spurious conflict after transient write contention.
  const fallbackResult = updateRoadmapTask(candidate.careerRoadmap, taskId, completed);
  if (fallbackResult.error) return { error: fallbackResult.error, status: 400 };

  candidate.careerRoadmap = fallbackResult.roadmap;
  candidate.markModified("careerRoadmap");
  await candidate.save();
  return { roadmap: candidate.careerRoadmap };
}

// @route GET /api/roadmap/roles
exports.getRoadmapRoles = (req, res) => {
  res.status(200).json({ roles: getRoleOptions() });
};

// @route GET /api/roadmap/me
exports.getMyRoadmap = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("careerRoadmap");
    res.status(200).json({ roadmap: user?.careerRoadmap || null });
  } catch (error) {
    console.error("Career roadmap load error:", error);
    res.status(500).json({ message: "Failed to load your career roadmap" });
  }
};

// @route POST /api/roadmap/generate
// Body: { targetRole, durationWeeks, hoursPerWeek }
exports.generateMyRoadmap = async (req, res) => {
  try {
    const { targetRole, durationWeeks, hoursPerWeek } = req.body || {};
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const result = generateRoadmap(user, { targetRole, durationWeeks, hoursPerWeek });
    if (result.error) {
      return res.status(400).json({ message: result.error });
    }

    user.careerRoadmap = result.roadmap;
    await user.save();
    res.status(200).json({ roadmap: result.roadmap });
  } catch (error) {
    console.error("Career roadmap generation error:", error);
    res.status(500).json({ message: "Failed to generate your career roadmap" });
  }
};

// @route PATCH /api/roadmap/tasks/:taskId
// Body: { completed }
exports.updateRoadmapTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { completed } = req.body || {};

    if (typeof taskId !== "string" || !taskId.trim()) {
      return res.status(400).json({ message: "Missing roadmap task id" });
    }
    if (typeof completed !== "boolean") {
      return res.status(400).json({ message: "Task completed must be true or false" });
    }

    const result = await persistRoadmapTask(req.user.id, taskId, completed);
    if (result.error) {
      return res.status(result.status || 400).json({ message: result.error });
    }

    res.status(200).json({ roadmap: result.roadmap });
  } catch (error) {
    console.error("Career roadmap task update error:", error);
    res.status(500).json({ message: "Failed to update your roadmap task" });
  }
};

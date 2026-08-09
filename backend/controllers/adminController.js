const User = require("../models/User");

// @route GET /api/admin/stats
// Aggregate placement-readiness stats across all registered students
exports.getStats = async (req, res) => {
  try {
    const users = await User.find().select(
      "name email atsReport parsedResume createdAt isAdmin"
    );

    const students = users.filter((u) => !u.isAdmin);
    const analyzed = students.filter((u) => u.atsReport?.overallScore != null);

    const avg = (arr) => (arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0);

    const avgOverall = avg(analyzed.map((u) => u.atsReport.overallScore));
    const avgFormatting = avg(analyzed.map((u) => u.atsReport.formattingScore));
    const avgKeyword = avg(analyzed.map((u) => u.atsReport.keywordScore));
    const avgSection = avg(analyzed.map((u) => u.atsReport.sectionScore));
    const avgReadability = avg(analyzed.map((u) => u.atsReport.readabilityScore));

    const buckets = { "0-40": 0, "40-60": 0, "60-80": 0, "80-100": 0 };
    analyzed.forEach((u) => {
      const s = u.atsReport.overallScore;
      if (s < 40) buckets["0-40"]++;
      else if (s < 60) buckets["40-60"]++;
      else if (s < 80) buckets["60-80"]++;
      else buckets["80-100"]++;
    });

    const skillCounts = {};
    students.forEach((u) => {
      (u.parsedResume?.skills || []).forEach((skill) => {
        skillCounts[skill] = (skillCounts[skill] || 0) + 1;
      });
    });
    const topSkills = Object.entries(skillCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([skill, count]) => ({ skill, count }));

    res.status(200).json({
      totalStudents: students.length,
      analyzedCount: analyzed.length,
      notAnalyzedCount: students.length - analyzed.length,
      avgScores: {
        overall: avgOverall,
        formatting: avgFormatting,
        keyword: avgKeyword,
        section: avgSection,
        readability: avgReadability,
      },
      scoreDistribution: buckets,
      topSkills,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || "Failed to load admin stats" });
  }
};

// @route GET /api/admin/students
// List all students with their key placement-readiness fields, for a table view
exports.getStudents = async (req, res) => {
  try {
    const users = await User.find({ isAdmin: { $ne: true } })
      .select("name email atsReport resumeFileName createdAt")
      .sort({ createdAt: -1 });

    const students = users.map((u) => ({
      id: u._id,
      name: u.name,
      email: u.email,
      overallScore: u.atsReport?.overallScore ?? null,
      hasResume: !!u.resumeFileName,
      joinedAt: u.createdAt,
    }));

    res.status(200).json({ students });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || "Failed to load student list" });
  }
};
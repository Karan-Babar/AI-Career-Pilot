const { recommendRoles } = require("./jobMatchService");

/**
 * Computes an overall placement-readiness probability from whatever module
 * data the user has completed so far. Weights renormalize automatically when
 * optional modules (Job Matching, LinkedIn) haven't been run yet, so a user
 * can get a meaningful estimate as soon as their resume is analyzed, and a
 * more complete one as they finish more modules.
 */
function calculatePlacementProbability(user) {
  if (!user.resumeText || user.atsReport?.overallScore == null) {
    return { error: "Please analyze your resume first (Resume & ATS page) before checking placement probability." };
  }

  const atsScore = user.atsReport.overallScore;

  let jobMatchTopPercent = null;
  let topRole = null;
  try {
    const { recommendations } = recommendRoles(user.resumeText, 1);
    if (recommendations && recommendations.length > 0) {
      jobMatchTopPercent = recommendations[0].matchPercent;
      topRole = recommendations[0].role;
    }
  } catch (e) {
    // job match dataset unavailable — skip this component
  }

  const linkedinScore = user.linkedinReport?.overallScore ?? null;

  const skills = user.parsedResume?.skills?.length || 0;
  const projects = user.parsedResume?.projects?.length || 0;
  const certifications = user.parsedResume?.certifications?.length || 0;
  const breadthScore = Math.min(100, skills * 4 + projects * 15 + certifications * 10);

  const components = [
    { key: "ats", label: "Resume / ATS Quality", score: atsScore, weight: 35 },
    { key: "breadth", label: "Profile Breadth", score: breadthScore, weight: 20 },
  ];
  if (jobMatchTopPercent != null) {
    components.push({ key: "jobMatch", label: "Job-Role Fit", score: jobMatchTopPercent, weight: 25 });
  }
  if (linkedinScore != null) {
    components.push({ key: "linkedin", label: "LinkedIn Presence", score: linkedinScore, weight: 20 });
  }

  const totalWeight = components.reduce((s, c) => s + c.weight, 0);
  const probability = Math.round(
    components.reduce((s, c) => s + c.score * c.weight, 0) / totalWeight
  );

  let readiness;
  if (probability >= 75) readiness = "High";
  else if (probability >= 50) readiness = "Moderate";
  else readiness = "Needs Improvement";

  const missingModules = [];
  if (jobMatchTopPercent == null) missingModules.push("Job Matching");
  if (linkedinScore == null) missingModules.push("LinkedIn Analysis");

  const suggestions = [];
  if (atsScore < 70) suggestions.push("Improve your ATS score — check the Resume & ATS page for specific formatting and keyword suggestions.");
  if (breadthScore < 60) suggestions.push("Add more projects, skills, or certifications to your resume to strengthen your overall profile.");
  if (jobMatchTopPercent != null && jobMatchTopPercent < 50 && topRole) {
    suggestions.push(`Your best-matched role (${topRole}) is only a ${jobMatchTopPercent}% skill match — check the Job Matching page for exactly which skills to add.`);
  }
  if (linkedinScore != null && linkedinScore < 60) suggestions.push("Strengthen your LinkedIn profile — check the LinkedIn Analysis page for specific gaps.");
  if (missingModules.length > 0) suggestions.push(`Complete ${missingModules.join(" and ")} for a more accurate, complete probability score.`);
  if (suggestions.length === 0) suggestions.push("Strong, well-rounded profile across the board — keep it up.");

  return {
    probability,
    readiness,
    components,
    missingModules,
    topRole,
    suggestions: suggestions.slice(0, 4),
  };
}

module.exports = { calculatePlacementProbability };

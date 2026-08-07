const fs = require("fs");
const path = require("path");

const JOB_ROLES = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "data", "jobRoles.json"), "utf-8")
);

// Build one master vocabulary of every skill string that appears across all roles.
// Longer phrases are checked first so multi-word skills (e.g. "Machine Learning")
// aren't shadowed by shorter substrings (e.g. "Machine").
const VOCABULARY = Array.from(
  new Set(JOB_ROLES.flatMap((r) => r.skills))
).sort((a, b) => b.length - a.length);

function extractSkillsFromText(text) {
  const lowerText = text.toLowerCase();
  const found = new Set();

  for (const skill of VOCABULARY) {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    let matched;
    if (/^[a-z0-9\s.#+]+$/i.test(skill)) {
      const regex = new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`, "i");
      matched = regex.test(lowerText);
    } else {
      matched = lowerText.includes(skill.toLowerCase());
    }
    if (matched) found.add(skill);
  }

  return Array.from(found);
}

function scoreOverlap(candidateSkills, targetSkills) {
  const candidateLower = new Set(candidateSkills.map((s) => s.toLowerCase()));
  const targetLower = targetSkills.map((s) => s.toLowerCase());

  const matched = [];
  const missing = [];

  targetSkills.forEach((skill, i) => {
    if (candidateLower.has(targetLower[i])) {
      matched.push(skill);
    } else {
      missing.push(skill);
    }
  });

  const coverage = targetSkills.length > 0 ? matched.length / targetSkills.length : 0;
  return { matched, missing, coverage };
}

/**
 * Given a resume's text, recommend the best-fitting job roles from the dataset.
 */
function recommendRoles(resumeText, topN = 5) {
  const resumeSkills = extractSkillsFromText(resumeText);

  const scored = JOB_ROLES.map((role) => {
    const { matched, missing, coverage } = scoreOverlap(resumeSkills, role.skills);
    return {
      role: role.role,
      matchPercent: Math.round(coverage * 100),
      matchedSkills: matched,
      missingSkills: missing.slice(0, 10),
      totalRoleSkills: role.skills.length,
    };
  });

  scored.sort((a, b) => b.matchPercent - a.matchPercent);

  return {
    resumeSkillsDetected: resumeSkills,
    recommendations: scored.slice(0, topN),
  };
}

/**
 * Compare a resume against a specific pasted job description.
 */
function compareToJobDescription(resumeText, jobDescriptionText) {
  const resumeSkills = extractSkillsFromText(resumeText);
  const jdSkills = extractSkillsFromText(jobDescriptionText);

  const { matched, missing, coverage } = scoreOverlap(resumeSkills, jdSkills);

  // Detect which role category this JD most closely resembles
  let closestRole = null;
  let bestScore = -1;
  for (const role of JOB_ROLES) {
    const { coverage: roleCoverage } = scoreOverlap(jdSkills, role.skills);
    if (roleCoverage > bestScore) {
      bestScore = roleCoverage;
      closestRole = role.role;
    }
  }

  return {
    matchPercent: Math.round(coverage * 100),
    matchedSkills: matched,
    missingSkills: missing,
    jdSkillsDetected: jdSkills,
    resumeSkillsDetected: resumeSkills,
    closestRoleCategory: jdSkills.length > 0 ? closestRole : null,
  };
}

module.exports = { recommendRoles, compareToJobDescription, JOB_ROLES };
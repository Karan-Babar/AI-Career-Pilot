const { recommendRoles } = require("./jobMatchService");

// Same broad skill vocabulary style as the ATS analyzer, kept local to this
// file so this module has no dependency on atsAnalyzer.js internals.
const SKILL_KEYWORDS = [
  "javascript", "typescript", "python", "java", "c++", "c#", "react", "node.js", "nodejs",
  "express", "mongodb", "mysql", "postgresql", "sql", "html", "css", "tailwind", "bootstrap",
  "redux", "next.js", "django", "flask", "spring boot", "rest api", "graphql", "docker",
  "kubernetes", "aws", "azure", "gcp", "git", "github", "linux", "machine learning",
  "deep learning", "nlp", "natural language processing", "tensorflow", "pytorch", "pandas",
  "numpy", "scikit-learn", "data structures", "algorithms", "oop", "dbms", "operating systems",
  "computer networks", "firebase", "figma", "postman", "jira", "agile", "scrum", "ci/cd",
  "jenkins", "android", "flutter", "kotlin", "swift", "php", "laravel", "ruby", "go", "rust",
  "power bi", "tableau", "excel", "communication", "leadership", "teamwork", "problem solving",
];

const ACTION_VERBS = [
  "developed", "designed", "implemented", "built", "created", "led", "managed", "improved",
  "optimized", "automated", "deployed", "engineered", "analyzed", "collaborated", "integrated",
  "reduced", "increased", "achieved", "delivered", "launched",
];

const EXPECTED_SECTIONS = ["about", "experience", "education", "skills", "certifications"];

// LinkedIn's PDF export uses different header wording depending on account
// region/version — e.g. "Summary" instead of "About" is common. Each canonical
// section maps to every label variant we should treat as equivalent.
const SECTION_ALIASES = {
  about: ["about", "summary"],
  experience: ["experience"],
  education: ["education"],
  skills: ["skills", "skills & endorsements"],
  certifications: ["licenses & certifications", "licenses and certifications", "certifications"],
};

function isHeaderLine(line, aliasKey) {
  const aliases = SECTION_ALIASES[aliasKey];
  return aliases.includes(line.trim().toLowerCase());
}

function findHeaderLineIndex(lines, aliasKey) {
  return lines.findIndex((l) => isHeaderLine(l, aliasKey));
}

const DISPLAY_OVERRIDES = {
  "html": "HTML", "css": "CSS", "sql": "SQL", "aws": "AWS", "gcp": "GCP",
  "nlp": "NLP", "oop": "OOP", "dbms": "DBMS", "mongodb": "MongoDB",
  "mysql": "MySQL", "postgresql": "PostgreSQL", "php": "PHP",
  "rest api": "REST API", "ci/cd": "CI/CD", "power bi": "Power BI",
  "node.js": "Node.js", "next.js": "Next.js", "nodejs": "Node.js",
  "javascript": "JavaScript", "typescript": "TypeScript",
};

function displayName(skill) {
  const lower = skill.toLowerCase();
  return DISPLAY_OVERRIDES[lower] || (skill.charAt(0).toUpperCase() + skill.slice(1));
}

function extractSkills(text) {
  const lowerText = text.toLowerCase();
  return SKILL_KEYWORDS.filter((skill) => {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (/^[a-z0-9\s.]+$/i.test(skill)) {
      const regex = new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`, "i");
      return regex.test(lowerText);
    }
    return lowerText.includes(skill);
  }).map(displayName);
}

// Grabs the text between one section (by alias key, e.g. "about") and whichever
// of the "stop" sections (also alias keys) appears next.
function extractSection(text, startKey, stopKeys) {
  const lines = text.split(/\r?\n/);
  const startIdx = findHeaderLineIndex(lines, startKey);
  if (startIdx === -1) return "";

  let endIdx = lines.length;
  for (let i = startIdx + 1; i < lines.length; i++) {
    if (stopKeys.some((key) => isHeaderLine(lines[i], key))) {
      endIdx = i;
      break;
    }
  }
  return lines.slice(startIdx + 1, endIdx).join(" ").trim();
}

function findSectionsPresent(text) {
  const lines = text.split(/\r?\n/);
  return EXPECTED_SECTIONS.filter((key) => findHeaderLineIndex(lines, key) !== -1);
}

/**
 * Analyzes a LinkedIn profile exported via LinkedIn's own "Save to PDF" feature.
 * LinkedIn's PDF export is known to sometimes omit or truncate the full Skills
 * list and About section, so extraSkillsText/extraAboutText let the user paste
 * those directly from their profile page to fill any gaps, merged with whatever
 * the PDF itself captured.
 */
function analyzeLinkedIn(linkedinText, resumeText, extraSkillsText = "", extraAboutText = "") {
  const text = linkedinText.replace(/\u0000/g, "");
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  const foundSections = findSectionsPresent(text);
  if (extraSkillsText.trim().length > 5 && !foundSections.includes("skills")) foundSections.push("skills");
  if (extraAboutText.trim().length > 5 && !foundSections.includes("about")) foundSections.push("about");

  const lineList = lines;
  const aboutIdx = findHeaderLineIndex(lineList, "about");
  const topBlock = aboutIdx > 0 ? lineList.slice(1, aboutIdx) : lineList.slice(1, 4);
  const headlineText = topBlock.join(" ").trim();

  const pdfAboutText = extractSection(text, "about", ["experience", "education", "skills", "certifications"]);
  const experienceText = extractSection(text, "experience", ["education", "skills", "certifications"]);
  const pdfSkillsSectionText = extractSection(text, "skills", ["certifications"]);

  // Merge PDF-extracted content with any manually pasted supplementary text,
  // so a PDF export that's missing/truncated these sections doesn't tank the score.
  const aboutText = `${pdfAboutText} ${extraAboutText}`.trim();
  const skillsSourceText = `${pdfSkillsSectionText} ${extraSkillsText}`.trim();

  const linkedinSkills = extractSkills(
    skillsSourceText.length > 10 ? skillsSourceText : `${text} ${extraSkillsText}`
  );

  // ---------------- Headline Score ----------------
  const headlineWordCount = headlineText.split(/\s+/).filter(Boolean).length;
  const headlineHasSkill = extractSkills(headlineText).length > 0;
  let headlineScore = 0;
  if (headlineWordCount >= 4) headlineScore += 50;
  if (headlineWordCount >= 8) headlineScore += 20;
  if (headlineHasSkill) headlineScore += 30;
  headlineScore = Math.min(100, headlineScore);

  // ---------------- About Score ----------------
  const aboutWordCount = aboutText.split(/\s+/).filter(Boolean).length;
  const aboutSkillCount = extractSkills(aboutText).length;
  let aboutScore = 0;
  if (aboutWordCount >= 30) aboutScore += 30;
  if (aboutWordCount >= 80) aboutScore += 25;
  aboutScore += Math.min(45, aboutSkillCount * 9);
  aboutScore = Math.min(100, aboutScore);

  // ---------------- Skills Score ----------------
  const skillsScore = Math.min(100, linkedinSkills.length * 8);

  // ---------------- Experience Score ----------------
  const experienceWordCount = experienceText.split(/\s+/).filter(Boolean).length;
  const experienceActionVerbs = ACTION_VERBS.filter((v) => experienceText.toLowerCase().includes(v)).length;
  const experienceHasNumbers = /\d/.test(experienceText);
  let experienceScore = 0;
  if (experienceWordCount >= 20) experienceScore += 35;
  experienceScore += Math.min(35, experienceActionVerbs * 10);
  if (experienceHasNumbers) experienceScore += 30;
  experienceScore = Math.min(100, experienceScore);

  // ---------------- Completeness Score ----------------
  const completenessScore = Math.round((foundSections.length / EXPECTED_SECTIONS.length) * 100);

  const overallScore = Math.round(
    headlineScore * 0.2 + aboutScore * 0.25 + skillsScore * 0.2 + experienceScore * 0.2 + completenessScore * 0.15
  );

  // ---------------- Cross-reference with resume + job match ----------------
  let visibilityGap = [];
  let topRoleInsight = null;

  if (resumeText && resumeText.trim().length > 50) {
    const resumeSkills = extractSkills(resumeText);
    const linkedinLower = linkedinSkills.map((s) => s.toLowerCase());
    visibilityGap = resumeSkills.filter((s) => !linkedinLower.includes(s.toLowerCase()));

    try {
      const { recommendations } = recommendRoles(resumeText, 1);
      if (recommendations && recommendations.length > 0) {
        const topRole = recommendations[0];
        const missingForRole = topRole.matchedSkills.filter(
          (s) => !linkedinLower.includes(s.toLowerCase())
        );
        topRoleInsight = { role: topRole.role, missingSkills: missingForRole.slice(0, 5) };
      }
    } catch (e) {
      // job match dataset unavailable — skip this insight silently
    }
  }

  // ---------------- Suggestions ----------------
  const suggestions = [];
  if (headlineScore < 70) suggestions.push("Strengthen your headline — go beyond a job title alone and include 2-3 key skills or your specialization (e.g. \"Backend Developer | Node.js, MongoDB, REST APIs\").");
  if (aboutScore < 60) suggestions.push("Expand your About section — aim for at least 80 words summarizing your background, key skills, and what you're looking for.");
  if (!foundSections.includes("certifications")) suggestions.push("Add any certifications you have — even free ones (AWS, Coursera, etc.) improve recruiter search visibility.");
  if (experienceScore < 60) suggestions.push("In your Experience/Projects entries, use action verbs (e.g. \"developed\", \"optimized\") and include measurable results where possible.");
  if (visibilityGap.length > 0) suggestions.push(`Your resume lists ${visibilityGap.slice(0, 4).join(", ")}, but these don't appear on your LinkedIn — recruiters searching those exact terms won't find your profile.`);
  if (suggestions.length === 0) suggestions.push("Strong, well-rounded profile — keep it updated as you gain new skills and projects.");

  return {
    overallScore,
    headlineScore,
    aboutScore,
    skillsScore,
    experienceScore,
    completenessScore,
    linkedinSkills,
    foundSections,
    visibilityGap: visibilityGap.slice(0, 8),
    topRoleInsight,
    suggestions: suggestions.slice(0, 5),
  };
}

module.exports = { analyzeLinkedIn };

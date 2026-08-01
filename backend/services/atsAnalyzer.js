// ---------------------------------------------------------------------------
// Rule-based Resume Parser + ATS Scorer (no external AI API required)
// ---------------------------------------------------------------------------

const SECTION_HEADERS = {
  education: ["education", "academic background", "academic qualification"],
  skills: ["skills", "technical skills", "key skills", "core competencies"],
  experience: ["experience", "work experience", "professional experience", "internship", "internships"],
  projects: ["projects", "academic projects", "personal projects"],
  certifications: ["certifications", "certificates", "licenses"],
};

// A broad dictionary of common technical / employability skills to match against.
// Extend this list any time to improve detection accuracy.
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

function countSyllables(word) {
  word = word.toLowerCase().replace(/[^a-z]/g, "");
  if (word.length <= 3) return 1;
  const matches = word.match(/[aeiouy]{1,2}/g);
  return matches ? matches.length : 1;
}

function getFleschReadingEase(text) {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 3);
  const words = text.split(/\s+/).filter((w) => w.trim().length > 0);
  if (sentences.length === 0 || words.length === 0) return 50;

  const syllableCount = words.reduce((sum, w) => sum + countSyllables(w), 0);
  const score =
    206.835 - 1.015 * (words.length / sentences.length) - 84.6 * (syllableCount / words.length);

  // Clamp between 0-100 for our scoring purposes
  return Math.max(0, Math.min(100, Math.round(score)));
}

function extractSections(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const sections = {};
  let currentSection = "summary";
  sections[currentSection] = [];

  for (const line of lines) {
    const lower = line.toLowerCase().replace(/[:\-–]/g, "").trim();
    let matchedSection = null;

    for (const [key, headers] of Object.entries(SECTION_HEADERS)) {
      if (headers.some((h) => lower === h || (lower.length < 40 && lower.startsWith(h)))) {
        matchedSection = key;
        break;
      }
    }

    if (matchedSection) {
      currentSection = matchedSection;
      if (!sections[currentSection]) sections[currentSection] = [];
    } else {
      sections[currentSection].push(line);
    }
  }

  return sections;
}

function extractSkills(text) {
  const lowerText = text.toLowerCase();
  return SKILL_KEYWORDS.filter((skill) => {
    // Escape regex special chars (skills like "c++", "c#" contain them)
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Use word boundaries for alphabetic-only skills; fall back to includes() for symbol-containing ones (c++, c#)
    if (/^[a-z0-9\s.]+$/i.test(skill)) {
      const regex = new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`, "i");
      return regex.test(lowerText);
    }
    return lowerText.includes(skill);
  }).map((s) => s.charAt(0).toUpperCase() + s.slice(1));
}

function extractEmail(text) {
  const match = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return match ? match[0] : null;
}

function extractPhone(text) {
  const match = text.match(/(\+?\d{1,3}[-.\s]?)?\d{10}/);
  return match ? match[0] : null;
}

function analyzeResume(resumeText) {
  const text = resumeText.replace(/\u0000/g, "");
  const sections = extractSections(text);
  const skills = extractSkills(text);
  const email = extractEmail(text);
  const phone = extractPhone(text);

  const parsedResume = {
    name: text.split(/\r?\n/)[0]?.trim().slice(0, 60) || "",
    education: sections.education || [],
    skills,
    projects: sections.projects || [],
    certifications: sections.certifications || [],
    workExperience: sections.experience || [],
  };

  // ---------------- Section Score ----------------
  const expectedSections = ["education", "skills", "experience", "projects"];
  const foundSections = expectedSections.filter((s) => sections[s] && sections[s].length > 0);
  const sectionScore = Math.round((foundSections.length / expectedSections.length) * 100);

  // ---------------- Keyword Score ----------------
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const lowerText = text.toLowerCase();
  const actionVerbHits = ACTION_VERBS.filter((v) => lowerText.includes(v)).length;
  const skillDensity = skills.length; // raw count of distinct matched skills

  // Reward both a healthy number of distinct skills and use of strong action verbs
  let keywordScore = Math.min(100, skillDensity * 6 + actionVerbHits * 4);
  keywordScore = Math.round(keywordScore);

  // ---------------- Formatting Score ----------------
  const hasBullets = /[•\-\*]\s/.test(text);
  const hasEmail = !!email;
  const hasPhone = !!phone;
  const reasonableLength = wordCount >= 200 && wordCount <= 1200;

  let formattingScore = 0;
  if (hasBullets) formattingScore += 30;
  if (hasEmail) formattingScore += 25;
  if (hasPhone) formattingScore += 20;
  if (reasonableLength) formattingScore += 25;
  formattingScore = Math.min(100, formattingScore);

  // ---------------- Readability Score ----------------
  const fleschScore = getFleschReadingEase(text);
  // Resumes read best around 50-70 Flesch (fairly easy, professional). Map to 0-100 usefulness.
  let readabilityScore;
  if (fleschScore >= 40 && fleschScore <= 80) {
    readabilityScore = 100;
  } else if (fleschScore < 40) {
    readabilityScore = Math.max(0, Math.round((fleschScore / 40) * 100));
  } else {
    readabilityScore = Math.max(0, 100 - (fleschScore - 80));
  }

  // ---------------- Overall Score ----------------
  const overallScore = Math.round(
    sectionScore * 0.3 + keywordScore * 0.3 + formattingScore * 0.25 + readabilityScore * 0.15
  );

  // ---------------- Suggestions ----------------
  const suggestions = [];
  if (!foundSections.includes("skills")) suggestions.push("Add a clearly labeled 'Skills' section listing your technical and soft skills.");
  if (!foundSections.includes("projects")) suggestions.push("Include a 'Projects' section — ATS systems and recruiters weigh hands-on project experience heavily.");
  if (!foundSections.includes("experience")) suggestions.push("Add a 'Work Experience' or 'Internships' section, even if it's short-term or academic.");
  if (!hasEmail) suggestions.push("Add a professional email address near the top of your resume.");
  if (!hasPhone) suggestions.push("Add a phone number so recruiters can contact you directly.");
  if (!hasBullets) suggestions.push("Use bullet points (•) instead of long paragraphs to describe your experience and projects.");
  if (skillDensity < 8) suggestions.push("List more relevant technical skills and tools you've used — aim for 10-15 specific keywords.");
  if (actionVerbHits < 4) suggestions.push("Start bullet points with strong action verbs like 'Developed', 'Implemented', or 'Optimized' instead of passive phrasing.");
  if (!reasonableLength) suggestions.push(wordCount < 200 ? "Your resume looks too short — add more detail about projects and skills." : "Your resume looks long — trim it to 1-2 pages of the most relevant content.");
  if (suggestions.length === 0) suggestions.push("Your resume covers the key ATS fundamentals well. Consider quantifying achievements with numbers (e.g. 'reduced load time by 30%') for extra impact.");

  const atsReport = {
    overallScore,
    formattingScore,
    keywordScore,
    sectionScore,
    readabilityScore,
    suggestions: suggestions.slice(0, 6),
  };

  return { parsedResume, atsReport };
}

module.exports = { analyzeResume };
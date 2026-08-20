const fs = require("fs");
const path = require("path");

const JOB_ROLES = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "data", "jobRoles.json"), "utf-8")
);

// Shared vocabulary for behavioral/HR answers, since there's no skills list to draw from
const STAR_SIGNALS = [
  "situation", "task", "action", "result", "outcome", "learned", "responsible",
  "decided", "challenge", "team", "deadline", "conflict", "resolved", "led",
  "improved", "achieved", "delivered", "collaborated", "prioritized", "communicated",
];

const OWNERSHIP_VERBS = [
  "built", "led", "designed", "implemented", "managed", "created", "developed",
  "decided", "fixed", "solved", "wrote", "debugged", "optimized", "presented",
  "coordinated", "resolved", "delivered", "achieved", "reduced", "improved",
  "increased", "organized", "initiated", "analyzed", "researched",
];

function getRelevanceVocab(category) {
  if (category === "HR & Behavioral") return STAR_SIGNALS;
  const role = JOB_ROLES.find((r) => r.role === category);
  return role ? role.skills.map((s) => s.toLowerCase()) : [];
}

function scoreAnswer(category, answerText) {
  const text = (answerText || "").trim();
  const lower = text.toLowerCase();
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  // --- Depth: does the answer have enough substance? ---
  let depthScore;
  if (wordCount < 15) depthScore = 20;
  else if (wordCount < 40) depthScore = 55;
  else if (wordCount < 80) depthScore = 85;
  else depthScore = 100;

  // --- Specificity: numbers, personal ownership language ---
  let specificityScore = 0;
  if (/\d/.test(text)) specificityScore += 45;
  const ownershipHits = OWNERSHIP_VERBS.filter(
    (v) => lower.includes(" " + v) || lower.startsWith(v)
  );
  if (ownershipHits.length > 0) specificityScore += 40;
  if (/\bi\b/.test(lower)) specificityScore += 15;
  specificityScore = Math.min(100, specificityScore);

  // --- Relevance: role-specific skills, or STAR-structure signals for HR ---
  const vocab = getRelevanceVocab(category);
  const matchedTerms = vocab.filter((term) => {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`, "i");
    return regex.test(lower);
  });
  const relevanceScore = Math.min(100, Math.round((matchedTerms.length / 4) * 100));

  const overallScore = Math.round(
    depthScore * 0.3 + specificityScore * 0.3 + relevanceScore * 0.4
  );

  // --- Suggestions based on the weakest dimension(s) ---
  const suggestions = [];
  if (depthScore < 60) {
    suggestions.push("Your answer looks brief. Add more context, and walk through your reasoning or approach in a bit more detail.");
  }
  if (specificityScore < 60) {
    if (!/\d/.test(text)) {
      suggestions.push("Try including a concrete detail — a number, metric, or measurable result (e.g. \"reduced load time by 30%\").");
    }
    if (ownershipHits.length === 0) {
      suggestions.push("Use first-person, ownership language (\"I designed\", \"I led\", \"I implemented\") rather than describing things in general terms.");
    }
  }
  if (relevanceScore < 50) {
    if (category === "HR & Behavioral") {
      suggestions.push("Structure your answer using STAR: clearly state the Situation, Task, Action you personally took, and the Result.");
    } else {
      const unusedSample = vocab.filter((v) => !matchedTerms.includes(v)).slice(0, 5);
      if (unusedSample.length > 0) {
        suggestions.push(
          `Consider mentioning relevant terms/tools like: ${unusedSample.join(", ")}.`
        );
      }
    }
  }
  if (suggestions.length === 0) {
    suggestions.push("Solid answer — specific, detailed, and relevant. Nice work.");
  }

  return {
    overallScore,
    depthScore,
    specificityScore,
    relevanceScore,
    wordCount,
    matchedTerms,
    suggestions: suggestions.slice(0, 3),
  };
}

module.exports = { scoreAnswer };
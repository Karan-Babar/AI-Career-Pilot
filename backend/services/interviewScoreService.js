const fs = require("fs");
const path = require("path");

const QUESTION_BANK = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "data", "interviewQuestions.json"), "utf-8")
);

// Flatten into a lookup by question id, so scoring can find the right
// keyword set regardless of which category the question belongs to.
const QUESTIONS_BY_ID = {};
QUESTION_BANK.forEach((cat) => {
  cat.questions.forEach((q) => {
    QUESTIONS_BY_ID[q.id] = q;
  });
});

const OWNERSHIP_VERBS = [
  "built", "led", "designed", "implemented", "managed", "created", "developed",
  "decided", "fixed", "solved", "wrote", "debugged", "optimized", "presented",
  "coordinated", "resolved", "delivered", "achieved", "reduced", "improved",
  "increased", "organized", "initiated", "analyzed", "researched", "used",
];

function matchKeyword(lowerText, keyword) {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`, "i");
  return regex.test(lowerText);
}

/**
 * Scores a free-text answer against ONE specific question's own keyword set.
 * Calibrated so that:
 *   - a weak/vague answer lands roughly in the 30-50 range
 *   - a reasonably good answer lands roughly in the 50-70 range
 *   - a strong, detailed, on-topic answer lands roughly in the 70-90 range
 * The score never exceeds 90, leaving room for improvement on every answer.
 */
function scoreAnswer(questionId, answerText) {
  const question = QUESTIONS_BY_ID[questionId];
  if (!question) {
    throw new Error(`Unknown question id: ${questionId}`);
  }

  const text = (answerText || "").trim();
  const lower = text.toLowerCase();
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  const keywords = question.keywords || [];
  const matchedKeywords = keywords.filter((kw) => matchKeyword(lower, kw));
  const keywordCoverage = keywords.length > 0 ? matchedKeywords.length / keywords.length : 0;

  // Depth bonus: rewards answers with enough substance to actually explain something
  let depthBonus;
  if (wordCount < 10) depthBonus = 0;
  else if (wordCount < 25) depthBonus = 5;
  else if (wordCount < 50) depthBonus = 9;
  else depthBonus = 12;

  // Specificity bonus: numeric detail + first-person ownership language
  const hasNumber = /\d/.test(text);
  const ownershipHits = OWNERSHIP_VERBS.filter(
    (v) => lower.includes(" " + v) || lower.startsWith(v)
  );
  const specificityBonus = (hasNumber ? 4 : 0) + (ownershipHits.length > 0 ? 4 : 0);

  // Base of 30 represents "you attempted a real answer"; the rest is earned.
  const rawScore = 30 + keywordCoverage * 40 + depthBonus + specificityBonus;
  const overallScore = Math.min(90, Math.round(rawScore));

  // Individual dimension scores (0-100) shown on the gauges in the UI
  const relevanceScore = Math.round(keywordCoverage * 100);
  const depthScore = Math.round((depthBonus / 12) * 100);
  const specificityScore = Math.round((specificityBonus / 8) * 100);

  const suggestions = buildSuggestions({
    wordCount,
    hasNumber,
    ownershipHits,
    matchedKeywords,
    keywords,
    overallScore,
  });

  return {
    overallScore,
    depthScore,
    specificityScore,
    relevanceScore,
    wordCount,
    matchedTerms: matchedKeywords,
    suggestions,
  };
}

function buildSuggestions({ wordCount, hasNumber, ownershipHits, matchedKeywords, keywords, overallScore }) {
  const suggestions = [];

  if (wordCount < 10) {
    suggestions.push(`Your answer is only ${wordCount} word${wordCount === 1 ? "" : "s"} — that's too brief. Aim for at least 40-60 words with a specific example.`);
  } else if (wordCount < 25) {
    suggestions.push(`At ${wordCount} words, add a bit more detail — explain your reasoning or give a concrete example.`);
  } else if (wordCount > 150) {
    suggestions.push(`Your answer is quite long (${wordCount} words) — trim it to the most relevant 60-90 words so it stays focused for a spoken interview.`);
  }

  if (!hasNumber && ownershipHits.length === 0) {
    suggestions.push("Try adding a measurable detail (a number or percentage) and describing exactly what YOU did, using first-person phrasing like \"I designed\" or \"I implemented\".");
  } else if (!hasNumber) {
    suggestions.push(`Good use of ownership language (e.g. "${ownershipHits[0]}") — now add a measurable result too, like a number or percentage.`);
  } else if (ownershipHits.length === 0) {
    suggestions.push("You included a measurable detail — now also describe your own specific actions using first-person language like \"I built\" or \"I optimized\".");
  }

  const missing = keywords.filter((k) => !matchedKeywords.includes(k));
  if (matchedKeywords.length === 0) {
    suggestions.push(`This answer didn't touch on any of the key concepts for this question. Try covering: ${keywords.slice(0, 5).join(", ")}.`);
  } else if (missing.length > 0 && overallScore < 75) {
    suggestions.push(`Good mention of ${matchedKeywords.slice(0, 3).join(", ")} — you could also bring in: ${missing.slice(0, 4).join(", ")}.`);
  }

  if (suggestions.length === 0) {
    suggestions.push("Strong, detailed, and on-topic answer — nice work.");
  }

  return suggestions.slice(0, 3);
}

module.exports = { scoreAnswer };

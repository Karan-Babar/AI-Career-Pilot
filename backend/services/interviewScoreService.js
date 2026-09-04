const fs = require("fs");
const path = require("path");
const { stemmer } = require("porter-stemmer");

const QUESTION_BANK = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "data", "interviewQuestions.json"), "utf-8")
);

const QUESTIONS_BY_ID = {};
QUESTION_BANK.forEach((cat) => {
  cat.questions.forEach((q) => {
    QUESTIONS_BY_ID[q.id] = q;
  });
});

// Broad vocabulary of "ownership" verbs — deliberately wide so genuinely
// specific answers aren't falsely flagged as vague just because they used
// a word outside a too-narrow list.
const OWNERSHIP_VERBS = [
  "built", "led", "designed", "implemented", "managed", "created", "developed",
  "decided", "fixed", "solved", "wrote", "debugged", "optimized", "presented",
  "coordinated", "resolved", "delivered", "achieved", "reduced", "improved",
  "increased", "organized", "initiated", "analyzed", "researched", "used",
  "handled", "worked", "contributed", "tested", "deployed", "configured",
  "automated", "monitored", "refactored", "migrated", "trained", "mentored",
  "collaborated", "communicated", "planned", "executed", "launched", "shipped",
  "maintained", "supported", "diagnosed", "investigated", "documented",
  "reviewed", "completed", "applied", "helped", "learned", "ensured",
];

function tokenize(text) {
  return (text.toLowerCase().match(/[a-z0-9.#+]+/g) || []);
}

function matchKeyword(lowerText, tokens, stemmedTokenSet, keyword) {
  if (keyword.includes(" ")) {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`, "i");
    return regex.test(lowerText);
  }
  if (tokens.includes(keyword)) return true;
  return stemmedTokenSet.has(stemmer(keyword));
}

function findOwnershipHits(lowerText) {
  const hits = OWNERSHIP_VERBS
    .map((v) => ({ v, idx: lowerText.indexOf(v) }))
    .filter((h) => h.idx !== -1)
    .sort((a, b) => a.idx - b.idx);
  return hits.map((h) => h.v);
}

function scoreAnswer(questionId, answerText) {
  const question = QUESTIONS_BY_ID[questionId];
  if (!question) {
    throw new Error(`Unknown question id: ${questionId}`);
  }

  const text = (answerText || "").trim();
  const lower = text.toLowerCase();
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  const tokens = tokenize(text);
  const stemmedTokenSet = new Set(tokens.map((t) => stemmer(t)));

  const keywords = question.keywords || [];
  const matchedKeywords = keywords.filter((kw) => matchKeyword(lower, tokens, stemmedTokenSet, kw));
  const keywordCoverage = keywords.length > 0 ? matchedKeywords.length / keywords.length : 0;

  // Depth bonus: even a short answer gets a small baseline credit for attempting it
  let depthBonus;
  if (wordCount < 10) depthBonus = 4;
  else if (wordCount < 25) depthBonus = 7;
  else if (wordCount < 50) depthBonus = 9;
  else depthBonus = 12;

  const hasNumber = /\d/.test(text);
  const ownershipHits = findOwnershipHits(lower);
  const hasFirstPerson = /\bi\b/.test(lower);

  let specificityBonus = 0;
  if (hasNumber) specificityBonus += 2.5;
  if (ownershipHits.length > 0) specificityBonus += 2;
  else if (hasFirstPerson) specificityBonus += 1;

  // Base of 45 represents "a real, attempted answer"; up to 45 more is earned
  // through relevance, depth, and specificity. Capped at 90 so there's always
  // room for improvement, never a false sense of a "perfect" answer.
  const rawScore = 45 + keywordCoverage * 35 + depthBonus + specificityBonus;
  const overallScore = Math.min(90, Math.round(rawScore));

  const relevanceScore = Math.round(keywordCoverage * 100);
  const depthScore = Math.round((depthBonus / 12) * 100);
  const specificityScore = Math.min(100, Math.round((specificityBonus / 4.5) * 100));

  const suggestions = buildSuggestions({
    wordCount,
    hasNumber,
    ownershipHits,
    hasFirstPerson,
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

function buildSuggestions({ wordCount, hasNumber, ownershipHits, hasFirstPerson, matchedKeywords, keywords, overallScore }) {
  const suggestions = [];

  if (wordCount < 10) {
    suggestions.push(`Your answer is only ${wordCount} word${wordCount === 1 ? "" : "s"} — try expanding it with a specific example or a bit more explanation.`);
  } else if (wordCount < 25) {
    suggestions.push(`At ${wordCount} words, add a little more detail — one more sentence on your reasoning or result would help.`);
  } else if (wordCount > 150) {
    suggestions.push(`Your answer is quite long (${wordCount} words) — for a spoken interview, trim it to the most relevant 60-90 words.`);
  }

  // Only fire the generic "add specifics" warning when BOTH signals are genuinely absent
  if (!hasNumber && ownershipHits.length === 0 && !hasFirstPerson) {
    suggestions.push("Try describing what YOU specifically did (\"I designed\", \"I implemented\") and, if relevant, a measurable detail like a number or percentage.");
  } else if (!hasNumber && ownershipHits.length > 0) {
    suggestions.push(`Good use of "${ownershipHits[0]}" to describe your own contribution — adding a number or measurable result would make it even stronger.`);
  } else if (hasNumber && ownershipHits.length === 0) {
    suggestions.push("You included a measurable detail — now also name the specific action you took (e.g. \"I built\", \"I optimized\").");
  }

  const missing = keywords.filter((k) => !matchedKeywords.includes(k));
  if (matchedKeywords.length === 0) {
    suggestions.push(`This answer didn't touch on the key concepts for this question. Try covering: ${keywords.slice(0, 5).join(", ")}.`);
  } else if (missing.length > 0 && overallScore < 80) {
    suggestions.push(`Good mention of ${matchedKeywords.slice(0, 3).join(", ")} — you could also bring in: ${missing.slice(0, 4).join(", ")}.`);
  }

  if (suggestions.length === 0) {
    suggestions.push("Strong, detailed, and on-topic answer — nice work.");
  }

  return suggestions.slice(0, 3);
}

module.exports = { scoreAnswer };

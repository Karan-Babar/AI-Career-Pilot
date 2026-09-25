const fs = require("fs");
const path = require("path");
const { stemmer } = require("porter-stemmer");
const ENGLISH_WORDS = require("an-array-of-english-words");

const QUESTION_BANK = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "data", "interviewQuestions.json"), "utf-8")
);

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
  "handled", "worked", "contributed", "tested", "deployed", "configured",
  "automated", "monitored", "refactored", "migrated", "trained", "mentored",
  "collaborated", "communicated", "planned", "executed", "launched", "shipped",
  "maintained", "supported", "diagnosed", "investigated", "documented",
  "reviewed", "completed", "applied", "helped", "learned", "ensured",
];

const MIN_WORDS_TO_EVALUATE = 15;

// ---------------------------------------------------------------------
// Real-word validity check (gibberish detection) — unchanged from before.
// ---------------------------------------------------------------------
const DICTIONARY = new Set(ENGLISH_WORDS);

const TECH_VOCAB = new Set();
QUESTION_BANK.forEach((cat) => {
  cat.questions.forEach((q) => {
    (q.keywords || []).forEach((kw) => {
      kw.toLowerCase().split(/[^a-z0-9.#+]+/).forEach((w) => {
        if (w) TECH_VOCAB.add(w);
      });
    });
  });
});
OWNERSHIP_VERBS.forEach((v) => TECH_VOCAB.add(v));

function isValidToken(token) {
  const t = token.toLowerCase().replace(/[^a-z0-9.#+]/g, "");
  if (t.length <= 1) return true;
  if (DICTIONARY.has(t)) return true;
  if (TECH_VOCAB.has(t)) return true;
  if (/^[a-z]+\.(js|py|net|io)$/i.test(t)) return true;
  return false;
}

function realWordRatio(text) {
  const tokens = text.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return 0;
  const validCount = tokens.filter(isValidToken).length;
  return validCount / tokens.length;
}

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

  const hasNumber = /\d/.test(text);
  const ownershipHits = findOwnershipHits(lower);
  const hasFirstPerson = /\bi\b/.test(lower);

  // Gibberish check runs regardless of length
  const wordValidityRatio = realWordRatio(text);
  const gibberishMultiplier = wordCount < 3 ? 1 : Math.min(1, wordValidityRatio / 0.6);
  const isLikelyGibberish = wordCount >= 3 && wordValidityRatio < 0.4;

  let overallScore;
  let depthScore;
  let specificityScore;
  let relevanceScore;
  let tooShort = false;

  if (wordCount < MIN_WORDS_TO_EVALUATE) {
    // Hard length gate: an answer under 15 words hasn't given us enough to
    // meaningfully evaluate, so it's capped well below the "real attempt"
    // floor used for longer answers, no matter how many keywords it hits.
    tooShort = true;
    const base = 15;
    const rawScore = base + keywordCoverage * 15 + (hasNumber ? 3 : 0) + (ownershipHits.length > 0 ? 3 : 0);
    overallScore = Math.round(Math.min(40, rawScore) * gibberishMultiplier);
    depthScore = Math.round((wordCount / MIN_WORDS_TO_EVALUATE) * 100);
    specificityScore = Math.min(100, Math.round(((hasNumber ? 50 : 0) + (ownershipHits.length > 0 ? 50 : 0))));
    relevanceScore = Math.round(keywordCoverage * 100);
  } else {
    let depthBonus;
    if (wordCount < 25) depthBonus = 7;
    else if (wordCount < 50) depthBonus = 9;
    else depthBonus = 12;

    let specificityBonus = 0;
    if (hasNumber) specificityBonus += 2.5;
    if (ownershipHits.length > 0) specificityBonus += 2;
    else if (hasFirstPerson) specificityBonus += 1;

    const rawScore = 45 + keywordCoverage * 35 + depthBonus + specificityBonus;
    overallScore = Math.round(Math.min(90, rawScore) * gibberishMultiplier);
    depthScore = Math.round((depthBonus / 12) * 100);
    specificityScore = Math.min(100, Math.round((specificityBonus / 4.5) * 100));
    relevanceScore = Math.round(keywordCoverage * 100);
  }

  if (isLikelyGibberish) {
    depthScore = 0;
    specificityScore = 0;
    relevanceScore = 0;
  }

  const suggestions = isLikelyGibberish
    ? ["This doesn't look like a real answer — please write an actual response to the question in your own words."]
    : buildSuggestions({
        wordCount, tooShort, hasNumber, ownershipHits, hasFirstPerson, matchedKeywords, keywords, overallScore,
      });

  return {
    overallScore,
    depthScore,
    specificityScore,
    relevanceScore,
    wordCount,
    matchedTerms: isLikelyGibberish ? [] : matchedKeywords,
    suggestions,
  };
}

function buildSuggestions({ wordCount, tooShort, hasNumber, ownershipHits, hasFirstPerson, matchedKeywords, keywords, overallScore }) {
  const suggestions = [];

  if (tooShort) {
    suggestions.push(`Your answer is only ${wordCount} word${wordCount === 1 ? "" : "s"} — write at least ${MIN_WORDS_TO_EVALUATE} words so there's enough to evaluate properly. Explain your reasoning, not just a one-line answer.`);
  } else if (wordCount < 25) {
    suggestions.push(`At ${wordCount} words, add a little more detail — one more sentence on your reasoning or result would help.`);
  } else if (wordCount > 150) {
    suggestions.push(`Your answer is quite long (${wordCount} words) — for a spoken interview, trim it to the most relevant 60-90 words.`);
  }

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

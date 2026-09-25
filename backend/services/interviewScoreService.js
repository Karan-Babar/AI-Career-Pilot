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

// ---------------------------------------------------------------------------
// Quality checks are intentionally conservative. They reject obvious random
// input without pretending that a dictionary can prove factual correctness.
// ---------------------------------------------------------------------------
const DICTIONARY = new Set(ENGLISH_WORDS);

const TECH_VOCAB = new Set();
QUESTION_BANK.forEach((cat) => {
  cat.questions.forEach((q) => {
    // Include terms from both the question and its scoring rubric. This keeps
    // legitimate technical terms from being mistaken for random text.
    const vocabulary = `${q.question} ${(q.keywords || []).join(" ")}`;
    vocabulary.toLowerCase().split(/[^a-z0-9.#+]+/).forEach((word) => {
      if (word) TECH_VOCAB.add(word);
    });
  });
});
OWNERSHIP_VERBS.forEach((verb) => TECH_VOCAB.add(verb));

const FUNCTION_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "because", "but", "by", "for", "from",
  "had", "has", "have", "i", "in", "is", "it", "my", "of", "on", "or", "our",
  "so", "that", "the", "their", "there", "these", "they", "this", "to", "was",
  "we", "were", "with", "you", "your",
]);

const QUESTION_STOP_WORDS = new Set([
  "about", "after", "again", "also", "and", "are", "best", "between", "could",
  "does", "explain", "from", "have", "how", "into", "its", "more", "most",
  "not", "should", "that", "the", "their", "there", "these", "they", "this",
  "what", "when", "where", "which", "why", "with", "would", "your",
]);

function normalizeToken(token) {
  return token.toLowerCase().replace(/[^a-z0-9.#+]/g, "");
}

function tokenize(text) {
  return text.toLowerCase().match(/[a-z0-9.#+]+/g) || [];
}

function getWordTokens(text) {
  return tokenize(text).filter((token) => /[a-z]/i.test(token));
}

function isValidToken(token) {
  const t = normalizeToken(token);
  if (!t || !/[a-z]/i.test(t)) return false;

  // "a" and "i" are meaningful words. Other isolated characters should not
  // artificially raise the quality ratio (for example, the "h" in keyboard
  // mashing).
  if (t.length === 1) return t === "a" || t === "i";

  if (DICTIONARY.has(t) || TECH_VOCAB.has(t)) return true;
  if (/^[a-z]+\.(js|py|net|io)$/i.test(t)) return true;

  const stemmed = stemmer(t);
  return DICTIONARY.has(stemmed) || TECH_VOCAB.has(stemmed);
}

function matchKeyword(lowerText, tokens, stemmedTokenSet, keyword) {
  const normalizedKeyword = keyword.toLowerCase();
  if (normalizedKeyword.includes(" ")) {
    const escaped = normalizedKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`, "i");
    return regex.test(lowerText);
  }
  if (tokens.includes(normalizedKeyword)) return true;
  return stemmedTokenSet.has(stemmer(normalizedKeyword));
}

function findOwnershipHits(tokens, stemmedTokenSet) {
  const tokenSet = new Set(tokens);
  return OWNERSHIP_VERBS.filter(
    (verb) => tokenSet.has(verb) || stemmedTokenSet.has(stemmer(verb))
  );
}

function getQuestionTerms(question) {
  const text = `${question.question} ${(question.keywords || []).join(" ")}`;
  return tokenize(text).filter(
    (token) => token.length > 2 && !QUESTION_STOP_WORDS.has(token)
  );
}

function analyzeAnswerQuality(text, question, matchedKeywords, ownershipHits) {
  const wordTokens = getWordTokens(text);
  const normalizedTokens = wordTokens.map(normalizeToken).filter(Boolean);
  const validWordCount = normalizedTokens.filter(isValidToken).length;
  const validWordRatio = wordTokens.length > 0 ? validWordCount / wordTokens.length : 0;
  const uniqueWordRatio = normalizedTokens.length > 0
    ? new Set(normalizedTokens).size / normalizedTokens.length
    : 0;
  const contentTokens = normalizedTokens.filter((token) => !FUNCTION_WORDS.has(token));
  const contentUniqueRatio = contentTokens.length > 0
    ? new Set(contentTokens).size / contentTokens.length
    : 1;

  const tokenSet = new Set(normalizedTokens);
  const functionWordCount = normalizedTokens.filter((token) => FUNCTION_WORDS.has(token)).length;
  const questionTerms = getQuestionTerms(question);
  const hasQuestionSignal = matchedKeywords.length > 0 || questionTerms.some(
    (term) => tokenSet.has(term) || tokenSet.has(stemmer(term))
  );
  const hasNaturalLanguageSignal = functionWordCount > 0
    || ownershipHits.length > 0
    || hasQuestionSignal;

  const repeatedWordRatio = uniqueWordRatio < 0.45 && wordTokens.length >= 4;
  const repeatedContentWords = contentTokens.length >= 4 && contentUniqueRatio < 0.35;
  const singleUnknownLongWord = wordTokens.length === 1
    && validWordCount === 0
    && wordTokens[0].length >= 5;
  const mostlyUnknownShortWords = wordTokens.length >= 3
    && validWordRatio < 0.35
    && validWordCount <= 1
    && ownershipHits.length === 0;
  const mostlyUnknownWords = wordTokens.length >= 5 && validWordRatio < 0.2;
  const lowQualityWithoutStructure = wordTokens.length >= 5
    && validWordRatio < 0.35
    && !hasNaturalLanguageSignal;
  const repeatedLowQualityWords = repeatedWordRatio && validWordRatio < 0.7;
  const noMeaningfulWords = wordTokens.length === 0 && text.length >= 3;

  const isLikelyGibberish = noMeaningfulWords
    || singleUnknownLongWord
    || mostlyUnknownShortWords
    || mostlyUnknownWords
    || lowQualityWithoutStructure
    || repeatedLowQualityWords
    || repeatedContentWords;

  return {
    meaningfulWordCount: wordTokens.length,
    validWordCount,
    validWordRatio,
    uniqueWordRatio,
    hasQuestionSignal,
    isLikelyGibberish,
  };
}

function makeResult({
  status,
  submittedWordCount,
  meaningfulWordCount,
  matchedTerms = [],
  suggestions = [],
  scores = {},
  message,
}) {
  const isScored = status === "scored";
  const isNeedsMoreDetail = status === "needs_more_detail";
  const defaultScore = isNeedsMoreDetail ? null : 0;
  const finalMessage = message || suggestions[0] || "";

  return {
    status,
    isValid: isScored,
    scoreAvailable: isScored,
    overallScore: isScored ? scores.overallScore ?? 0 : defaultScore,
    depthScore: isScored ? scores.depthScore ?? 0 : defaultScore,
    specificityScore: isScored ? scores.specificityScore ?? 0 : defaultScore,
    relevanceScore: isScored ? scores.relevanceScore ?? 0 : defaultScore,
    wordCount: submittedWordCount,
    meaningfulWordCount,
    matchedTerms: status === "scored" || isNeedsMoreDetail ? matchedTerms : [],
    suggestions: suggestions.slice(0, 3),
    message: finalMessage,
  };
}

function scoreAnswer(questionId, answerText) {
  const question = QUESTIONS_BY_ID[questionId];
  if (!question) {
    throw new Error(`Unknown question id: ${questionId}`);
  }

  const text = (answerText || "").trim();
  const lower = text.toLowerCase();
  const submittedWordCount = text.split(/\s+/).filter(Boolean).length;
  const tokens = tokenize(text);
  const stemmedTokenSet = new Set(tokens.map((token) => stemmer(token)));

  const keywords = question.keywords || [];
  const matchedKeywords = keywords.filter((keyword) =>
    matchKeyword(lower, tokens, stemmedTokenSet, keyword)
  );
  const keywordCoverage = keywords.length > 0 ? matchedKeywords.length / keywords.length : 0;

  const ownershipHits = findOwnershipHits(tokens, stemmedTokenSet);
  const quality = analyzeAnswerQuality(text, question, matchedKeywords, ownershipHits);

  if (quality.isLikelyGibberish) {
    return makeResult({
      status: "invalid",
      submittedWordCount,
      meaningfulWordCount: quality.meaningfulWordCount,
      suggestions: [
        "This answer does not appear to contain meaningful words. Please write a real response to the question in your own words.",
      ],
      message: "This answer was marked invalid because it does not appear to be a meaningful response.",
    });
  }

  if (quality.meaningfulWordCount < MIN_WORDS_TO_EVALUATE) {
    const suggestions = [
      `Your answer has only ${quality.meaningfulWordCount} meaningful word${quality.meaningfulWordCount === 1 ? "" : "s"}. Write at least ${MIN_WORDS_TO_EVALUATE} words and explain your reasoning, not just a one-line answer.`,
    ];

    if (matchedKeywords.length > 0) {
      suggestions.push(`You mentioned ${matchedKeywords.slice(0, 3).join(", ")}; add an explanation and a specific result.`);
    } else {
      suggestions.push(`Try covering the key concepts for this question, such as: ${keywords.slice(0, 5).join(", ")}.`);
    }

    return makeResult({
      status: "needs_more_detail",
      submittedWordCount,
      meaningfulWordCount: quality.meaningfulWordCount,
      matchedTerms: matchedKeywords,
      suggestions,
      message: "Your answer is understandable, but it needs more detail before it can be scored fairly.",
    });
  }

  if (!quality.hasQuestionSignal) {
    return makeResult({
      status: "irrelevant",
      submittedWordCount,
      meaningfulWordCount: quality.meaningfulWordCount,
      suggestions: [
        `This answer is readable, but it does not appear to address the question. Try explaining: ${keywords.slice(0, 5).join(", ")}.`,
      ],
      message: "Your answer was not scored because it does not appear to address the interview question.",
    });
  }

  const hasNumber = /\d/.test(text);
  const hasFirstPerson = tokens.includes("i");
  let overallScore;
  let depthScore;
  let specificityScore;
  let relevanceScore;

  let depthBonus;
  if (quality.meaningfulWordCount < 25) depthBonus = 7;
  else if (quality.meaningfulWordCount < 50) depthBonus = 9;
  else depthBonus = 12;

  let specificityBonus = 0;
  if (hasNumber) specificityBonus += 2.5;
  if (ownershipHits.length > 0) specificityBonus += 2;
  else if (hasFirstPerson) specificityBonus += 1;

  const rawScore = 45 + keywordCoverage * 35 + depthBonus + specificityBonus;
  overallScore = Math.round(Math.min(90, rawScore));
  depthScore = Math.round((depthBonus / 12) * 100);
  specificityScore = Math.min(100, Math.round((specificityBonus / 4.5) * 100));
  relevanceScore = Math.round(keywordCoverage * 100);

  const suggestions = buildSuggestions({
    wordCount: quality.meaningfulWordCount,
    hasNumber,
    ownershipHits,
    hasFirstPerson,
    matchedKeywords,
    keywords,
    overallScore,
  });

  return makeResult({
    status: "scored",
    submittedWordCount,
    meaningfulWordCount: quality.meaningfulWordCount,
    matchedTerms: matchedKeywords,
    suggestions,
    message: "Answer evaluated successfully.",
    scores: {
      overallScore,
      depthScore,
      specificityScore,
      relevanceScore,
    },
  });
}

function hasQuestion(questionId) {
  return Object.prototype.hasOwnProperty.call(QUESTIONS_BY_ID, questionId);
}

function buildSuggestions({ wordCount, hasNumber, ownershipHits, hasFirstPerson, matchedKeywords, keywords, overallScore }) {
  const suggestions = [];

  if (wordCount < 25) {
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

  const missing = keywords.filter((keyword) => !matchedKeywords.includes(keyword));
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

module.exports = { scoreAnswer, hasQuestion };

const fs = require("fs");
const path = require("path");
const { scoreAnswer } = require("../services/interviewScoreService");

const QUESTION_BANK = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "data", "interviewQuestions.json"), "utf-8")
);

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// @route GET /api/interview/categories
exports.getCategories = (req, res) => {
  const categories = QUESTION_BANK.map((c) => ({
    category: c.category,
    questionCount: c.questions.length,
  }));
  res.status(200).json({ categories });
};

// @route GET /api/interview/questions?category=Frontend Developer&count=5
// Strips the `keywords` scoring key before sending to the client.
exports.getQuestions = (req, res) => {
  const { category, count } = req.query;

  const entry = QUESTION_BANK.find((c) => c.category === category);
  if (!entry) {
    return res.status(404).json({ message: "Category not found" });
  }

  const n = Math.min(parseInt(count, 10) || 5, entry.questions.length);
  const picked = shuffle(entry.questions).slice(0, n);

  const questions = picked.map(({ id, question, points }) => ({ id, question, points }));

  res.status(200).json({ category, questions });
};

// @route POST /api/interview/score
// Body: { questionId, answer }
exports.scoreInterviewAnswer = (req, res) => {
  try {
    const { questionId, answer } = req.body;

    if (!questionId) {
      return res.status(400).json({ message: "Missing questionId" });
    }
    if (!answer || answer.trim().length < 3) {
      return res.status(400).json({ message: "Please write an answer before checking it." });
    }

    const result = scoreAnswer(questionId, answer);
    res.status(200).json(result);
  } catch (error) {
    console.error("Interview scoring error:", error);
    res.status(500).json({ message: error.message || "Failed to score answer" });
  }
};

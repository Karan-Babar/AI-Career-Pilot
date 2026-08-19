const fs = require("fs");
const path = require("path");

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
exports.getQuestions = (req, res) => {
  const { category, count } = req.query;

  const entry = QUESTION_BANK.find((c) => c.category === category);
  if (!entry) {
    return res.status(404).json({ message: "Category not found" });
  }

  const n = Math.min(parseInt(count, 10) || 5, entry.questions.length);
  const questions = shuffle(entry.questions).slice(0, n);

  res.status(200).json({ category, questions });
};
import React, { useState, useEffect } from "react";
import api from "../api/axios";

const CATEGORY_ICONS = {
  "HR & Behavioral": "🗣️",
  "Frontend Developer": "🖥️",
  "Backend Developer": "🗄️",
  "Data Scientist": "📊",
  "Machine Learning Engineer": "🤖",
  "Android Developer": "📱",
  "DevOps Engineer": "⚙️",
  "Cybersecurity Analyst": "🛡️",
  "UX Designer": "🎨",
};

export default function InterviewPrep() {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [myAnswer, setMyAnswer] = useState("");
  const [scoreResult, setScoreResult] = useState(null);
  const [showModelChecklist, setShowModelChecklist] = useState(false);
  const [questionScores, setQuestionScores] = useState({});
  const [checking, setChecking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sessionComplete, setSessionComplete] = useState(false);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const { data } = await api.get("/interview/categories");
        setCategories(data.categories);
      } catch (err) {
        setError("Failed to load interview categories.");
      }
    };
    loadCategories();
  }, []);

  const resetQuestionState = () => {
    setMyAnswer("");
    setScoreResult(null);
    setShowModelChecklist(false);
  };

  const startSession = async (category) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/interview/questions", {
        params: { category, count: 5 },
      });
      setSelectedCategory(category);
      setQuestions(data.questions);
      setCurrentIndex(0);
      setQuestionScores({});
      setSessionComplete(false);
      resetQuestionState();
    } catch (err) {
      setError("Failed to load questions for this category.");
    } finally {
      setLoading(false);
    }
  };

const checkAnswer = async () => {
  if (!myAnswer.trim() || myAnswer.trim().length < 3) {
    setError("Write an answer first, then check it.");
    return;
  }
  setChecking(true);
  setError("");
  try {
    const { data } = await api.post("/interview/score", {
      questionId: currentQuestion.id,
      answer: myAnswer,
    });
    setScoreResult(data);
    setQuestionScores((prev) => ({ ...prev, [currentIndex]: data.overallScore }));
  } catch (err) {
    setError(err.response?.data?.message || "Failed to score your answer.");
  } finally {
    setChecking(false);
  }
};

  const goToQuestion = (index) => {
    setCurrentIndex(index);
    resetQuestionState();
  };

  const finishSession = () => {
    setSessionComplete(true);
  };

  const endSession = () => {
    setSelectedCategory(null);
    setQuestions([]);
    setCurrentIndex(0);
    setQuestionScores({});
    setSessionComplete(false);
    resetQuestionState();
  };

  const currentQuestion = questions[currentIndex];
  const scoresArray = Object.values(questionScores);
  const avgScore = scoresArray.length
    ? Math.round(scoresArray.reduce((a, b) => a + b, 0) / scoresArray.length)
    : null;

  return (
    <div className="dashboard">
      <header>
        <h1>AI Interview Preparation</h1>
      </header>

      {error && <p className="error">{error}</p>}

      {!selectedCategory && (
        <>
          <p className="results-sub">
            Pick a category to start a practice round of 5 questions. Write your own answer,
            then check it against a rule-based scoring engine that evaluates depth, specificity,
            and relevance — no external AI service required.
          </p>
          <div className="interview-category-grid">
            {categories.map((c) => (
              <button
                key={c.category}
                className="interview-category-card"
                onClick={() => startSession(c.category)}
                disabled={loading}
              >
                <span className="interview-category-icon">{CATEGORY_ICONS[c.category] || "💬"}</span>
                <span className="interview-category-name">{c.category}</span>
                <span className="interview-category-count">{c.questionCount} questions available</span>
              </button>
            ))}
          </div>
        </>
      )}

      {selectedCategory && sessionComplete && (
        <div className="results interview-summary">
          <span className="placeholder-icon">🏁</span>
          <h2>Session Complete</h2>
          <p className="results-sub">{selectedCategory} — {scoresArray.length} of {questions.length} questions checked</p>

          {avgScore != null && (
            <div className="score-grid" style={{ justifyContent: "center", margin: "1.2rem 0" }}>
              <ScoreGauge label="Average Score" value={avgScore} big />
            </div>
          )}

          <div className="interview-summary-dots">
            {questions.map((_, i) => (
              <div key={i} className="summary-dot-wrap">
                <div
                  className="summary-dot"
                  style={{
                    background: scoreColor(questionScores[i]),
                  }}
                >
                  {questionScores[i] != null ? questionScores[i] : "—"}
                </div>
                <span className="summary-dot-label">Q{i + 1}</span>
              </div>
            ))}
          </div>

          <div className="interview-nav" style={{ marginTop: "1.5rem" }}>
            <button className="back-btn" onClick={() => startSession(selectedCategory)}>
              Retry This Category
            </button>
            <button className="analyze-btn" style={{ marginBottom: 0 }} onClick={endSession}>
              Choose Another Category
            </button>
          </div>
        </div>
      )}

      {selectedCategory && !sessionComplete && currentQuestion && (
        <div className="results">
          <div className="interview-session-header">
            <span className="interview-session-badge">
              {CATEGORY_ICONS[selectedCategory] || "💬"} {selectedCategory}
            </span>
            <button className="back-btn" onClick={endSession}>
              End Session
            </button>
          </div>

          <div className="interview-progress-track">
            {questions.map((_, i) => (
              <div
                key={i}
                className={`interview-progress-dot ${i === currentIndex ? "active" : ""}`}
                style={
                  questionScores[i] != null && i !== currentIndex
                    ? { background: scoreColor(questionScores[i]) }
                    : undefined
                }
                onClick={() => goToQuestion(i)}
                title={questionScores[i] != null ? `Score: ${questionScores[i]}` : "Not answered yet"}
              ></div>
            ))}
          </div>

          <div className="interview-flashcard">
            <span className="interview-q-counter">Question {currentIndex + 1} of {questions.length}</span>
            <h2>{currentQuestion.question}</h2>

            <textarea
              className="jd-textarea"
              placeholder="Type your answer here..."
              value={myAnswer}
              onChange={(e) => {
                setMyAnswer(e.target.value);
                setScoreResult(null);
              }}
              rows={5}
            />

            <button className="analyze-btn" onClick={checkAnswer} disabled={checking}>
              {checking ? "Checking..." : "Check My Answer"}
            </button>

            {scoreResult && (
              <div className="interview-feedback">
                <div className="score-grid">
                  <ScoreGauge label="Overall" value={scoreResult.overallScore} big />
                  <ScoreGauge label="Depth" value={scoreResult.depthScore} />
                  <ScoreGauge label="Specificity" value={scoreResult.specificityScore} />
                  <ScoreGauge label="Relevance" value={scoreResult.relevanceScore} />
                </div>

                <h3 style={{ marginTop: "1.2rem" }}>Suggestions</h3>
                <ul className="suggestions">
                  {scoreResult.suggestions.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}

            <button
              className="back-btn interview-checklist-toggle"
              onClick={() => setShowModelChecklist((prev) => !prev)}
            >
              {showModelChecklist ? "Hide reference checklist" : "View reference checklist"}
            </button>

            {showModelChecklist && (
              <div className="interview-checklist">
                <h3 style={{ marginTop: 0 }}>A strong answer usually covers:</h3>
                <ul className="suggestions">
                  {currentQuestion.points.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="interview-nav">
            <button
              className="back-btn"
              onClick={() => goToQuestion(currentIndex - 1)}
              disabled={currentIndex === 0}
            >
              ← Previous
            </button>
            {currentIndex < questions.length - 1 ? (
              <button className="analyze-btn" style={{ marginBottom: 0 }} onClick={() => goToQuestion(currentIndex + 1)}>
                Next Question →
              </button>
            ) : (
              <button className="analyze-btn" style={{ marginBottom: 0 }} onClick={finishSession}>
                Finish Session
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function scoreColor(value) {
  if (value == null) return "var(--border-subtle)";
  if (value >= 70) return "#2dd4bf";
  if (value >= 40) return "#f5a623";
  return "#ef4444";
}

function ScoreGauge({ label, value, big }) {
  const color = scoreColor(value);
  const pct = value ?? 0;
  return (
    <div className={`score-card ${big ? "big" : ""}`}>
      <div
        className="score-gauge"
        style={{
          background: `conic-gradient(${color} ${pct * 3.6}deg, #232b3d ${pct * 3.6}deg)`,
        }}
      >
        <div className="score-gauge-inner" style={{ color }}>
          {value ?? "-"}
        </div>
      </div>
      <div className="score-label">{label}</div>
    </div>
  );
}
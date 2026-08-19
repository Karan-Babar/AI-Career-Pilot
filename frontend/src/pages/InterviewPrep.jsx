import React, { useState, useEffect } from "react";
import api from "../api/axios";

export default function InterviewPrep() {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showChecklist, setShowChecklist] = useState(false);
  const [myAnswer, setMyAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
      setShowChecklist(false);
      setMyAnswer("");
    } catch (err) {
      setError("Failed to load questions for this category.");
    } finally {
      setLoading(false);
    }
  };

  const goToQuestion = (index) => {
    setCurrentIndex(index);
    setShowChecklist(false);
    setMyAnswer("");
  };

  const endSession = () => {
    setSelectedCategory(null);
    setQuestions([]);
    setCurrentIndex(0);
    setShowChecklist(false);
    setMyAnswer("");
  };

  const currentQuestion = questions[currentIndex];

  return (
    <div className="dashboard">
      <header>
        <h1>AI Interview Preparation</h1>
      </header>

      {error && <p className="error">{error}</p>}

      {!selectedCategory && (
        <>
          <p className="results-sub">
            Pick a category to start a practice round of 5 questions. Type your own answer,
            then reveal what a strong answer typically covers to self-check.
          </p>
          <div className="interview-category-grid">
            {categories.map((c) => (
              <button
                key={c.category}
                className="interview-category-card"
                onClick={() => startSession(c.category)}
                disabled={loading}
              >
                <span className="interview-category-name">{c.category}</span>
                <span className="interview-category-count">{c.questionCount} questions</span>
              </button>
            ))}
          </div>
        </>
      )}

      {selectedCategory && currentQuestion && (
        <div className="results">
          <div className="interview-session-header">
            <span className="results-sub" style={{ margin: 0 }}>
              {selectedCategory} — Question {currentIndex + 1} of {questions.length}
            </span>
            <button className="back-btn" onClick={endSession}>
              End Session
            </button>
          </div>

          <div className="interview-progress-track">
            {questions.map((_, i) => (
              <div
                key={i}
                className={`interview-progress-dot ${i === currentIndex ? "active" : ""} ${
                  i < currentIndex ? "done" : ""
                }`}
              ></div>
            ))}
          </div>

          <div className="interview-flashcard">
            <h2>{currentQuestion.question}</h2>

            <textarea
              className="jd-textarea"
              placeholder="Type your answer here to practice (this stays on your screen only, it isn't submitted anywhere)..."
              value={myAnswer}
              onChange={(e) => setMyAnswer(e.target.value)}
              rows={5}
            />

            <button
              className="analyze-btn"
              style={{ marginBottom: showChecklist ? "1rem" : "1.5rem" }}
              onClick={() => setShowChecklist((prev) => !prev)}
            >
              {showChecklist ? "Hide Ideal Answer Checklist" : "Show Ideal Answer Checklist"}
            </button>

            {showChecklist && (
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
              <button className="analyze-btn" style={{ marginBottom: 0 }} onClick={endSession}>
                Finish Session
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
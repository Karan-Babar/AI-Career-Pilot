import React, { useState } from "react";
import api from "../api/axios";
import { useAppData } from "../context/AppDataContext";

export default function JobMatching() {
  const [mode, setMode] = useState("recommend"); // "recommend" | "compare"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

const {
  jobRecommendations: recommendations,
  setJobRecommendations: setRecommendations,
  jobCompareResult: compareResult,
  setJobCompareResult: setCompareResult,
} = useAppData();
const [jobDescription, setJobDescription] = useState("");

  const fetchRecommendations = async () => {
    setLoading(true);
    setError("");
    setRecommendations(null);
    try {
      const { data } = await api.get("/job-match/recommendations");
      setRecommendations(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to get recommendations.");
    } finally {
      setLoading(false);
    }
  };

  const handleCompare = async () => {
    if (!jobDescription || jobDescription.trim().length < 30) {
      setError("Please paste a fuller job description first.");
      return;
    }
    setLoading(true);
    setError("");
    setCompareResult(null);
    try {
      const { data } = await api.post("/job-match/compare", { jobDescription });
      setCompareResult(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to compare job description.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard">
      <header>
        <h1>Job Description Matching</h1>
      </header>

      <div className="mode-toggle">
        <button
          className={mode === "recommend" ? "active" : ""}
          onClick={() => {
            setMode("recommend");
            setError("");
          }}
        >
          Recommend Roles For Me
        </button>
        <button
          className={mode === "compare" ? "active" : ""}
          onClick={() => {
            setMode("compare");
            setError("");
          }}
        >
          Compare To a Job Description
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {mode === "recommend" && (
        <>
          {!recommendations && (
  <div className="job-cta-card">
    <div className="job-cta-icon-badge">🎯</div>
    <h2>Find your best-fit roles</h2>
    <p>
      We'll scan the resume you already analyzed on the Resume & ATS page and rank
      job roles by how well your skills match, from a curated dataset of 60+ tech roles.
    </p>
    <button className="analyze-btn cta-btn" onClick={fetchRecommendations} disabled={loading}>
      {loading ? "Analyzing..." : "Get Role Recommendations"}
    </button>
  </div>
)}

          {recommendations && (
            <div className="results">
              <h2>Top Matching Roles</h2>
              <p className="results-sub">
                Based on {recommendations.resumeSkillsDetected.length} skills detected in your resume.
              </p>

              <div className="role-list">
                {recommendations.recommendations.map((r) => (
                  <div key={r.role} className="role-card">
                    <div className="role-card-top">
                      <span className="role-name">{r.role}</span>
                      <span
                        className="role-percent"
                        style={{
                          color:
                            r.matchPercent >= 50
                              ? "#2dd4bf"
                              : r.matchPercent >= 25
                              ? "#f5a623"
                              : "#ef4444",
                        }}
                      >
                        {r.matchPercent}%
                      </span>
                    </div>

                    <div className="skill-chip-group">
                      {r.matchedSkills.slice(0, 8).map((s) => (
                        <span key={s} className="chip chip-matched">
                          {s}
                        </span>
                      ))}
                    </div>

                    {r.missingSkills.length > 0 && (
                      <div className="skill-chip-group">
                        {r.missingSkills.slice(0, 6).map((s) => (
                          <span key={s} className="chip chip-missing">
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <button className="analyze-btn" style={{ marginTop: "1.2rem" }} onClick={fetchRecommendations} disabled={loading}>
                {loading ? "Refreshing..." : "Refresh Recommendations"}
              </button>
            </div>
          )}
        </>
      )}

      {mode === "compare" && (
        <div className="results">
          <h2>Paste a Job Description</h2>
          <textarea
            className="jd-textarea"
            placeholder="Paste the full job description here..."
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            rows={8}
          />
          <button className="analyze-btn" onClick={handleCompare} disabled={loading}>
            {loading ? "Comparing..." : "Compare to My Resume"}
          </button>

          {compareResult && (
            <div className="compare-result">
              <div className="score-grid" style={{ justifyContent: "center" }}>
                <ScoreCard label="Match Score" value={compareResult.matchPercent} big />
              </div>

              {compareResult.closestRoleCategory && (
                <p className="results-sub">
                  This looks closest to a <strong>{compareResult.closestRoleCategory}</strong> role.
                </p>
              )}

              <h3>Matched Skills</h3>
              <div className="skill-chip-group">
                {compareResult.matchedSkills.length > 0 ? (
                  compareResult.matchedSkills.map((s) => (
                    <span key={s} className="chip chip-matched">
                      {s}
                    </span>
                  ))
                ) : (
                  <span className="results-sub">No overlapping skills detected.</span>
                )}
              </div>

              <h3>Missing Skills</h3>
              <div className="skill-chip-group">
                {compareResult.missingSkills.length > 0 ? (
                  compareResult.missingSkills.map((s) => (
                    <span key={s} className="chip chip-missing">
                      {s}
                    </span>
                  ))
                ) : (
                  <span className="results-sub">You cover everything detected in this JD. 🎉</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ScoreCard({ label, value, big }) {
  const color = value >= 75 ? "#2dd4bf" : value >= 50 ? "#f5a623" : "#ef4444";
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
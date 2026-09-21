import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";

export default function PlacementProbability() {
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchProbability = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/placement/probability");
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to calculate placement probability.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProbability();
  }, []);

  const readinessColor = (readiness) => {
    if (readiness === "High") return "#2dd4bf";
    if (readiness === "Moderate") return "#f5a623";
    return "#ef4444";
  };

  return (
    <div className="dashboard">
      <header>
        <h1>Placement Probability</h1>
      </header>

      {loading && <p className="results-sub">Calculating...</p>}
      {error && (
        <div className="placeholder-page">
          <span className="placeholder-icon">📊</span>
          <h2>Not enough data yet</h2>
          <p>{error}</p>
          <Link to="/resume" className="analyze-btn" style={{ display: "inline-block", textDecoration: "none", maxWidth: 240 }}>
            Go to Resume & ATS
          </Link>
        </div>
      )}

      {result && (
        <>
          <div className="results placement-hero">
            <div
              className="placement-gauge"
              style={{
                background: `conic-gradient(${readinessColor(result.readiness)} ${result.probability * 3.6}deg, #232b3d ${result.probability * 3.6}deg)`,
              }}
            >
              <div className="placement-gauge-inner">
                <span className="placement-gauge-value" style={{ color: readinessColor(result.readiness) }}>
                  {result.probability}%
                </span>
                <span className="placement-gauge-label">Placement Readiness</span>
              </div>
            </div>
            <span
              className="placement-readiness-badge"
              style={{ color: readinessColor(result.readiness), borderColor: readinessColor(result.readiness) }}
            >
              {result.readiness}
            </span>
            {result.topRole && (
              <p className="results-sub" style={{ marginTop: "0.8rem" }}>
                Best-matched role: <strong>{result.topRole}</strong>
              </p>
            )}
          </div>

          <div className="results" style={{ marginTop: "1.5rem" }}>
            <h2>Score Breakdown</h2>
            <div className="bar-chart">
              {result.components.map((c) => (
                <div key={c.key} className="bar-row">
                  <span className="bar-label">{c.label}</span>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${c.score}%` }}></div>
                  </div>
                  <span className="bar-count">{c.score}</span>
                </div>
              ))}
            </div>

            {result.missingModules.length > 0 && (
              <div className="placement-missing-note">
                <span>⚠️</span>
                <span>
                  This estimate excludes {result.missingModules.join(" and ")} — complete{" "}
                  {result.missingModules.includes("Job Matching") && (
                    <Link to="/job-matching">Job Matching</Link>
                  )}
                  {result.missingModules.includes("Job Matching") && result.missingModules.includes("LinkedIn Analysis") && " and "}
                  {result.missingModules.includes("LinkedIn Analysis") && (
                    <Link to="/linkedin">LinkedIn Analysis</Link>
                  )}
                  {" "}for a more accurate score.
                </span>
              </div>
            )}

            <h3 style={{ marginTop: "1.4rem" }}>Suggestions</h3>
            <ul className="suggestions">
              {result.suggestions.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>

          <button className="back-btn" style={{ marginTop: "1.2rem" }} onClick={fetchProbability}>
            Recalculate
          </button>
        </>
      )}
    </div>
  );
}

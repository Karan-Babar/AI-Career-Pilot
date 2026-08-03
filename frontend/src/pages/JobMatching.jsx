import React from "react";

export default function JobMatching() {
  return (
    <div className="dashboard">
      <div className="placeholder-page">
        <span className="placeholder-icon">🎯</span>
        <h2>Job Description Matching</h2>
        <p>
          Paste a job description alongside your resume to see a compatibility score,
          missing keywords, and tailored suggestions to improve your match.
        </p>
        <span className="card-status pending">Coming soon</span>
      </div>
    </div>
  );
}
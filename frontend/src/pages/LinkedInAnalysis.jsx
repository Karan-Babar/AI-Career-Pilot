import React, { useState, useRef } from "react";
import api from "../api/axios";

const AXES = [
  { key: "headlineScore", label: "Headline" },
  { key: "aboutScore", label: "About" },
  { key: "skillsScore", label: "Skills" },
  { key: "experienceScore", label: "Experience" },
  { key: "completenessScore", label: "Completeness" },
];

export default function LinkedInAnalysis() {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [extraSkills, setExtraSkills] = useState("");
  const [extraAbout, setExtraAbout] = useState("");
  const fileInputRef = useRef(null);

  const validateAndSetFile = (selected) => {
    setError("");
    if (!selected) return;
    if (selected.type !== "application/pdf") {
      setError("Please upload a PDF file — export your profile using LinkedIn's 'Save to PDF' option.");
      return;
    }
    if (selected.size > 5 * 1024 * 1024) {
      setError("File is too large. Max size is 5MB.");
      return;
    }
    setFile(selected);
    setResult(null);
  };

  const handleFileChange = (e) => validateAndSetFile(e.target.files[0]);
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    validateAndSetFile(e.dataTransfer.files[0]);
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select your LinkedIn PDF export first.");
      return;
    }
    setLoading(true);
    setError("");
    const formData = new FormData();
    formData.append("linkedinPdf", file);
    if (extraSkills.trim()) formData.append("extraSkillsText", extraSkills);
    if (extraAbout.trim()) formData.append("extraAboutText", extraAbout);
    try {
      const { data } = await api.post("/linkedin/analyze", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to analyze LinkedIn profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard">
      <header>
        <h1>LinkedIn Profile Analysis</h1>
      </header>

      {!result && (
        <div className="linkedin-howto">
          <h3>How to get your LinkedIn PDF</h3>
          <ol>
            <li>Open your LinkedIn profile in a browser</li>
            <li>Click the <strong>"More"</strong> button below your profile photo</li>
            <li>Select <strong>"Save to PDF"</strong></li>
            <li>Upload that downloaded file below</li>
          </ol>
        </div>
      )}

      <div
        className={`dropzone ${isDragging ? "dragging" : ""} ${file ? "has-file" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current.click()}
      >
        <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileChange} hidden />
        <div className="dropzone-icon">{file ? "💼" : "⬆️"}</div>
        {file ? (
          <>
            <p className="dropzone-filename">{file.name}</p>
            <p className="dropzone-hint">Click to choose a different file</p>
          </>
        ) : (
          <>
            <p className="dropzone-title">Drag & drop your LinkedIn PDF export here</p>
            <p className="dropzone-hint">or click to browse — PDF only, max 5MB</p>
          </>
        )}
      </div>

      {!result && (
        <div className="linkedin-supplement">
          <p className="results-sub" style={{ marginTop: 0 }}>
            LinkedIn's PDF export sometimes leaves out your full Skills list or About section.
            If your results look incomplete, paste them here (optional) and re-analyze.
          </p>
          <label className="field-label">Skills (optional — paste from your profile)</label>
          <textarea
            className="jd-textarea"
            placeholder="e.g. React, Node.js, MongoDB, Docker, Git..."
            value={extraSkills}
            onChange={(e) => setExtraSkills(e.target.value)}
            rows={2}
          />
          <label className="field-label">About section (optional — paste from your profile)</label>
          <textarea
            className="jd-textarea"
            placeholder="Paste your LinkedIn About section here..."
            value={extraAbout}
            onChange={(e) => setExtraAbout(e.target.value)}
            rows={3}
          />
        </div>
      )}

      <button className="analyze-btn" onClick={handleUpload} disabled={loading}>
        {loading ? "Analyzing..." : "Analyze Profile"}
      </button>

      {error && <p className="error">{error}</p>}

      {result && (
        <div className="results">
          <h2>Profile Score Breakdown</h2>
          <div className="radar-wrap">
            <RadarChart values={result} />
            <div className="radar-overall">
              <span className="radar-overall-value">{result.overallScore}</span>
              <span className="radar-overall-label">Overall</span>
            </div>
          </div>

          <h3>Suggestions</h3>
          <ul className="suggestions">
            {result.suggestions.map((s, i) => <li key={i}>{s}</li>)}
          </ul>

          {result.visibilityGap?.length > 0 && (
            <>
              <h3>Recruiter Visibility Gap</h3>
              <p className="results-sub">Skills on your resume that don't appear on LinkedIn:</p>
              <div className="skill-chip-group">
                {result.visibilityGap.map((s) => <span key={s} className="chip chip-missing">{s}</span>)}
              </div>
            </>
          )}

          {result.topRoleInsight && (
            <>
              <h3>For Your Top Matched Role: {result.topRoleInsight.role}</h3>
              {result.topRoleInsight.missingSkills.length > 0 ? (
                <div className="skill-chip-group">
                  {result.topRoleInsight.missingSkills.map((s) => <span key={s} className="chip chip-missing">{s}</span>)}
                </div>
              ) : (
                <p className="results-sub">Your LinkedIn already covers this role's key skills. 🎉</p>
              )}
            </>
          )}

          <h3>Detected Skills on LinkedIn</h3>
          <div className="skill-chip-group">
            {result.linkedinSkills.map((s) => <span key={s} className="chip chip-matched">{s}</span>)}
          </div>
        </div>
      )}
    </div>
  );
}

function RadarChart({ values }) {
  const size = 280;
  const center = size / 2;
  const maxRadius = size / 2 - 40;
  const levels = [0.25, 0.5, 0.75, 1];
  const angleStep = (2 * Math.PI) / AXES.length;

  const pointFor = (index, ratio) => {
    const angle = -Math.PI / 2 + index * angleStep;
    return {
      x: center + maxRadius * ratio * Math.cos(angle),
      y: center + maxRadius * ratio * Math.sin(angle),
    };
  };

  const dataPoints = AXES.map((a, i) => pointFor(i, Math.min(100, values[a.key] || 0) / 100));
  const dataPath = dataPoints.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
      {levels.map((lvl) => {
        const ringPoints = AXES.map((_, i) => pointFor(i, lvl));
        return (
          <polygon
            key={lvl}
            points={ringPoints.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke="#232b3d"
            strokeWidth="1"
          />
        );
      })}

      {AXES.map((a, i) => {
        const outer = pointFor(i, 1);
        return (
          <line key={a.key} x1={center} y1={center} x2={outer.x} y2={outer.y} stroke="#232b3d" strokeWidth="1" />
        );
      })}

      <polygon points={dataPath} fill="rgba(245,166,35,0.25)" stroke="#f5a623" strokeWidth="2" />

      {AXES.map((a, i) => {
        const labelPoint = pointFor(i, 1.22);
        return (
          <text
            key={a.key}
            x={labelPoint.x}
            y={labelPoint.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#7c8aa5"
            fontSize="11"
            fontFamily="JetBrains Mono, monospace"
          >
            {a.label}
          </text>
        );
      })}
    </svg>
  );
}

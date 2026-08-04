import React, { useState, useEffect, useRef } from "react";
import api from "../api/axios";

const ANALYSIS_STEPS = [
  "Uploading resume",
  "Extracting text content",
  "Detecting resume sections",
  "Scanning skills & keywords",
  "Checking formatting & readability",
  "Finalizing ATS report",
];

export default function ResumeUpload() {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  const validateAndSetFile = (selected) => {
    setError("");
    if (!selected) return;
    const validTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!validTypes.includes(selected.type)) {
      setError("Please upload a PDF or DOCX file only.");
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
      setError("Please select a PDF or DOCX file first");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);
    setCurrentStep(0);

    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => (prev < ANALYSIS_STEPS.length - 1 ? prev + 1 : prev));
    }, 700);

    const formData = new FormData();
    formData.append("resume", file);

    try {
      const [{ data }] = await Promise.all([
        api.post("/resume/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        }),
        new Promise((resolve) => setTimeout(resolve, ANALYSIS_STEPS.length * 700)),
      ]);
      setResult({ parsedResume: data.parsedResume, atsReport: data.atsReport });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to analyze resume. Please try again.");
    } finally {
      clearInterval(stepInterval);
      setLoading(false);
      setCurrentStep(-1);
    }
  };

  return (
    <div className="dashboard">
      <header>
        <h1>Resume Analysis & ATS Score</h1>
      </header>

      {!loading && (
        <div
          className={`dropzone ${isDragging ? "dragging" : ""} ${file ? "has-file" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx"
            onChange={handleFileChange}
            hidden
          />
          <div className="dropzone-icon">{file ? "📄" : "⬆️"}</div>
          {file ? (
            <>
              <p className="dropzone-filename">{file.name}</p>
              <p className="dropzone-hint">Click to choose a different file</p>
            </>
          ) : (
            <>
              <p className="dropzone-title">Drag & drop your resume here</p>
              <p className="dropzone-hint">or click to browse — PDF or DOCX, max 5MB</p>
            </>
          )}
        </div>
      )}

      {!loading && (
        <button className="analyze-btn" onClick={handleUpload} disabled={!file}>
          Upload & Analyze
        </button>
      )}

      {error && <p className="error">{error}</p>}

      {loading && (
        <div className="steps-box">
          {ANALYSIS_STEPS.map((step, i) => (
            <div
              key={step}
              className={`step-item ${i < currentStep ? "done" : ""} ${i === currentStep ? "active" : ""}`}
            >
              <span className="step-icon">
                {i < currentStep ? "✅" : i === currentStep ? "🔄" : "⬜"}
              </span>
              <span>{step}</span>
            </div>
          ))}
        </div>
      )}

      {result && (
        <div className="results">
          <h2>ATS Score Breakdown</h2>
          <div className="score-grid">
            <ScoreCard label="Overall" value={result.atsReport.overallScore} big />
            <ScoreCard label="Formatting" value={result.atsReport.formattingScore} />
            <ScoreCard label="Keywords" value={result.atsReport.keywordScore} />
            <ScoreCard label="Sections" value={result.atsReport.sectionScore} />
            <ScoreCard label="Readability" value={result.atsReport.readabilityScore} />
          </div>

          <h3>Suggestions to Improve</h3>
          <ul className="suggestions">
            {result.atsReport.suggestions?.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>

          <h3>Extracted Profile</h3>
          <div className="parsed-section">
            <strong>Skills:</strong> {result.parsedResume.skills?.join(", ") || "None detected"}
          </div>
          <div className="parsed-section">
            <strong>Education:</strong>
            <ul>
              {result.parsedResume.education?.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
          <div className="parsed-section">
            <strong>Projects:</strong>
            <ul>
              {result.parsedResume.projects?.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          </div>
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
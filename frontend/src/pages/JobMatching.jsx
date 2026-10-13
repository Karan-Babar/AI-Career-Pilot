import React, { useState } from "react";
import api from "../api/axios";
import { useAppData } from "../context/AppDataContext";

export const JOB_PLATFORMS = [
  { id: "linkedin", label: "LinkedIn" },
  { id: "naukri", label: "Naukri" },
  { id: "indeed", label: "Indeed" },
  { id: "glassdoor", label: "Glassdoor" },
  { id: "wellfound", label: "Wellfound" },
];

export const JOB_TYPE_OPTIONS = ["Any", "Full-time", "Internship", "Entry-level"];
export const WORK_MODE_OPTIONS = ["Any", "Remote", "On-site", "Hybrid"];

const PLATFORM_LABELS = JOB_PLATFORMS.reduce((acc, platform) => {
  acc[platform.id] = platform.label;
  return acc;
}, {});

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function normalizeFilters(filters = {}) {
  return {
    location: (filters.location || "").trim(),
    jobType: filters.jobType || "Any",
    workMode: filters.workMode || "Any",
  };
}

function buildRoleQuery(roleName) {
  return (roleName || "").trim().replace(/\s+/g, " ");
}

const GLASSDOOR_CITY_IDS = {
  pune: 2856202,
  mumbai: 2851180,
  delhi: 2891681,
  "new-delhi": 2891681,
  bengaluru: 2940587,
  bangalore: 2940587,
  hyderabad: 2865319,
  chennai: 2833209,
  calcutta: 2901633,
  kolkata: 2901633,
};

function getGlassdoorUrl(filters, baseQuery) {
  const locationSlug = slugify(filters.location || "india");
  const cityId = GLASSDOOR_CITY_IDS[locationSlug];
  const locationPrefix = `${locationSlug}-india`;
  const keywordSlug = slugify(baseQuery);
  const keywordOffset = locationPrefix.length + 1;
  const keywordEnd = keywordOffset + keywordSlug.length;

  if (cityId) {
    return `https://www.glassdoor.co.in/Job/${locationPrefix}-${keywordSlug}-jobs-SRCH_IL.0,${locationPrefix.length}_IC${cityId}_KO${keywordOffset},${keywordEnd}.htm`;
  }

  const glassdoorQuery = [filters.location, baseQuery]
    .map((value) => (value || "").trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  return `https://www.glassdoor.co.in/Job/jobs.htm?sc.keyword=${encodeURIComponent(glassdoorQuery)}`;
}

export function getSearchLinks(roleName, filters = {}) {
  const f = normalizeFilters(filters);
  const role = (roleName || "").trim();
  const baseQuery = buildRoleQuery(role);
  const encodedBaseQuery = encodeURIComponent(baseQuery);
  const encodedLocation = encodeURIComponent(f.location);

  // LinkedIn can filter work mode and common job types through URL parameters,
  // so they are intentionally not appended to the search keyword.
  const linkedinParams = new URLSearchParams();
  linkedinParams.set("keywords", baseQuery);
  if (f.location) linkedinParams.set("location", f.location);
  if (f.workMode === "On-site") linkedinParams.set("f_WT", "1");
  if (f.workMode === "Remote") linkedinParams.set("f_WT", "2");
  if (f.workMode === "Hybrid") linkedinParams.set("f_WT", "3");
  if (f.jobType === "Full-time") linkedinParams.set("f_JT", "F");
  if (f.jobType === "Internship") linkedinParams.set("f_JT", "I");
  if (f.jobType === "Entry-level") linkedinParams.set("f_E", "2");

  // Naukri: role/location in the path and query. Work mode stays a native wfhType.
  const naukriPath = f.location
    ? `${slugify(role || "jobs")}-jobs-in-${slugify(f.location)}`
    : `${slugify(role || "jobs")}-jobs`;
  let naukriUrl = `https://www.naukri.com/${naukriPath}?k=${encodedBaseQuery}`;
  if (f.location) naukriUrl += `&l=${encodedLocation}`;
  if (f.workMode === "On-site") naukriUrl += "&wfhType=0";
  if (f.workMode === "Remote") naukriUrl += "&wfhType=2";
  if (f.workMode === "Hybrid") naukriUrl += "&wfhType=3";
  naukriUrl += "&nignbevent_src=jobsearchDeskGNB";

  // Indeed: role and location are query text/params; job type uses jt.
  let indeedUrl = `https://www.indeed.com/jobs?q=${encodedBaseQuery}`;
  if (f.location) indeedUrl += `&l=${encodedLocation}`;
  if (f.jobType === "Full-time") indeedUrl += "&jt=fulltime";
  if (f.jobType === "Internship") indeedUrl += "&jt=internship";
  indeedUrl += "&from=searchOnDesktopSerp";

  // Wellfound: only role and optional keyword plus location.
  const wellfoundQuery = [baseQuery, f.location]
    .map((value) => (value || "").trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  return {
    linkedin: `https://www.linkedin.com/jobs/search/?${linkedinParams.toString()}`,
    naukri: naukriUrl,
    indeed: indeedUrl,
    glassdoor: getGlassdoorUrl(f, baseQuery),
    wellfound: `https://wellfound.com/jobs?query=${encodeURIComponent(wellfoundQuery)}`,
  };
}

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
const [jobFilters, setJobFilters] = useState({
  location: "",
  jobType: "Any",
  workMode: "Any",
});

const updateJobFilter = (field, value) => {
  setJobFilters((current) => ({ ...current, [field]: value }));
};
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

      <section className="job-filter-panel">
        <h2>External Job Search Filters</h2>
        <p className="results-sub">
          These filters only affect the external platform links. Your internal role recommendations and match percentages stay the same.
        </p>
        <div className="job-filter-grid">
          <label className="job-filter-field">
            <span>Location</span>
            <input
              type="text"
              value={jobFilters.location}
              onChange={(e) => updateJobFilter("location", e.target.value)}
              placeholder="City, state, or country"
            />
          </label>

          <label className="job-filter-field">
            <span>Job type</span>
            <select value={jobFilters.jobType} onChange={(e) => updateJobFilter("jobType", e.target.value)}>
              {JOB_TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="job-filter-field">
            <span>Work mode</span>
            <select value={jobFilters.workMode} onChange={(e) => updateJobFilter("workMode", e.target.value)}>
              {WORK_MODE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

        </div>
      </section>

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
  <div className="search-links">
    {(() => {
      const links = getSearchLinks(r.role, jobFilters);
      return JOB_PLATFORMS.map((platform) => (
        <a
          key={platform.id}
          href={links[platform.id]}
          target="_blank"
          rel="noopener noreferrer"
          className="search-link-btn"
        >
          🔗 Search on {platform.label}
        </a>
      ));
    })()}
  </div>
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
  <div className="closest-role-block">
    <p className="results-sub">
      This looks closest to a <strong>{compareResult.closestRoleCategory}</strong> role.
    </p>
    <div className="search-links">
      {(() => {
        const links = getSearchLinks(compareResult.closestRoleCategory, jobFilters);
        return JOB_PLATFORMS.map((platform) => (
          <a
            key={platform.id}
            href={links[platform.id]}
            target="_blank"
            rel="noopener noreferrer"
            className="search-link-btn"
          >
            🔗 Search on {platform.label}
          </a>
        ));
      })()}
    </div>
  </div>
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
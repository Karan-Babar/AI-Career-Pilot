import React, { useState, useEffect } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [students, setStudents] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.isAdmin) return;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [statsRes, studentsRes] = await Promise.all([
          api.get("/admin/stats"),
          api.get("/admin/students"),
        ]);
        setStats(statsRes.data);
        setStudents(studentsRes.data.students);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load admin data.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  if (!user?.isAdmin) {
    return (
      <div className="dashboard">
        <div className="placeholder-page">
          <span className="placeholder-icon">🔒</span>
          <h2>Access Restricted</h2>
          <p>This dashboard is only available to placement-cell / admin accounts.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <header>
        <h1>Placement Cell Dashboard</h1>
      </header>

      {error && <p className="error">{error}</p>}
      {loading && <p className="results-sub">Loading batch data...</p>}

      {stats && (
        <>
          <div className="admin-stat-grid">
            <div className="admin-stat-card">
              <span className="admin-stat-value">{stats.totalStudents}</span>
              <span className="admin-stat-label">Total Students</span>
            </div>
            <div className="admin-stat-card">
              <span className="admin-stat-value">{stats.analyzedCount}</span>
              <span className="admin-stat-label">Resumes Analyzed</span>
            </div>
            <div className="admin-stat-card">
              <span className="admin-stat-value">{stats.notAnalyzedCount}</span>
              <span className="admin-stat-label">Not Yet Analyzed</span>
            </div>
            <div className="admin-stat-card highlight">
              <span className="admin-stat-value">{stats.avgScores.overall}</span>
              <span className="admin-stat-label">Avg ATS Score</span>
            </div>
          </div>

          <div className="results" style={{ marginTop: "1.5rem" }}>
            <h2>Score Distribution</h2>
            <div className="bar-chart">
              {Object.entries(stats.scoreDistribution).map(([range, count]) => {
                const max = Math.max(...Object.values(stats.scoreDistribution), 1);
                const pct = Math.round((count / max) * 100);
                return (
                  <div key={range} className="bar-row">
                    <span className="bar-label">{range}</span>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${pct}%` }}></div>
                    </div>
                    <span className="bar-count">{count}</span>
                  </div>
                );
              })}
            </div>

            <h3 style={{ marginTop: "1.6rem" }}>Average Sub-Scores (Batch)</h3>
            <div className="score-grid">
              <MiniScore label="Formatting" value={stats.avgScores.formatting} />
              <MiniScore label="Keywords" value={stats.avgScores.keyword} />
              <MiniScore label="Sections" value={stats.avgScores.section} />
              <MiniScore label="Readability" value={stats.avgScores.readability} />
            </div>

            <h3 style={{ marginTop: "1.6rem" }}>Most Common Skills In Batch</h3>
            <div className="skill-chip-group">
              {stats.topSkills.length > 0 ? (
                stats.topSkills.map((s) => (
                  <span key={s.skill} className="chip chip-matched">
                    {s.skill} · {s.count}
                  </span>
                ))
              ) : (
                <span className="results-sub">No resumes analyzed yet.</span>
              )}
            </div>
          </div>

          <div className="results" style={{ marginTop: "1.5rem" }}>
            <h2>Students</h2>
            <div className="student-table-wrap">
              <table className="student-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Resume</th>
                    <th>ATS Score</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {students?.map((s) => (
                    <tr key={s.id}>
                      <td>{s.name}</td>
                      <td>{s.email}</td>
                      <td>{s.hasResume ? "✅ Uploaded" : "— Not yet"}</td>
                      <td>
                        {s.overallScore != null ? (
                          <span
                            style={{
                              color:
                                s.overallScore >= 75
                                  ? "#2dd4bf"
                                  : s.overallScore >= 50
                                  ? "#f5a623"
                                  : "#ef4444",
                              fontFamily: "var(--font-mono)",
                              fontWeight: 700,
                            }}
                          >
                            {s.overallScore}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>{new Date(s.joinedAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MiniScore({ label, value }) {
  const color = value >= 75 ? "#2dd4bf" : value >= 50 ? "#f5a623" : "#ef4444";
  const pct = value ?? 0;
  return (
    <div className="score-card">
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
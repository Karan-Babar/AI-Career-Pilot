import React from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="dashboard">
      <header>
        <h1>AI Career Pilot</h1>
        <button onClick={handleLogout}>Logout</button>
      </header>
      <p>Welcome, {user?.name} 👋</p>

      <div className="card-grid">
        <div className="card">📄 Resume Analysis — coming next</div>
        <div className="card">✅ ATS Score — coming next</div>
        <div className="card">🎯 Job Matching — coming next</div>
        <div className="card">💼 LinkedIn Analysis — coming next</div>
        <div className="card">📊 Placement Probability — coming next</div>
        <div className="card">🎤 AI Interview Prep — coming next</div>
      </div>
    </div>
  );
}

import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const { data } = await api.post("/auth/login", form);
      login(data);
      navigate("/resume");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid credentials");
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-brand-panel">
        <div className="brand-mark">
          <div className="brand-compass"></div>
          <span className="brand-name">AI Career Pilot</span>
        </div>
        <h1 className="brand-headline">
          Navigate your <span>placement journey</span> with data, not guesswork.
        </h1>
        <p className="brand-subtext">
          Resume analysis, ATS scoring, job matching, and interview prep — all in one flight deck built for placement season.
        </p>
        <div className="flight-path">
          <div className="flight-path-item">
            <span className="flight-path-dot"></span> ATS-READY RESUME SCORING
          </div>
          <div className="flight-path-item">
            <span className="flight-path-dot"></span> SEMANTIC JOB MATCHING
          </div>
          <div className="flight-path-item">
            <span className="flight-path-dot"></span> PLACEMENT PROBABILITY ENGINE
          </div>
        </div>
      </div>

      <div className="auth-form-panel">
        <form className="auth-card" onSubmit={handleSubmit}>
          <h2>Welcome back</h2>
          <p className="auth-sub">Log in to continue your placement prep.</p>
          {error && <p className="error">{error}</p>}
          <label className="field-label">Email</label>
          <input name="email" type="email" placeholder="you@college.edu" onChange={handleChange} required />
          <label className="field-label">Password</label>
          <input name="password" type="password" placeholder="••••••••" onChange={handleChange} required />
          <button type="submit">Log In</button>
          <p>
            New here? <Link to="/register">Create an account</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
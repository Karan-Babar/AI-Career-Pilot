import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const { data } = await api.post("/auth/register", form);
      login(data);
      navigate("/resume");
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
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
          Your career, <span>plotted like a flight path</span>.
        </h1>
        <p className="brand-subtext">
          Create an account to get your resume scored, matched to real job descriptions, and turned into a personalized placement roadmap.
        </p>
        <div className="flight-path">
          <div className="flight-path-item">
            <span className="flight-path-dot"></span> LINKEDIN PROFILE ASSESSMENT
          </div>
          <div className="flight-path-item">
            <span className="flight-path-dot"></span> AI INTERVIEW PREPARATION
          </div>
          <div className="flight-path-item">
            <span className="flight-path-dot"></span> PERSONALIZED CAREER ROADMAP
          </div>
        </div>
      </div>

      <div className="auth-form-panel">
        <form className="auth-card" onSubmit={handleSubmit}>
          <h2>Create your account</h2>
          <p className="auth-sub">Start your placement readiness check-up.</p>
          {error && <p className="error">{error}</p>}
          <label className="field-label">Full Name</label>
          <input name="name" placeholder="Karan babar" onChange={handleChange} required />
          <label className="field-label">Email</label>
          <input name="email" type="email" placeholder="you@college.edu" onChange={handleChange} required />
          <label className="field-label">Password</label>
          <input name="password" type="password" placeholder="••••••••" onChange={handleChange} required />
          <button type="submit">Register</button>
          <p>
            Already have an account? <Link to="/login">Log in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const NAV_LINKS = [
  { to: "/resume", label: "Resume & ATS" },
  { to: "/job-matching", label: "Job Matching" },
  { to: "/linkedin", label: "LinkedIn" },
  { to: "/placement", label: "Placement Probability" },
  { to: "/interview", label: "Interview Prep" },
  { to: "/roadmap", label: "Career Roadmap" },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <div className="brand-compass navbar-compass"></div>
        <span className="brand-name">AI Career Pilot</span>
      </div>

      <div className="navbar-links">
        {NAV_LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) => `navbar-link ${isActive ? "active" : ""}`}
          >
            {link.label}
          </NavLink>
        ))}
      </div>

      <div className="navbar-right">
        <span className="navbar-user">{user?.name}</span>
        <button onClick={handleLogout}>Logout</button>
      </div>
    </nav>
  );
}
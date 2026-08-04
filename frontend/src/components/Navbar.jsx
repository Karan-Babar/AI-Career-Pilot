import React, { useState } from "react";
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
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <nav className="navbar">
      <div className="navbar-top">
        <div className="navbar-brand">
          <div className="brand-compass navbar-compass"></div>
          <span className="brand-name">AI Career Pilot</span>
        </div>

        {/* Desktop inline links */}
        <div className="navbar-links desktop-only">
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
          <span className="navbar-user desktop-only">{user?.name}</span>
          <button className="logout-btn desktop-only" onClick={handleLogout}>
            Logout
          </button>

          {/* Mobile/tablet menu toggle */}
          <button
            className="menu-toggle-btn"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label="Toggle menu"
          >
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {/* Mobile/tablet dropdown */}
      {menuOpen && (
        <div className="navbar-dropdown">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={closeMenu}
              className={({ isActive }) => `navbar-dropdown-link ${isActive ? "active" : ""}`}
            >
              {link.label}
            </NavLink>
          ))}
          <div className="navbar-dropdown-footer">
            <span className="navbar-user">{user?.name}</span>
            <button
              className="logout-btn"
              onClick={() => {
                closeMenu();
                handleLogout();
              }}
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";

const DURATIONS = [4, 8, 12];
const HOURS_PER_WEEK = [3, 5, 8, 10];

const PHASE_LABELS = {
  foundation: "Foundation",
  build: "Build",
  prove: "Prove",
  prepare: "Prepare",
};

const TASK_TYPE_LABELS = {
  resume: "Resume",
  skill: "Skill",
  linkedin: "LinkedIn",
  planning: "Planning",
  project: "Project",
  learning: "Learning",
  documentation: "Documentation",
  profile: "Profile",
  feedback: "Feedback",
  interview: "Interview",
  applications: "Applications",
};

export default function CareerRoadmap() {
  const [roles, setRoles] = useState([]);
  const [roadmap, setRoadmap] = useState(null);
  const [targetRole, setTargetRole] = useState("");
  const [durationWeeks, setDurationWeeks] = useState(8);
  const [hoursPerWeek, setHoursPerWeek] = useState(5);
  const [showPlanner, setShowPlanner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [savingTask, setSavingTask] = useState(null);
  const [error, setError] = useState("");
  const roadmapRef = useRef(null);
  const updateQueueRef = useRef(Promise.resolve());

  const applyRoadmap = (value) => {
    roadmapRef.current = value;
    setRoadmap(value);
  };

  useEffect(() => {
    const loadRoadmap = async () => {
      setLoading(true);
      setError("");

      try {
        const [rolesResponse, roadmapResponse] = await Promise.all([
          api.get("/roadmap/roles"),
          api.get("/roadmap/me"),
        ]);

        setRoles(rolesResponse.data.roles || []);
        const savedRoadmap = roadmapResponse.data.roadmap;
        applyRoadmap(savedRoadmap);

        if (savedRoadmap) {
          setTargetRole(savedRoadmap.targetRole || "");
          setDurationWeeks(savedRoadmap.durationWeeks || 8);
          setHoursPerWeek(savedRoadmap.hoursPerWeek || 5);
        } else {
          setShowPlanner(true);
        }
      } catch (loadError) {
        setError(loadError.response?.data?.message || "Failed to load your career roadmap.");
      } finally {
        setLoading(false);
      }
    };

    loadRoadmap();
  }, []);

  const handleGenerate = async (event) => {
    event.preventDefault();
    if (!targetRole) {
      setError("Choose a target role to generate your roadmap.");
      return;
    }

    setGenerating(true);
    setError("");
    try {
      const { data } = await api.post("/roadmap/generate", {
        targetRole,
        durationWeeks: Number(durationWeeks),
        hoursPerWeek: Number(hoursPerWeek),
      });
      applyRoadmap(data.roadmap);
      setShowPlanner(false);
    } catch (generateError) {
      setError(generateError.response?.data?.message || "Failed to generate your roadmap.");
    } finally {
      setGenerating(false);
    }
  };

  const handleTaskToggle = (task, completed) => {
    const runUpdate = async (attempt = 0) => {
      const currentRoadmap = roadmapRef.current;
      if (!currentRoadmap) return;

      setSavingTask(task.id);
      setError("");
      try {
        const { data } = await api.patch(`/roadmap/tasks/${task.id}`, { completed });
        applyRoadmap(data.roadmap);
      } catch (taskError) {
        if (taskError.response?.status === 409 && taskError.response.data?.roadmap && attempt === 0) {
          applyRoadmap(taskError.response.data.roadmap);
          return runUpdate(attempt + 1);
        }
        setError(taskError.response?.data?.message || "Failed to update that roadmap task.");
      } finally {
        setSavingTask(null);
      }
    };

    // Serialize writes so rapid checkbox clicks cannot overwrite one another.
    updateQueueRef.current = updateQueueRef.current.then(runUpdate, runUpdate);
  };

  const progress = roadmap?.overallProgress || 0;
  const nextAction = roadmap?.nextAction;

  return (
    <div className="dashboard roadmap-page">
      <header>
        <div>
          <h1>Career Flight Plan</h1>
          <p className="results-sub roadmap-header-sub">
            Turn your current profile into a focused, week-by-week action plan.
          </p>
        </div>
        {roadmap && (
          <button className="back-btn" type="button" onClick={() => setShowPlanner((value) => !value)}>
            {showPlanner ? "Close planner" : "Change plan"}
          </button>
        )}
      </header>

      {error && (
        <div className="roadmap-alert" role="alert">
          <span>{error}</span>
          {error.toLowerCase().includes("resume") && (
            <Link to="/resume" className="roadmap-inline-link">Upload your resume</Link>
          )}
        </div>
      )}

      {loading ? (
        <p className="results-sub">Loading your career plan...</p>
      ) : (
        <>
          {showPlanner && (
            <form className="roadmap-planner-card" onSubmit={handleGenerate}>
              <div className="roadmap-planner-heading">
                <span className="roadmap-planner-icon">🧭</span>
                <div>
                  <h2>{roadmap ? "Rebuild your flight plan" : "Build your first flight plan"}</h2>
                  <p>Choose a role and pace. We will turn the gaps in your profile into practical next steps.</p>
                </div>
              </div>

              <div className="roadmap-form-grid">
                <label className="roadmap-field">
                  <span>Target role</span>
                  <select value={targetRole} onChange={(event) => setTargetRole(event.target.value)} required>
                    <option value="">Select a target role</option>
                    {roles.map((role) => <option key={role} value={role}>{role}</option>)}
                  </select>
                </label>

                <label className="roadmap-field">
                  <span>Duration</span>
                  <select value={durationWeeks} onChange={(event) => setDurationWeeks(event.target.value)}>
                    {DURATIONS.map((duration) => <option key={duration} value={duration}>{duration} weeks</option>)}
                  </select>
                </label>

                <label className="roadmap-field">
                  <span>Weekly commitment</span>
                  <select value={hoursPerWeek} onChange={(event) => setHoursPerWeek(event.target.value)}>
                    {HOURS_PER_WEEK.map((hours) => <option key={hours} value={hours}>{hours} hours / week</option>)}
                  </select>
                </label>
              </div>

              <button className="analyze-btn roadmap-generate-btn" type="submit" disabled={generating}>
                {generating ? "Building your plan..." : roadmap ? "Regenerate roadmap" : "Generate my roadmap"}
              </button>
            </form>
          )}

          {roadmap ? (
            <>
              {roadmap.isStale && (
                <div className="roadmap-stale-alert" role="status">
                  <span>Your profile changed since this roadmap was generated. Completed tasks are preserved; regenerate when you are ready.</span>
                  <button className="search-link-btn" type="button" onClick={() => setShowPlanner(true)}>Regenerate plan</button>
                </div>
              )}

              <section className="roadmap-hero">
                <div className="roadmap-hero-copy">
                  <span className="roadmap-eyebrow">TARGET ROLE</span>
                  <h2>{roadmap.targetRole}</h2>
                  <p>{roadmap.durationWeeks}-week plan · {roadmap.hoursPerWeek} hours per week · {roadmap.matchPercent}% current skill match</p>
                  <div className="roadmap-hero-meta">
                    <span>{roadmap.completedTasks}/{roadmap.totalTasks} tasks complete</span>
                    <span>Generated {formatDate(roadmap.generatedAt)}</span>
                  </div>
                </div>
                <div className="roadmap-progress-ring" style={{ background: `conic-gradient(var(--accent-teal) ${progress * 3.6}deg, var(--border-subtle) ${progress * 3.6}deg)` }}>
                  <div className="roadmap-progress-inner">
                    <strong>{progress}%</strong>
                    <span>complete</span>
                  </div>
                </div>
              </section>

              {nextAction && (
                <section className="roadmap-next-action">
                  <span className="roadmap-next-icon">→</span>
                  <div>
                    <span className="roadmap-eyebrow">NEXT BEST ACTION · {nextAction.phaseTitle.toUpperCase()}</span>
                    <h3>{nextAction.title}</h3>
                    <p>{nextAction.description}</p>
                  </div>
                </section>
              )}

              <section className="results roadmap-skill-summary">
                <div className="roadmap-section-heading">
                  <div>
                    <h2>Skill focus</h2>
                    <p className="results-sub">Skills already visible in your resume versus the biggest gaps for this role.</p>
                  </div>
                  <span className="roadmap-match-badge">{roadmap.matchPercent}% match</span>
                </div>
                <div className="roadmap-skill-columns">
                  <div>
                    <h3>Covered</h3>
                    <div className="skill-chip-group">
                      {roadmap.skillSummary?.covered?.length ? roadmap.skillSummary.covered.map((skill) => (
                        <span className="chip chip-matched" key={skill}>{skill}</span>
                      )) : <span className="results-sub">No role skills detected yet.</span>}
                    </div>
                  </div>
                  <div>
                    <h3>Focus next</h3>
                    <div className="skill-chip-group">
                      {roadmap.skillSummary?.missing?.length ? roadmap.skillSummary.missing.map((skill) => (
                        <span className="chip chip-missing" key={skill}>{skill}</span>
                      )) : <span className="results-sub">Your profile covers the core role skills.</span>}
                    </div>
                  </div>
                </div>
              </section>

              <section className="roadmap-timeline">
                <div className="roadmap-section-heading">
                  <div>
                    <h2>Your execution path</h2>
                    <p className="results-sub">Complete the tasks in order. Progress is saved to your profile.</p>
                  </div>
                </div>
                {roadmap.phases?.map((phase) => (
                  <RoadmapPhase
                    key={phase.id}
                    phase={phase}
                    savingTask={savingTask}
                    onTaskToggle={handleTaskToggle}
                  />
                ))}
              </section>
            </>
          ) : (
            !showPlanner && (
              <div className="roadmap-empty-state">
                <span className="placeholder-icon">🧭</span>
                <h2>No roadmap yet</h2>
                <p>Generate a plan to turn your career profile into weekly actions.</p>
                <button className="analyze-btn" type="button" onClick={() => setShowPlanner(true)}>Build my roadmap</button>
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}

function RoadmapPhase({ phase, savingTask, onTaskToggle }) {
  return (
    <article className={`roadmap-phase-card ${phase.status}`}>
      <div className="roadmap-phase-header">
        <div className="roadmap-phase-title-wrap">
          <span className="roadmap-phase-number">{phase.id === "foundation" ? "01" : phase.id === "build" ? "02" : phase.id === "prove" ? "03" : "04"}</span>
          <div>
            <span className="roadmap-eyebrow">{phase.weekLabel.toUpperCase()}</span>
            <h3>{PHASE_LABELS[phase.id] || phase.title}</h3>
          </div>
        </div>
        <div className="roadmap-phase-status-wrap">
          <span className={`roadmap-phase-status ${phase.status}`}>{formatStatus(phase.status)}</span>
          <strong>{phase.progress}%</strong>
        </div>
      </div>

      <p className="roadmap-phase-goal">{phase.goal}</p>
      <div className="roadmap-phase-progress"><span style={{ width: `${phase.progress}%` }}></span></div>

      {phase.project && (
        <div className="roadmap-project-card">
          <span className="roadmap-project-label">PHASE MILESTONE</span>
          <h4>{phase.project.title}</h4>
          <p>{phase.project.description}</p>
        </div>
      )}

      <div className="roadmap-task-list">
        {phase.tasks?.map((task) => (
          <label className={`roadmap-task ${task.completed ? "completed" : ""}`} key={task.id}>
            <input
              type="checkbox"
              checked={task.completed}
              disabled={savingTask === task.id}
              onChange={(event) => onTaskToggle(task, event.target.checked)}
            />
            <span className="roadmap-task-body">
              <strong>{task.title}</strong>
              <span>{task.description}</span>
              <small>
                {TASK_TYPE_LABELS[task.type] || task.type} · {task.estimatedHours}h estimated
                {task.skills?.length ? ` · ${task.skills.slice(0, 2).join(", ")}` : ""}
              </small>
            </span>
          </label>
        ))}
      </div>

      {phase.resources?.length > 0 && (
        <div className="roadmap-resource-list">
          {phase.resources.map((resource) => (
            <Link className="search-link-btn" to={resource.path} key={resource.label}>
              ↗ {resource.label}
            </Link>
          ))}
        </div>
      )}
    </article>
  );
}

function formatStatus(status) {
  if (status === "completed") return "Complete";
  if (status === "in_progress") return "In progress";
  return "Upcoming";
}

function formatDate(value) {
  if (!value) return "recently";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "recently" : date.toLocaleDateString();
}

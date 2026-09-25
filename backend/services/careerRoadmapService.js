const { getRoleMatch, recommendRoles, JOB_ROLES } = require("./jobMatchService");

const SUPPORTED_DURATIONS = [4, 8, 12];
const SUPPORTED_HOURS = [3, 5, 8, 10];

const PHASE_CONFIG = [
  {
    id: "foundation",
    title: "Foundation",
    goal: "Close the most important readiness gaps before you start building.",
  },
  {
    id: "build",
    title: "Build",
    goal: "Turn your target-role knowledge into practical, demonstrable ability.",
  },
  {
    id: "prove",
    title: "Prove",
    goal: "Create visible proof of your skills through a polished project.",
  },
  {
    id: "prepare",
    title: "Prepare",
    goal: "Get ready to explain your work, interview well, and apply with focus.",
  },
];

const GENERIC_SKILL_PATTERNS = [
  /awareness/i,
  /basics/i,
  /exposure/i,
  /familiarity/i,
  /introductory/i,
  /knowledge/i,
  /proficiency/i,
  /concepts?/i,
];

function getRoleOptions() {
  return JOB_ROLES
    .map((role) => role.role)
    .sort((a, b) => a.localeCompare(b));
}

function normalizeText(value) {
  return String(value || "").trim();
}

function getSkillPriority(skill) {
  const value = normalizeText(skill);
  if (!value) return -1000;

  let score = 100 - Math.min(value.length, 60);
  if (GENERIC_SKILL_PATTERNS.some((pattern) => pattern.test(value))) score -= 25;
  if (value.split(/\s+/).length > 4) score -= 20;
  return score;
}

function skillsAreRelated(first, second) {
  const firstWords = first.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const secondWords = second.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  if (!firstWords.length || !secondWords.length) return false;
  if (first.toLowerCase() === second.toLowerCase()) return true;

  const wordsMatch = (a, b) => a === b || a === `${b}s` || `${a}s` === b;
  const [shorter, longer] = firstWords.length <= secondWords.length
    ? [firstWords, secondWords]
    : [secondWords, firstWords];

  return shorter.every((word) => longer.some((candidate) => wordsMatch(word, candidate)));
}

function selectRoadmapSkills(skills, limit = 8) {
  const candidates = [...new Set(skills.map(normalizeText).filter(Boolean))]
    .sort((a, b) => getSkillPriority(b) - getSkillPriority(a));

  const selected = [];
  for (const candidate of candidates) {
    if (selected.some((existing) => skillsAreRelated(existing, candidate))) continue;
    selected.push(candidate);
    if (selected.length === limit) break;
  }

  return selected;
}

function getPhaseRanges(durationWeeks) {
  if (durationWeeks === 4) {
    return [[1, 1], [2, 2], [3, 3], [4, 4]];
  }
  if (durationWeeks === 12) {
    return [[1, 3], [4, 7], [8, 9], [10, 12]];
  }
  return [[1, 2], [3, 5], [6, 6], [7, 8]];
}

function scaleHours(baseHours, hoursPerWeek) {
  return Math.max(1, Math.min(6, Math.round(baseHours * (hoursPerWeek / 5))));
}

function getRoleProjectBase(roleName, focusSkills) {
  const role = roleName.toLowerCase();
  const skillText = focusSkills.length ? focusSkills.slice(0, 3).join(", ") : "the core concepts";

  if (/frontend|full stack|web developer|javascript|ui designer|ux designer|product designer|graphic designer/.test(role)) {
    return {
      title: "Build a polished role-ready web project",
      description: `Create and deploy a responsive project that demonstrates ${skillText}, thoughtful UX, and measurable outcomes.`,
    };
  }

  if (/backend|software engineer|software developer|java|python|php|dotnet|qa|test automation|solutions architect/.test(role)) {
    return {
      title: "Build and deploy a reliable application service",
      description: `Design a small production-style service that demonstrates ${skillText}, testing, documentation, and safe deployment.`,
    };
  }

  if (/data|machine learning|ai|analytics|business analyst|market research|seo|bi analyst/.test(role)) {
    return {
      title: "Create a data-backed project with measurable insights",
      description: `Work with a real dataset, communicate the story clearly, and show how ${skillText} influenced a defensible conclusion.`,
    };
  }

  if (/devops|cloud|site reliability|system engineer|network engineer/.test(role)) {
    return {
      title: "Automate a production-style deployment pipeline",
      description: `Create a repeatable workflow that shows ${skillText}, monitoring, documentation, and safe operational choices.`,
    };
  }

  if (/cyber|security|ethical hacker/.test(role)) {
    return {
      title: "Create a security hardening and incident-response project",
      description: `Document a realistic security assessment that applies ${skillText}, prioritizes risk, and records mitigations clearly.`,
    };
  }

  if (/marketing|content|copywriter|sales|operations|project manager|product manager|business analyst/.test(role)) {
    return {
      title: "Build a professional case study and improvement plan",
      description: `Choose a realistic business problem, apply ${skillText}, and present a clear recommendation with measurable outcomes.`,
    };
  }

  return {
    title: "Build a portfolio project aligned with your target role",
    description: `Create a documented project that demonstrates ${skillText} and gives you evidence to discuss in interviews.`,
  };
}

function getProjectTemplate(phaseId, roleName, focusSkills) {
  const baseProject = getRoleProjectBase(roleName, focusSkills);
  const focusText = focusSkills.length ? focusSkills.slice(0, 3).join(", ") : "the core concepts for this role";

  if (phaseId === "foundation") {
    return {
      title: `Create your ${roleName} readiness baseline`,
      description: `Audit your resume, LinkedIn visibility, and ${focusText} gaps before you start building.`,
    };
  }

  if (phaseId === "prove") {
    return {
      title: `Publish and validate your ${roleName} portfolio project`,
      description: `Deploy your project, document your decisions, and measure how well it demonstrates ${focusText}.`,
    };
  }

  if (phaseId === "prepare") {
    return {
      title: `Run a targeted ${roleName} interview and application sprint`,
      description: `Practice explaining your work, answer role-specific questions, and start tracking targeted applications.`,
    };
  }

  return baseProject;
}

function createTask(id, title, description, type, estimatedHours, skills = []) {
  return {
    id,
    title,
    description,
    type,
    estimatedHours,
    skills,
    completed: false,
    completedAt: null,
  };
}

function buildTasks(phaseId, roleName, focusSkills, context, hoursPerWeek) {
  const project = getProjectTemplate(phaseId, roleName, focusSkills);
  const skillText = focusSkills.length ? focusSkills.slice(0, 3).join(", ") : "the core concepts for this role";
  const linkedinTask = context.linkedinGaps.length > 0
    ? `Close your LinkedIn visibility gaps: ${context.linkedinGaps.slice(0, 3).join(", ")}.`
    : "Rewrite your LinkedIn headline and About section so recruiters can quickly understand your value.";
  const resumeTask = context.atsSuggestions[0]
    ? `Start with this ATS improvement: ${context.atsSuggestions[0]}`
    : "Fix the highest-impact ATS and positioning issues, then add measurable outcomes to your experience and projects.";

  if (phaseId === "foundation") {
    return [
      createTask(
        "foundation-resume",
        `Review your resume for ${roleName} applications`,
        resumeTask,
        "resume",
        scaleHours(2, hoursPerWeek)
      ),
      createTask(
        "foundation-skills",
        `Close your top skill gaps: ${focusSkills.slice(0, 2).join(" and ") || "core concepts"}`,
        `Spend focused time on ${skillText}. Write down what you learn and where you can demonstrate it.`,
        "skill",
        scaleHours(3, hoursPerWeek),
        focusSkills.slice(0, 3)
      ),
      createTask(
        "foundation-linkedin",
        "Improve your professional visibility",
        linkedinTask,
        "linkedin",
        scaleHours(2, hoursPerWeek),
        context.linkedinGaps.slice(0, 3)
      ),
      createTask(
        "foundation-rhythm",
        "Set a consistent weekly preparation rhythm",
        "Block two or three focused learning sessions each week and keep a simple log of what you complete.",
        "planning",
        scaleHours(1, hoursPerWeek)
      ),
    ];
  }

  if (phaseId === "build") {
    return [
      createTask(
        "build-project-plan",
        `Plan your portfolio project: ${project.title}`,
        project.description,
        "project",
        scaleHours(2, hoursPerWeek),
        focusSkills.slice(0, 3)
      ),
      createTask(
        "build-core-workflow",
        `Practice the core workflow for ${roleName}`,
        `Turn ${skillText} into a working feature instead of only watching tutorials.`,
        "skill",
        scaleHours(4, hoursPerWeek),
        focusSkills.slice(0, 3)
      ),
      createTask(
        "build-quality",
        "Add tests, documentation, and failure handling",
        "Make the project understandable to another person by documenting decisions, edge cases, and how to run it.",
        "project",
        scaleHours(3, hoursPerWeek)
      ),
      createTask(
        "build-review",
        "Review one role-specific concept each week",
        "Use your question bank and notes to turn learning into explanations you could give in an interview.",
        "learning",
        scaleHours(2, hoursPerWeek),
        focusSkills.slice(0, 3)
      ),
    ];
  }

  if (phaseId === "prove") {
    return [
      createTask(
        "prove-publish",
        `Deploy and publish ${project.title}`,
        "Put the project somewhere accessible and verify that a new user can understand and use it.",
        "project",
        scaleHours(3, hoursPerWeek)
      ),
      createTask(
        "prove-case-study",
        "Write a case study with measurable outcomes",
        "Explain the problem, your decisions, your contribution, the result, and what you would improve next.",
        "documentation",
        scaleHours(3, hoursPerWeek)
      ),
      createTask(
        "prove-profile",
        "Add the project to your resume and LinkedIn",
        "Use outcome-focused language and include the skills you want recruiters to associate with the project.",
        "profile",
        scaleHours(2, hoursPerWeek),
        focusSkills.slice(0, 3)
      ),
      createTask(
        "prove-feedback",
        "Request feedback and make one improvement",
        "Ask a mentor, peer, or reviewer for feedback and ship a meaningful revision.",
        "feedback",
        scaleHours(2, hoursPerWeek)
      ),
    ];
  }

  return [
    createTask(
      "prepare-interview",
      "Complete five role-specific interview questions",
      "Practice real questions, then review your depth, specificity, and relevance feedback before answering again.",
      "interview",
      scaleHours(3, hoursPerWeek),
      focusSkills.slice(0, 3)
    ),
    createTask(
      "prepare-introduction",
      "Prepare your 30/60/90-second introduction",
      "Practice a concise introduction that connects your background, current focus, and the role you want.",
      "interview",
      scaleHours(1, hoursPerWeek)
    ),
    createTask(
      "prepare-story",
      "Practice explaining your project decisions",
      "Be ready to explain what you built, why you chose your approach, what went wrong, and what you learned.",
      "interview",
      scaleHours(2, hoursPerWeek),
      focusSkills.slice(0, 3)
    ),
    createTask(
      "prepare-apply",
      "Start targeted applications and track responses",
      "Prioritize roles that match your current strengths, tailor your introduction, and record outcomes for review.",
      "applications",
      scaleHours(3, hoursPerWeek)
    ),
  ];
}

function buildResources(phaseId) {
  if (phaseId === "foundation") {
    return [
      { label: "Review Resume & ATS", path: "/resume", type: "internal" },
      { label: "Review Job Matching", path: "/job-matching", type: "internal" },
    ];
  }
  if (phaseId === "build" || phaseId === "prove") {
    return [
      { label: "Open Job Matching", path: "/job-matching", type: "internal" },
      { label: "Update LinkedIn", path: "/linkedin", type: "internal" },
    ];
  }
  return [
    { label: "Open Interview Prep", path: "/interview", type: "internal" },
    { label: "View Placement Readiness", path: "/placement", type: "internal" },
  ];
}

function buildPhase(config, weekRange, roleName, focusSkills, context, hoursPerWeek) {
  const [startWeek, endWeek] = weekRange;
  const tasks = buildTasks(config.id, roleName, focusSkills, context, hoursPerWeek);
  const project = getProjectTemplate(config.id, roleName, focusSkills);

  return {
    id: config.id,
    title: config.title,
    goal: config.goal,
    startWeek,
    endWeek,
    weekLabel: startWeek === endWeek ? `Week ${startWeek}` : `Weeks ${startWeek}-${endWeek}`,
    skills: focusSkills.slice(0, 5),
    tasks,
    project,
    resources: buildResources(config.id),
    status: "upcoming",
    progress: 0,
    completedTasks: 0,
    totalTasks: tasks.length,
  };
}

function getNextAction(phases) {
  for (const phase of phases) {
    const task = phase.tasks.find((item) => !item.completed);
    if (task) {
      return {
        phaseId: phase.id,
        phaseTitle: phase.title,
        taskId: task.id,
        title: task.title,
        description: task.description,
      };
    }
  }

  return {
    phaseId: phases[phases.length - 1]?.id || null,
    phaseTitle: "Roadmap complete",
    taskId: null,
    title: "Your roadmap is complete",
    description: "Review your progress, refresh your resume, and keep practicing.",
  };
}

function recalculateRoadmap(roadmap) {
  let totalTasks = 0;
  let completedTasks = 0;
  let currentPhase = null;

  for (const phase of roadmap.phases) {
    const phaseCompleted = phase.tasks.filter((task) => task.completed).length;
    phase.completedTasks = phaseCompleted;
    phase.totalTasks = phase.tasks.length;
    phase.progress = phase.totalTasks
      ? Math.round((phaseCompleted / phase.totalTasks) * 100)
      : 0;

    if (phase.progress === 100) {
      phase.status = "completed";
    } else if (currentPhase === null) {
      phase.status = "in_progress";
      currentPhase = phase.id;
    } else {
      phase.status = phaseCompleted > 0 ? "in_progress" : "upcoming";
    }

    totalTasks += phase.totalTasks;
    completedTasks += phaseCompleted;
  }

  roadmap.totalTasks = totalTasks;
  roadmap.completedTasks = completedTasks;
  roadmap.overallProgress = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;
  roadmap.currentPhase = currentPhase;
  roadmap.nextAction = getNextAction(roadmap.phases);
  return roadmap;
}

function generateRoadmap(user, options = {}) {
  const resumeText = normalizeText(user?.resumeText);
  if (resumeText.length < 50) {
    return { error: "Please upload and analyze your resume before generating a career roadmap." };
  }

  let targetRole = normalizeText(options.targetRole);
  if (!targetRole) {
    const recommendation = recommendRoles(resumeText, 1).recommendations[0];
    targetRole = recommendation?.role || "";
  }

  if (!targetRole) {
    return { error: "We could not determine a target role. Please choose one and try again." };
  }

  const roleMatch = getRoleMatch(resumeText, targetRole);
  if (!roleMatch) {
    return { error: "That target role was not found in the role dataset." };
  }

  const durationWeeks = Number(options.durationWeeks) || 8;
  const hoursPerWeek = Number(options.hoursPerWeek) || 5;

  if (!SUPPORTED_DURATIONS.includes(durationWeeks)) {
    return { error: "Choose a roadmap duration of 4, 8, or 12 weeks." };
  }
  if (!SUPPORTED_HOURS.includes(hoursPerWeek)) {
    return { error: "Choose 3, 5, 8, or 10 hours per week." };
  }

  const missingSkills = selectRoadmapSkills(roleMatch.missingSkills, 8);
  const coveredSkills = roleMatch.matchedSkills.slice(0, 12);
  const focusSkills = missingSkills.length ? missingSkills : ["role fundamentals"];
  const linkedinGaps = Array.isArray(user.linkedinReport?.visibilityGap)
    ? user.linkedinReport.visibilityGap.slice(0, 6)
    : [];

  const context = {
    linkedinGaps,
    atsSuggestions: Array.isArray(user.atsReport?.suggestions)
      ? user.atsReport.suggestions.slice(0, 3)
      : [],
  };

  const phases = getPhaseRanges(durationWeeks).map((weekRange, index) =>
    buildPhase(PHASE_CONFIG[index], weekRange, roleMatch.role, focusSkills, context, hoursPerWeek)
  );

  const roadmap = {
    version: 1,
    revision: 1,
    targetRole: roleMatch.role,
    durationWeeks,
    hoursPerWeek,
    generatedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isStale: false,
    matchPercent: roleMatch.matchPercent,
    skillSummary: {
      covered: coveredSkills,
      missing: missingSkills,
    },
    phases,
  };

  return { roadmap: recalculateRoadmap(roadmap) };
}

function updateRoadmapTask(roadmap, taskId, completed) {
  if (!roadmap || !Array.isArray(roadmap.phases)) {
    return { error: "No roadmap exists yet. Generate one first." };
  }

  const currentRevision = Number.isFinite(Number(roadmap.revision)) ? Number(roadmap.revision) : 0;

  let taskFound = false;
  for (const phase of roadmap.phases) {
    const task = phase.tasks.find((item) => item.id === taskId);
    if (task) {
      task.completed = Boolean(completed);
      task.completedAt = task.completed ? new Date().toISOString() : null;
      taskFound = true;
      break;
    }
  }

  if (!taskFound) return { error: "Roadmap task not found." };

  roadmap.revision = currentRevision + 1;
  roadmap.updatedAt = new Date().toISOString();
  return { roadmap: recalculateRoadmap(roadmap) };
}

module.exports = {
  SUPPORTED_DURATIONS,
  SUPPORTED_HOURS,
  getRoleOptions,
  generateRoadmap,
  updateRoadmapTask,
};

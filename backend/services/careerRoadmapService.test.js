const test = require("node:test");
const assert = require("node:assert/strict");
const {
  getRoleOptions,
  generateRoadmap,
  updateRoadmapTask,
} = require("./careerRoadmapService");

const sampleUser = {
  resumeText: "I am a frontend developer with experience in React, JavaScript, HTML, CSS, Node.js, Git, and responsive web application development. I built dashboard projects and worked with REST APIs.",
  parsedResume: {
    skills: ["React", "JavaScript", "HTML", "CSS", "Node.js", "Git"],
  },
  atsReport: {
    suggestions: ["Add measurable results to your projects."],
  },
  linkedinReport: {
    visibilityGap: ["Testing", "TypeScript"],
  },
};

test("exposes the available target roles", () => {
  const roles = getRoleOptions();

  assert.ok(roles.length > 50);
  assert.ok(roles.includes("Frontend Developer"));
});

test("requires an analyzed resume before generating a roadmap", () => {
  const result = generateRoadmap({ resumeText: "" }, { targetRole: "Frontend Developer" });

  assert.match(result.error, /resume/i);
});

test("generates a four-phase roadmap with actionable tasks", () => {
  const result = generateRoadmap(sampleUser, {
    targetRole: "Frontend Developer",
    durationWeeks: 8,
    hoursPerWeek: 5,
  });

  assert.equal(result.error, undefined);
  assert.equal(result.roadmap.targetRole, "Frontend Developer");
  assert.equal(result.roadmap.durationWeeks, 8);
  assert.equal(result.roadmap.phases.length, 4);
  assert.equal(result.roadmap.totalTasks, 16);
  assert.equal(result.roadmap.overallProgress, 0);
  assert.equal(result.roadmap.revision, 1);
  assert.equal(new Set(result.roadmap.phases.map((phase) => phase.project.title)).size, 4);
  assert.equal(result.roadmap.phases[0].status, "in_progress");
  assert.equal(result.roadmap.nextAction.taskId, "foundation-resume");
  assert.ok(result.roadmap.skillSummary.missing.length > 0);
});

test("preserves multiple completed tasks across sequential updates", () => {
  const generated = generateRoadmap(sampleUser, {
    targetRole: "Frontend Developer",
    durationWeeks: 8,
    hoursPerWeek: 5,
  });

  const first = updateRoadmapTask(generated.roadmap, "foundation-resume", true);
  const second = updateRoadmapTask(first.roadmap, "foundation-skills", true);

  assert.equal(second.roadmap.completedTasks, 2);
  assert.equal(second.roadmap.overallProgress, 13);
  assert.equal(second.roadmap.revision, 3);
  assert.equal(second.roadmap.phases[0].tasks[0].completed, true);
  assert.equal(second.roadmap.phases[0].tasks[1].completed, true);
});

test("normalizes legacy string revisions without rejecting the update", () => {
  const generated = generateRoadmap(sampleUser, {
    targetRole: "Frontend Developer",
    durationWeeks: 8,
    hoursPerWeek: 5,
  });
  const legacyRoadmap = { ...generated.roadmap, revision: "1" };

  const result = updateRoadmapTask(legacyRoadmap, "foundation-resume", true);

  assert.equal(result.error, undefined);
  assert.equal(result.roadmap.revision, 2);
  assert.equal(result.roadmap.completedTasks, 1);
});

test("updates task progress and advances the current phase", () => {
  const generated = generateRoadmap(sampleUser, {
    targetRole: "Frontend Developer",
    durationWeeks: 8,
    hoursPerWeek: 5,
  });

  let roadmap = generated.roadmap;
  for (const task of roadmap.phases[0].tasks) {
    const result = updateRoadmapTask(roadmap, task.id, true);
    assert.equal(result.error, undefined);
    roadmap = result.roadmap;
  }

  assert.equal(roadmap.completedTasks, 4);
  assert.equal(roadmap.overallProgress, 25);
  assert.equal(roadmap.currentPhase, "build");
  assert.equal(roadmap.phases[0].status, "completed");
  assert.equal(roadmap.phases[1].status, "in_progress");
});

const test = require("node:test");
const assert = require("node:assert/strict");
const { scoreAnswer } = require("./interviewScoreService");

test("rejects obvious keyboard-mashing as invalid", () => {
  const result = scoreAnswer(
    "fe1",
    "kjhdkas dkjsjhd djdjhd ff fdg gh h fhh"
  );

  assert.equal(result.status, "invalid");
  assert.equal(result.isValid, false);
  assert.equal(result.scoreAvailable, false);
  assert.equal(result.overallScore, 0);
  assert.equal(result.depthScore, 0);
  assert.equal(result.specificityScore, 0);
  assert.equal(result.relevanceScore, 0);
  assert.match(result.message, /invalid/i);
});

test("does not assign a normal score to a short meaningful answer", () => {
  const result = scoreAnswer("fe1", "I built a React application.");

  assert.equal(result.status, "needs_more_detail");
  assert.equal(result.scoreAvailable, false);
  assert.equal(result.overallScore, null);
  assert.match(result.message, /more detail/i);
});

test("scores a relevant, detailed answer", () => {
  const result = scoreAnswer(
    "fe1",
    "I designed a React dashboard that reduced page load time by 40 percent by using component memoization, lazy loading, and browser profiling to identify the performance bottleneck."
  );

  assert.equal(result.status, "scored");
  assert.equal(result.isValid, true);
  assert.equal(result.scoreAvailable, true);
  assert.equal(typeof result.overallScore, "number");
  assert.ok(result.overallScore > 0);
});

test("marks a long, readable but unrelated answer as irrelevant", () => {
  const result = scoreAnswer(
    "fe1",
    "I like cricket and movies and spend time with my friends during weekends because they are fun and relaxing."
  );

  assert.equal(result.status, "irrelevant");
  assert.equal(result.scoreAvailable, false);
  assert.equal(result.overallScore, 0);
  assert.match(result.message, /does not appear to address/i);
});

// planner.test.js
// Automated checks for the logic in planner.js.
// Run them with:  npm test   (or:  node --test)

const test = require("node:test");
const assert = require("node:assert/strict");
const Planner = require("./planner.js");

test("addDays moves forwards and backwards, across months", () => {
  assert.equal(Planner.addDays("2026-10-30", 3), "2026-11-02");
  assert.equal(Planner.addDays("2026-03-01", -1), "2026-02-28");
});

test("startOfWeek returns the Monday of that week", () => {
  assert.equal(Planner.startOfWeek("2026-10-26"), "2026-10-26"); // Monday
  assert.equal(Planner.startOfWeek("2026-10-28"), "2026-10-26"); // Wednesday
  assert.equal(Planner.startOfWeek("2026-11-01"), "2026-10-26"); // Sunday
});

test("getWeeks lists consecutive Mondays", () => {
  assert.deepEqual(Planner.getWeeks("2026-10-26", 3), ["2026-10-26", "2026-11-02", "2026-11-09"]);
});

test("assignmentCoversWeek checks for any overlap with the week", () => {
  const a = { start: "2026-10-29", end: "2026-11-03" }; // Thursday to next Tuesday
  assert.equal(Planner.assignmentCoversWeek(a, "2026-10-19"), false);
  assert.equal(Planner.assignmentCoversWeek(a, "2026-10-26"), true);
  assert.equal(Planner.assignmentCoversWeek(a, "2026-11-02"), true);
  assert.equal(Planner.assignmentCoversWeek(a, "2026-11-09"), false);
});

test("hoursForPersonInWeek adds up only that person's assignments", () => {
  const assignments = [
    { personId: "p1", start: "2026-10-26", end: "2026-11-08", hoursPerWeek: 20 },
    { personId: "p1", start: "2026-11-02", end: "2026-11-08", hoursPerWeek: 30 },
    { personId: "p2", start: "2026-10-26", end: "2026-11-08", hoursPerWeek: 40 },
  ];
  assert.equal(Planner.hoursForPersonInWeek(assignments, "p1", "2026-10-26"), 20);
  assert.equal(Planner.hoursForPersonInWeek(assignments, "p1", "2026-11-02"), 50);
  assert.equal(Planner.hoursForPersonInWeek(assignments, "p1", "2026-11-09"), 0);
});

test("getLoadLevel compares booked hours with capacity", () => {
  assert.equal(Planner.getLoadLevel(0, 40), "empty");
  assert.equal(Planner.getLoadLevel(20, 40), "ok");
  assert.equal(Planner.getLoadLevel(40, 40), "full");
  assert.equal(Planner.getLoadLevel(50, 40), "over");
});

test("validateAssignment reports missing or wrong values", () => {
  const good = { personId: "p1", projectId: "j1", start: "2026-10-26", end: "2026-11-01", hoursPerWeek: 10 };
  assert.deepEqual(Planner.validateAssignment(good), []);

  const backwards = { ...good, end: "2026-10-01" };
  assert.deepEqual(Planner.validateAssignment(backwards), ["The end date must be on or after the start date."]);

  assert.equal(Planner.validateAssignment({}).length, 4);
});

test("createSampleData links every assignment to a real person and project", () => {
  const data = Planner.createSampleData("2026-10-28");
  for (const a of data.assignments) {
    assert.ok(data.people.some((p) => p.id === a.personId));
    assert.ok(data.projects.some((p) => p.id === a.projectId));
    assert.deepEqual(Planner.validateAssignment(a), []);
  }
});

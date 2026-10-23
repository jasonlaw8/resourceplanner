// planner.js
// ---------------------------------------------------------------------------
// The "brain" of the resource planner. Everything in this file is plain logic:
// it never touches the web page. Keeping logic separate from the page makes it
// easy to test (see planner.test.js) and easy to reason about.
//
// Key ideas:
//   - A "person" has a weekly capacity in hours (e.g. 40).
//   - A "project" is something people work on.
//   - An "assignment" says: person X works on project Y for N hours per week,
//     from a start date to an end date.
//   - The planner adds up assignments week by week to show who is free,
//     who is fully booked and who is overbooked.
//
// Dates are stored as text in the form "YYYY-MM-DD" (for example "2026-10-26").
// All date maths uses UTC so that time zones and daylight saving never shift a
// date by one day.
// ---------------------------------------------------------------------------

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Turn "2026-10-26" into a Date object (midnight UTC).
function parseISODate(text) {
  const [year, month, day] = text.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

// Turn a Date object back into "YYYY-MM-DD" text.
function toISODate(date) {
  return date.toISOString().slice(0, 10);
}

// Add (or subtract, if negative) a number of days to a "YYYY-MM-DD" date.
function addDays(isoDate, days) {
  const date = parseISODate(isoDate);
  return toISODate(new Date(date.getTime() + days * MS_PER_DAY));
}

// Find the Monday of the week that contains the given date.
function startOfWeek(isoDate) {
  const day = parseISODate(isoDate).getUTCDay(); // 0 = Sunday ... 6 = Saturday
  const daysSinceMonday = (day + 6) % 7; // Monday -> 0, Sunday -> 6
  return addDays(isoDate, -daysSinceMonday);
}

// Today's date as "YYYY-MM-DD" (in the user's local time zone).
function today() {
  const now = new Date();
  const local = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  return toISODate(local);
}

// Build a list of week start dates (Mondays), e.g. 8 weeks from a given Monday.
function getWeeks(firstMonday, count) {
  const weeks = [];
  for (let i = 0; i < count; i++) {
    weeks.push(addDays(firstMonday, i * 7));
  }
  return weeks;
}

// Does this assignment overlap the week that starts on `weekStart` (a Monday)?
// Because dates are "YYYY-MM-DD" text, comparing them as text works correctly.
function assignmentCoversWeek(assignment, weekStart) {
  const weekEnd = addDays(weekStart, 6); // the Sunday
  return assignment.start <= weekEnd && assignment.end >= weekStart;
}

// All assignments for one person that fall in a given week.
function assignmentsForPersonInWeek(assignments, personId, weekStart) {
  return assignments.filter(
    (a) => a.personId === personId && assignmentCoversWeek(a, weekStart)
  );
}

// Total booked hours for one person in a given week.
function hoursForPersonInWeek(assignments, personId, weekStart) {
  return assignmentsForPersonInWeek(assignments, personId, weekStart).reduce(
    (total, a) => total + a.hoursPerWeek,
    0
  );
}

// Describe how busy someone is, so the page can colour the cell.
//   "empty" -> nothing booked
//   "ok"    -> booked, with room to spare
//   "full"  -> exactly at capacity
//   "over"  -> more hours booked than they have
function getLoadLevel(hours, capacity) {
  if (hours === 0) return "empty";
  if (hours < capacity) return "ok";
  if (hours === capacity) return "full";
  return "over";
}

// Check an assignment before saving it. Returns a list of problems
// (an empty list means everything is fine).
function validateAssignment(assignment) {
  const errors = [];
  if (!assignment.personId) errors.push("Pick a person.");
  if (!assignment.projectId) errors.push("Pick a project.");
  if (!assignment.start || !assignment.end) {
    errors.push("Pick a start and end date.");
  } else if (assignment.end < assignment.start) {
    errors.push("The end date must be on or after the start date.");
  }
  if (!(assignment.hoursPerWeek > 0)) {
    errors.push("Hours per week must be more than 0.");
  }
  return errors;
}

// Make a short random id like "k3j9x2a1", used to tell items apart.
function createId() {
  return Math.random().toString(36).slice(2, 10);
}

// Some example data so the planner isn't empty the first time you open it.
function createSampleData(fromDate) {
  const monday = startOfWeek(fromDate);
  const people = [
    { id: "p1", name: "Alex Kim", role: "Developer", capacity: 40 },
    { id: "p2", name: "Sam Patel", role: "Designer", capacity: 32 },
    { id: "p3", name: "Jordan Lee", role: "Project Manager", capacity: 40 },
  ];
  const projects = [
    { id: "j1", name: "Website Redesign", color: "#4f7cff" },
    { id: "j2", name: "Mobile App", color: "#22a06b" },
    { id: "j3", name: "Internal Tools", color: "#e5793a" },
  ];
  const assignments = [
    { id: "a1", personId: "p1", projectId: "j1", start: monday, end: addDays(monday, 27), hoursPerWeek: 24 },
    { id: "a2", personId: "p1", projectId: "j2", start: addDays(monday, 14), end: addDays(monday, 41), hoursPerWeek: 24 },
    { id: "a3", personId: "p2", projectId: "j1", start: monday, end: addDays(monday, 20), hoursPerWeek: 32 },
    { id: "a4", personId: "p3", projectId: "j1", start: monday, end: addDays(monday, 55), hoursPerWeek: 10 },
    { id: "a5", personId: "p3", projectId: "j3", start: addDays(monday, 7), end: addDays(monday, 34), hoursPerWeek: 20 },
  ];
  return { people, projects, assignments };
}

// Gather everything into one object. In the browser it becomes `window.Planner`.
const Planner = {
  parseISODate,
  toISODate,
  addDays,
  startOfWeek,
  today,
  getWeeks,
  assignmentCoversWeek,
  assignmentsForPersonInWeek,
  hoursForPersonInWeek,
  getLoadLevel,
  validateAssignment,
  createId,
  createSampleData,
};

// This line lets Node.js (used for the tests) load this file too.
// In the browser `module` doesn't exist, so the line is skipped.
if (typeof module !== "undefined") {
  module.exports = Planner;
}

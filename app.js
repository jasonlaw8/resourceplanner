// app.js
// ---------------------------------------------------------------------------
// This file connects the page (index.html) to the logic (planner.js).
// It does three jobs:
//   1. Keeps the app's data in one `state` object and saves it in the browser.
//   2. Listens for clicks and form submissions.
//   3. Re-draws the page whenever the data changes (the `render` function).
// ---------------------------------------------------------------------------

const STORAGE_KEY = "resource-planner-data";
const WEEKS_TO_SHOW = 8;

// ----- 1. State: all the app's data lives here -----

// `state` holds the people, projects and assignments.
let state = loadState();

// The Monday of the first week shown in the grid.
let firstWeek = Planner.startOfWeek(Planner.today());

// Read saved data from the browser's localStorage.
// The first time the app runs there is nothing saved, so we use sample data.
function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (error) {
    console.warn("Could not read saved data, starting fresh.", error);
  }
  return Planner.createSampleData(Planner.today());
}

// Save the current data so it is still there after a page refresh.
function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn("Could not save data.", error);
  }
}

// Call this after every change: it saves, then re-draws the page.
function update() {
  saveState();
  render();
}

// Small helpers to look things up by id.
function findPerson(id) {
  return state.people.find((p) => p.id === id);
}
function findProject(id) {
  return state.projects.find((p) => p.id === id);
}

// ----- 2. Drawing the page -----

function render() {
  renderGrid();
  renderPeople();
  renderProjects();
  renderAssignments();
  renderAssignmentFormOptions();
}

// Shorthand for creating an HTML element with some text and a CSS class.
function el(tag, text, className) {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className) element.className = className;
  return element;
}

// Format "2026-10-26" as "26 Oct" for the grid headings.
function shortDate(isoDate) {
  return Planner.parseISODate(isoDate).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

// The big table: one row per person, one column per week.
function renderGrid() {
  const table = document.getElementById("planner-grid");
  const emptyMessage = document.getElementById("grid-empty");
  table.innerHTML = "";

  emptyMessage.hidden = state.people.length > 0;
  if (state.people.length === 0) return;

  const weeks = Planner.getWeeks(firstWeek, WEEKS_TO_SHOW);
  const thisWeek = Planner.startOfWeek(Planner.today());

  // Heading row: "Person", then one cell per week.
  const headRow = el("tr");
  headRow.appendChild(el("th", "Person"));
  for (const week of weeks) {
    const th = el("th", "Week of " + shortDate(week));
    if (week === thisWeek) th.classList.add("current-week");
    headRow.appendChild(th);
  }
  const thead = el("thead");
  thead.appendChild(headRow);
  table.appendChild(thead);

  // One row for each person.
  const tbody = el("tbody");
  for (const person of state.people) {
    const row = el("tr");

    const nameCell = el("th");
    nameCell.appendChild(el("div", person.name, "person-name"));
    nameCell.appendChild(el("div", `${person.role || "No role"} · ${person.capacity}h/wk`, "muted"));
    row.appendChild(nameCell);

    for (const week of weeks) {
      row.appendChild(renderWeekCell(person, week));
    }
    tbody.appendChild(row);
  }
  table.appendChild(tbody);
}

// One cell of the grid: total hours plus a coloured bar per project.
function renderWeekCell(person, week) {
  const items = Planner.assignmentsForPersonInWeek(state.assignments, person.id, week);
  const hours = Planner.hoursForPersonInWeek(state.assignments, person.id, week);
  const level = Planner.getLoadLevel(hours, person.capacity);

  const cell = el("td", undefined, "week-cell level-" + level);
  cell.appendChild(el("div", hours === 0 ? "–" : `${hours} / ${person.capacity}h`, "cell-total"));

  for (const assignment of items) {
    const project = findProject(assignment.projectId);
    const chip = el("div", `${project ? project.name : "?"} ${assignment.hoursPerWeek}h`, "chip");
    chip.style.borderLeftColor = project ? project.color : "#999";
    cell.appendChild(chip);
  }
  return cell;
}

// A list item with a label and a "Remove" button.
function listItem(label, detail, onRemove, color) {
  const li = el("li");
  const text = el("div");
  const title = el("span", label, "item-title");
  if (color) {
    const dot = el("i", undefined, "dot");
    dot.style.background = color;
    text.appendChild(dot);
  }
  text.appendChild(title);
  if (detail) text.appendChild(el("div", detail, "muted"));
  li.appendChild(text);

  const button = el("button", "Remove", "link-button");
  button.type = "button";
  button.addEventListener("click", onRemove);
  li.appendChild(button);
  return li;
}

function renderPeople() {
  const list = document.getElementById("people-list");
  list.innerHTML = "";
  for (const person of state.people) {
    list.appendChild(
      listItem(person.name, `${person.role || "No role"} · ${person.capacity}h/wk`, () => removePerson(person.id))
    );
  }
}

function renderProjects() {
  const list = document.getElementById("project-list");
  list.innerHTML = "";
  for (const project of state.projects) {
    list.appendChild(listItem(project.name, "", () => removeProject(project.id), project.color));
  }
}

function renderAssignments() {
  const list = document.getElementById("assignment-list");
  list.innerHTML = "";
  // Show the assignments that start soonest first.
  const sorted = [...state.assignments].sort((a, b) => a.start.localeCompare(b.start));
  for (const assignment of sorted) {
    const person = findPerson(assignment.personId);
    const project = findProject(assignment.projectId);
    list.appendChild(
      listItem(
        `${person ? person.name : "?"} → ${project ? project.name : "?"}`,
        `${assignment.hoursPerWeek}h/wk · ${shortDate(assignment.start)} to ${shortDate(assignment.end)}`,
        () => removeAssignment(assignment.id),
        project ? project.color : undefined
      )
    );
  }
}

// Fill the Person and Project drop-downs in the assignment form.
function renderAssignmentFormOptions() {
  const form = document.getElementById("assignment-form");
  fillSelect(form.elements.personId, state.people, "Choose a person");
  fillSelect(form.elements.projectId, state.projects, "Choose a project");
}

function fillSelect(select, items, placeholder) {
  const previous = select.value; // keep the user's choice when we re-draw
  select.innerHTML = "";
  const empty = el("option", placeholder);
  empty.value = "";
  select.appendChild(empty);
  for (const item of items) {
    const option = el("option", item.name);
    option.value = item.id;
    select.appendChild(option);
  }
  select.value = items.some((i) => i.id === previous) ? previous : "";
}

// ----- 3. Changing the data -----

function removePerson(id) {
  if (!confirm("Remove this person and all of their assignments?")) return;
  state.people = state.people.filter((p) => p.id !== id);
  state.assignments = state.assignments.filter((a) => a.personId !== id);
  update();
}

function removeProject(id) {
  if (!confirm("Remove this project and all of its assignments?")) return;
  state.projects = state.projects.filter((p) => p.id !== id);
  state.assignments = state.assignments.filter((a) => a.projectId !== id);
  update();
}

function removeAssignment(id) {
  state.assignments = state.assignments.filter((a) => a.id !== id);
  update();
}

// ----- 4. Wiring up the forms and buttons -----

document.getElementById("person-form").addEventListener("submit", (event) => {
  event.preventDefault(); // stop the browser from reloading the page
  const form = event.target;
  state.people.push({
    id: Planner.createId(),
    name: form.elements.name.value.trim(),
    role: form.elements.role.value.trim(),
    capacity: Number(form.elements.capacity.value),
  });
  form.reset();
  update();
});

document.getElementById("project-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.target;
  state.projects.push({
    id: Planner.createId(),
    name: form.elements.name.value.trim(),
    color: form.elements.color.value,
  });
  form.reset();
  update();
});

document.getElementById("assignment-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.target;
  const assignment = {
    id: Planner.createId(),
    personId: form.elements.personId.value,
    projectId: form.elements.projectId.value,
    start: form.elements.start.value,
    end: form.elements.end.value,
    hoursPerWeek: Number(form.elements.hoursPerWeek.value),
  };

  const errors = Planner.validateAssignment(assignment);
  document.getElementById("assignment-errors").textContent = errors.join(" ");
  if (errors.length > 0) return;

  state.assignments.push(assignment);
  form.reset();
  update();
});

document.getElementById("prev-weeks").addEventListener("click", () => {
  firstWeek = Planner.addDays(firstWeek, -7 * 4);
  renderGrid();
});
document.getElementById("next-weeks").addEventListener("click", () => {
  firstWeek = Planner.addDays(firstWeek, 7 * 4);
  renderGrid();
});
document.getElementById("this-week").addEventListener("click", () => {
  firstWeek = Planner.startOfWeek(Planner.today());
  renderGrid();
});

document.getElementById("load-sample").addEventListener("click", () => {
  if (!confirm("Replace your current data with sample data?")) return;
  state = Planner.createSampleData(Planner.today());
  update();
});
document.getElementById("clear-all").addEventListener("click", () => {
  if (!confirm("Delete all people, projects and assignments?")) return;
  state = { people: [], projects: [], assignments: [] };
  update();
});

// Draw the page for the first time.
render();

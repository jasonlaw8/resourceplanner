# Resource Planner

A simple web app that shows **who is working on what, week by week**, and
highlights people who have free time or are overbooked.

- Add **people** and how many hours a week they can work.
- Add **projects**, each with a colour.
- Add **assignments**: "this person works on this project for N hours a week,
  from this date to that date".
- The **weekly plan** table adds it all up:
  - 🟩 green: has free time
  - 🟨 yellow: fully booked
  - 🟥 red: overbooked

Your data is saved in your browser, so it's still there when you come back.

## How to run it

There's nothing to install. Open `index.html` in your web browser (double-click
it, or drag it into a browser window).

The first time you open it, it shows some sample data so you can see how it
works. Click **Clear everything** to start with an empty planner.

## How the code is organised

| File              | What it does                                                                          |
| ----------------- | ------------------------------------------------------------------------------------- |
| `index.html`      | The structure of the page: headings, forms, buttons and the table.                    |
| `styles.css`      | How the page looks: colours, spacing, layout.                                         |
| `planner.js`      | The logic: date maths, adding up hours, checking form input. Doesn't touch the page.  |
| `app.js`          | Connects the page to the logic: reacts to clicks and redraws the page.                |
| `planner.test.js` | Automated tests that check `planner.js` gives the right answers.                      |

A good place to start reading is `planner.js`, then `app.js`. Both have
comments explaining each part.

**How data flows:** every change (adding or removing something) updates the
`state` object in `app.js`, then calls `update()`. That saves the data and calls
`render()`, which redraws the page from scratch.

## Running the tests

You need [Node.js](https://nodejs.org/) (version 18 or newer) for this step only.

```bash
npm test
```

You should see `# pass 8` and `# fail 0`.

## Ideas for what to build next

- **Edit** people, projects and assignments, not just add and remove them.
- Click a cell in the weekly plan to add an assignment for that person and week.
- Show a **project view**: how many hours each project gets per week.
- **Export / import** the data as a file, so you can back it up or share it.
- Add **holidays / time off** that reduce someone's capacity for a week.

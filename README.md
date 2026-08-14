Order list assessment

Install and run

cd app
npm install
npm run dev

Then open the local URL it prints.

What it does

An order list of 5,000 rows generated locally in the browser, no backend. Search filters by order number, checkboxes filter by status, and both are reflected in the URL, so reload and the browser back button both restore the correct state. Click a row or press Enter on it to open the detail panel. Arrow keys move the selected row, Enter opens the panel, Escape closes it and returns focus to that row.

Evidence

app/evidence contains React DevTools Profiler recordings proving no wasted row re-renders when typing in the search box, exported as JSON. See app/NOTES.md for the full explanation, including a bug that was found and fixed during testing.

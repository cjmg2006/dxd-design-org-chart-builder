# DXD Design Org Chart Builder

An interactive org chart for the DXD Design Team (Ministry of Education, Singapore). Renders the team's reporting structure, domains, and workstreams directly in the browser, pulling live data from a Google Sheets CSV export.

## Features

- **Domain filters** — All / Teachers / Students / Parents / Platforms / HQ
- **Live search** — matches name, specialty, workstream, or remarks, with highlighted results
- **Collapsible subtrees** — squads can be expanded/collapsed to save space
- **Rich tooltips** — hover a card to see specialty, domain, workstreams, employment type, reporting manager, and remarks
- **Status indicators** — On Leave, Joining, Departing, Transfer In/Out
- **Employment types** — GT, AR, Intern, Apprentice, Consultant (color-coded)
- **Reporting-line coloring** — distinguishes branches by manager (e.g. Gloria vs. Wondo)
- **Mentorship lines** — dashed lines differentiate mentees from direct reports

## Usage

This is a single-file, build-free HTML app. Just open [index.html](index.html) in a browser, or serve it statically:

```bash
npx serve .
```

## Data source

Org data is fetched at page load from a Google Sheets CSV export URL hardcoded in [index.html](index.html). To point it at a different sheet, update that URL and ensure the column structure matches.

## Deployment

Deployed on Vercel as a static site.

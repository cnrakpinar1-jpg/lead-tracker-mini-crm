# Lead Tracker — Mini CRM

A clean, lightweight lead management app for freelancers and small agency owners. Built with plain HTML, CSS, and vanilla JavaScript — no frameworks, no build tools, no server required.

---

## What It Does

Lead Tracker lets you manually capture and track incoming client inquiries in one place. Think of it as a personal CRM that lives entirely in your browser. You can add leads, update their status as they progress through your pipeline, filter and search your list, and export your data whenever you need it.

---

## Features

| Feature | Details |
|---|---|
| **Lead form** | Capture name, company, email, phone, source, status, priority, estimated value, and notes |
| **Dashboard** | Six live stat cards — total leads, new, proposal sent, won, lost, and total pipeline value |
| **Search** | Real-time search across name, company, and email |
| **Filter** | Filter by status, source, and priority simultaneously |
| **Sort** | Sort by newest, oldest, or estimated value |
| **Edit leads** | Update any field in a pre-filled modal |
| **Delete leads** | Remove a lead with a confirmation prompt |
| **Clear filters** | One-click "Clear filters" link appears when filters are active |
| **Priority indicator** | Colored left border on each table row shows priority at a glance |
| **Lead avatars** | Initials avatar with consistent per-person color |
| **Notes tooltip** | "Note" chip on leads with notes; hover to preview the text |
| **Export CSV** | Download all leads as a spreadsheet-ready `.csv` file |
| **Export JSON** | Download all leads as a structured `.json` file |
| **Reset all** | Wipe all data with a two-step confirmation |
| **Toast notifications** | Non-blocking feedback messages for every action |
| **Sample data** | Three realistic leads pre-loaded on first visit |
| **Responsive** | Works on desktop, tablet, and mobile |

---

## Tech Stack

- **HTML5** — semantic structure, accessibility attributes
- **CSS3** — custom properties, CSS Grid, Flexbox, responsive breakpoints
- **Vanilla JavaScript** — no libraries, no frameworks, no build step
- **localStorage** — browser-native persistence, no backend needed
- **Google Fonts** — Inter typeface via CDN (requires internet on first load; cached after)

---

## How to Run Locally

1. Download or clone this repository
2. Open the `lead-tracker/` folder
3. Double-click `index.html`

That's it. The app opens in your browser and is fully functional. No terminal, no `npm install`, no server.

> Works in any modern browser: Chrome, Firefox, Safari, Edge.

---

## How Data Persistence Works

All lead data is stored in your browser's **localStorage** — a key/value store built into every browser that persists across page reloads and browser restarts.

Here's how it works in this project:

```
Write:  localStorage.setItem('leadtracker_v1', JSON.stringify(leadsArray))
Read:   JSON.parse(localStorage.getItem('leadtracker_v1'))
Delete: localStorage.removeItem('leadtracker_v1')
```

**What this means in practice:**
- Your leads survive page refreshes, tab closes, and browser restarts
- Data is stored only on your device — nothing is sent to a server
- Each browser/device has its own separate storage
- Clearing your browser's site data will erase the leads (use Export first)
- The storage limit is typically 5–10 MB per origin (enough for thousands of leads)

The entire data layer lives in two functions at the top of `script.js`: `getLeads()` and `saveLeads()`. Every feature that reads or writes data goes through these two functions — making the code easy to follow and easy to swap out for a real backend later.

---

## Why This Is Useful for Freelancers and Small Agencies

**The problem:** When you're working independently, client leads arrive from everywhere — Upwork, LinkedIn, referrals, Instagram DMs. They get lost in email threads, forgotten in sticky notes, or scattered across spreadsheets with no context.

**What Lead Tracker solves:**
- One place to capture every lead the moment it arrives
- Status tracking so you know exactly where each deal stands
- Priority flagging so you focus on the highest-value opportunities first
- Source tracking so you know which channels bring in the best clients
- Pipeline value so you have a clear picture of what's in progress

**Who it's for:**
- Freelance designers, developers, copywriters, consultants
- Small agencies managing multiple client pipelines
- Anyone who wants a fast, private, offline-capable CRM without a subscription

---

## Possible Future Improvements

These are logical next steps if you want to grow this project:

- **Backend / sync** — Connect to a Node.js + SQLite backend or a service like Supabase so leads sync across devices
- **Authentication** — Add login so the app can be shared with a small team
- **Follow-up reminders** — Set a follow-up date on each lead and show overdue reminders
- **Activity log** — Track every status change and note update with timestamps
- **Kanban view** — Drag-and-drop board view as an alternative to the table
- **Pipeline chart** — A simple bar or funnel chart showing leads by stage
- **CSV import** — Bulk-import leads from an existing spreadsheet
- **Tags / custom fields** — Let users define their own categories
- **Dark mode** — Toggle between light and dark themes using CSS custom properties
- **PWA / offline** — Add a service worker so the app works completely offline and can be installed on mobile

---

## Project Structure

```
lead-tracker/
├── index.html   — HTML structure and layout
├── style.css    — All styling (design tokens, layout, components, responsive)
├── script.js    — All logic (CRUD, filtering, rendering, export)
└── README.md    — This file
```

The JavaScript is organized into 17 clearly labeled sections with comments explaining the purpose of each function. It is intentionally written to be beginner-readable — no complex patterns, no closures, no bundlers.

---

*Built with plain HTML, CSS, and JavaScript. No frameworks. No build tools. Just open and use.*

---

## GitHub Pages Deployment

This repo is a static HTML/CSS/JavaScript project and `index.html` lives in the repository root, so it is ready for GitHub Pages.

### Deployment Steps

1. Push changes to the `main` branch.
2. In **Settings > Pages**, enable GitHub Pages for this repository.
3. Set the source to **GitHub Actions** to use the included `.github/workflows/deploy-pages.yml` workflow.
4. After the workflow finishes, the live site will be available at:

`https://cnrakpinar1-jpg.github.io/lead-tracker-mini-crm/`

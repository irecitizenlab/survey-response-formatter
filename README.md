# Survey Response Formatter

A single-page tool for UK local planning authorities to format consultation survey responses into inspector-ready PDFs.

Upload an Excel or CSV export from your consultation platform (e.g. Go Vocal), review and strip personal data columns, then generate a cleanly formatted document you can print to PDF via the browser.

## Features

- **PII handling** — two paths: self-certify that contact details are already removed, or let the tool scan column headers and flag likely PII fields for review.
- **Cover page** — optional branded title page with consultation stage, LPA name, date, and notes.
- **Inspector-ready output** — each respondent's answers are displayed in numbered cards with question headers, ready for Regulation 18/19 submission.
- **Browser-only processing** — no data leaves your machine; all parsing and rendering happens client-side.
- **Batched PDF generation** — respondent cards are injected into the print iframe in batches of 40 with a progress indicator, preventing the browser from freezing on large datasets.

## Running locally

```bash
npm install
npm run dev
```

Then open the URL shown in the terminal (usually http://localhost:5173).

To build for production:

```bash
npm run build
npm run preview
```

## Deployment

Hosted on GitHub Pages via GitHub Actions. Every push to `main` triggers an automatic build and deploy. Live at:

https://irecitizenlab.github.io/survey-response-formatter/

## Known performance issues

| ID | Status | Issue | Detail |
|----|--------|-------|--------|
| P1 | Open | **Large file parsing blocks the main thread** | `XLSX.read()` is synchronous. Files with thousands of rows will freeze the UI during parsing. A Web Worker would fix this. |
| P2 | Open | **All response cards render at once** | With hundreds of respondents the initial render of the view step is slow. Virtualised rendering (e.g. `react-window`) or pagination would improve this. |
| P3 | Mitigated | **Print/PDF generation for large files** | Now uses batched injection (40 cards at a time) with a progress indicator. Still uses the browser print dialog — see "Next steps" for alternatives. |
| P4 | Open | **No memoisation on visible-column filtering** | `visibleColumns` is recalculated on every render. Wrapping in `useMemo` would be cleaner. |
| P5 | Open | **Google Fonts loaded at runtime** | The Chivo font is fetched from Google Fonts on page load. For offline or air-gapped environments, the font should be self-hosted. |

## Next steps for CTO evaluation

### Stability and scale

The current architecture is **100% client-side** — a static React app on GitHub Pages with no backend, no database, and no server costs. This is a strength for data privacy (nothing leaves the browser) but creates limits at scale:

- **Tested with**: 766 respondents x 185 columns (~142k data cells). File parsing takes a few seconds; the view step renders all cards at once; PDF generation is batched but still relies on the browser's print-to-PDF pipeline.
- **Practical ceiling**: Expect the tool to handle ~1,000–2,000 respondents comfortably. Beyond that, P1 (parsing) and P2 (rendering) will degrade the experience noticeably.

### Recommended improvements (by priority)

**1. Move to a proper PDF library (pdfmake or jsPDF) — HIGH**
Replaces the browser print dialog with direct `.pdf` file download. Eliminates the iframe/print preview bottleneck entirely. Gives full control over page layout, headers/footers, and page numbering. Estimated effort: 2–3 hours to rebuild the current card layout in pdfmake, plus font bundling (Chivo needs to be base64-encoded).

**2. Web Worker for XLSX parsing — MEDIUM**
Move `XLSX.read()` into a Web Worker so the UI stays responsive during file parsing. Straightforward change — the xlsx library works in Worker contexts. Estimated effort: 1–2 hours.

**3. Virtualised rendering for the view step — MEDIUM**
Use `react-window` or `react-virtuoso` to only render visible respondent cards. Keeps the view step snappy even with thousands of rows. Estimated effort: 1–2 hours.

**4. Self-host the Chivo font — LOW**
Bundle the font files in the app instead of fetching from Google Fonts. Required if users are on restricted networks or air-gapped environments. Estimated effort: 30 minutes.

**5. Automated tests — LOW (but important for longevity)**
No tests currently exist. At minimum, add a smoke test that verifies file upload, PII detection, and card rendering with a sample fixture. Estimated effort: 2–3 hours for meaningful coverage.

### Hosting alternatives to consider

GitHub Pages is free and sufficient for now. If the tool needs authentication, usage analytics, or custom domains with SSL:
- **Netlify / Vercel** — free tier, same static deployment, better custom domain support
- **Cloudflare Pages** — free, fastest CDN, good if you later add Workers for server-side logic
- **Azure Static Web Apps** — worth considering if the organisation uses Microsoft infrastructure

# Survey Response Formatter

A single-page tool for UK local planning authorities to format consultation survey responses into inspector-ready PDFs.

Upload an Excel or CSV export from your consultation platform (e.g. Go Vocal), review and strip personal data columns, then generate a cleanly formatted document you can print to PDF via the browser.

## Features

- **PII handling** — two paths: self-certify that contact details are already removed, or let the tool scan column headers and flag likely PII fields for review.
- **Cover page** — optional branded title page with consultation stage, LPA name, date, and notes.
- **Inspector-ready output** — each respondent's answers are displayed in numbered cards with question headers, ready for Regulation 18/19 submission.
- **Browser-only processing** — no data leaves your machine; all parsing and rendering happens client-side.

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

## Known performance issues

| ID | Issue | Detail |
|----|-------|--------|
| P1 | **Large file parsing blocks the main thread** | `XLSX.read()` is synchronous. Files with thousands of rows will freeze the UI during parsing. A Web Worker would fix this. |
| P2 | **All response cards render at once** | With hundreds of respondents the initial render of the view step is slow. Virtualised rendering (e.g. `react-window`) or pagination would improve this. |
| P3 | **Print/PDF generation rebuilds full DOM in an iframe** | The `handlePrint` function clones `innerHTML` into a hidden iframe. For very large datasets this is memory-intensive and can be slow. |
| P4 | **No memoisation on visible-column filtering** | `visibleColumns` is recalculated on every render. For large column counts this is negligible, but wrapping it in `useMemo` would be cleaner. |
| P5 | **Google Fonts loaded at runtime** | The Chivo font is fetched from Google Fonts on page load. For offline or air-gapped environments, the font should be self-hosted. |

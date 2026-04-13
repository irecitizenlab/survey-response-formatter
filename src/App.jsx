import { useState, useCallback, useEffect, useRef, memo } from "react";
import * as XLSX from "xlsx";

const B = {
  dark:   "#1E155D",
  mid:    "#43369B",
  cherry: "#FF3E52",
  l1:     "#F0EEFA",
  l2:     "#E1DEF5",
  l3:     "#C3BDEC",
  l4:     "#968BDD",
  l5:     "#695ACF",
  white:  "#FFFFFF",
};

const PII_KEYWORDS = [
  "name","email","address","phone","postcode","dob",
  "birth","mobile","contact","tel","fax","street",
];

/* Strip trailing _123 IDs from Go Vocal column headers */
const cleanLabel = (col) => col.replace(/_\d+$/, "").trim();

/* ─── QuestionCard ─────────────────────────────────────── */
function QuestionCard({ question, answer }) {
  const isEmpty = !answer || String(answer).trim() === "";
  return (
    <div style={{ marginBottom: 8, borderRadius: 6, overflow: "hidden", border: `1px solid ${B.l2}` }}>
      <div style={{
        background: B.l1, color: B.mid,
        padding: "6px 14px", fontSize: 11,
        fontWeight: "700", letterSpacing: "0.06em",
        textTransform: "uppercase", fontFamily: "'Chivo', sans-serif",
      }}>
        {cleanLabel(question)}
      </div>
      <div style={{
        padding: "10px 14px", background: B.white,
        fontSize: 13, lineHeight: 1.7,
        fontFamily: "'Chivo', sans-serif",
        color: isEmpty ? B.l4 : B.dark,
        fontStyle: isEmpty ? "italic" : "normal",
        minHeight: 38,
      }}>
        {isEmpty ? "(No response provided)" : String(answer)}
      </div>
    </div>
  );
}

/* ─── ResponseCard — memoized so cover/intro edits don't re-render all cards ── */
const ResponseCard = memo(function ResponseCard({ row, index, visibleColumns }) {
  return (
    <div style={{
      background: B.white, border: `1px solid ${B.l2}`,
      borderRadius: 10, marginBottom: 24, overflow: "hidden",
    }}>
      <div style={{
        background: B.dark, color: B.white,
        padding: "11px 20px", display: "flex", alignItems: "center", gap: 12,
      }}>
        <span style={{
          background: B.cherry, color: B.white,
          borderRadius: "50%", width: 26, height: 26,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          fontWeight: "700", fontSize: 11, flexShrink: 0,
          fontFamily: "'Chivo', sans-serif",
        }}>{index + 1}</span>
        <span style={{ fontFamily: "'Chivo', sans-serif", fontSize: 12, fontWeight: "700", letterSpacing: "0.06em", textTransform: "uppercase" }}>
          Respondent {String(index + 1).padStart(3, "0")}
        </span>
        <span style={{
          marginLeft: "auto", fontSize: 9, opacity: 0.45,
          fontFamily: "'Chivo', sans-serif", letterSpacing: "0.1em",
          textTransform: "uppercase", background: "rgba(255,255,255,0.08)",
          padding: "2px 8px", borderRadius: 4,
        }}>Contact details removed</span>
      </div>
      <div style={{ padding: "14px 20px" }}>
        {visibleColumns.map(col => (
          <QuestionCard key={col} question={col} answer={row[col]} />
        ))}
      </div>
    </div>
  );
}); 

/* ─── StepBar ───────────────────────────────────────────── */
function StepBar({ step, piiPath }) {
  const steps = piiPath === "A"
    ? [["modal","1. Choose"],["upload","2. Upload"],["view","3. View"]]
    : [["modal","1. Choose"],["upload","2. Upload"],["confirm","3. PII review"],["view","4. View"]];
  const idx = steps.findIndex(([s]) => s === step);
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 28 }}>
      {steps.map(([s, label], i) => {
        const active = i === idx, done = i < idx;
        return (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{
              padding: "5px 14px", borderRadius: 20, fontSize: 12,
              fontWeight: active ? "700" : "400",
              fontFamily: "'Chivo', sans-serif", letterSpacing: "0.02em",
              background: active ? B.dark : done ? B.l3 : B.l1,
              color: active ? B.white : done ? B.mid : B.l4,
              transition: "all 0.2s",
            }}>{label}</div>
            {i < steps.length - 1 && <span style={{ color: B.l3, fontSize: 13 }}>›</span>}
          </div>
        );
      })}
    </div>
  );
}

/* ─── CoverPage (rendered in print area) ───────────────── */
function CoverPage({ intro }) {
  return (
    <div style={{
      background: B.dark, color: B.white,
      padding: "60px 52px", marginBottom: 32,
      borderRadius: 10, pageBreakAfter: "always",
      fontFamily: "'Chivo', sans-serif",
    }}>
      <div style={{
        fontSize: 10, letterSpacing: "0.16em",
        textTransform: "uppercase", color: B.cherry,
        fontWeight: "700", marginBottom: 48,
      }}>
        {intro.stage || "Local Plan Consultation"}
      </div>
      <div style={{
        fontSize: 10, letterSpacing: "0.1em",
        textTransform: "uppercase", color: "rgba(255,255,255,0.4)",
        marginBottom: 10,
      }}>Consultation responses</div>
      <h1 style={{
        fontSize: 32, fontWeight: "100",
        letterSpacing: "-0.01em", lineHeight: 1.2,
        margin: "0 0 10px", color: B.white,
      }}>
        {intro.title || "Survey Response Report"}
      </h1>
      <div style={{
        fontSize: 16, fontWeight: "300",
        color: "rgba(255,255,255,0.6)", marginBottom: 60,
      }}>
        {intro.lpa || "Local Planning Authority"}
      </div>
      <div style={{
        borderTop: "1px solid rgba(255,255,255,0.15)",
        paddingTop: 24,
        display: "flex", gap: 48,
        fontSize: 12, color: "rgba(255,255,255,0.5)",
        fontWeight: "300",
      }}>
        {[
          ["Date", intro.date],
          ["Prepared by", intro.preparedBy],
        ].map(([label, val]) => val ? (
          <div key={label}>
            <div style={{ fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4, color: "rgba(255,255,255,0.3)" }}>{label}</div>
            <div style={{ color: "rgba(255,255,255,0.7)", fontWeight: "400" }}>{val}</div>
          </div>
        ) : null)}
      </div>
      {intro.notes && (
        <div style={{
          marginTop: 32,
          background: "rgba(255,255,255,0.06)",
          borderRadius: 8, padding: "16px 20px",
          fontSize: 12, lineHeight: 1.75,
          color: "rgba(255,255,255,0.55)",
          fontWeight: "300",
        }}>
          {intro.notes}
        </div>
      )}
    </div>
  );
}

/* ─── Editable intro form (screen-only) ────────────────── */
function IntroEditor({ intro, setIntro, includeCover, setIncludeCover }) {
  const field = (key, label, placeholder, type = "text") => (
    <div style={{ marginBottom: 12 }}>
      <label style={{
        display: "block", fontSize: 10,
        letterSpacing: "0.08em", textTransform: "uppercase",
        color: B.mid, fontWeight: "700",
        marginBottom: 5, fontFamily: "'Chivo', sans-serif",
      }}>{label}</label>
      {type === "select" ? (
        <select
          value={intro[key] || ""}
          onChange={e => setIntro(p => ({ ...p, [key]: e.target.value }))}
          style={{
            width: "100%", padding: "8px 12px",
            borderRadius: 6, border: `1px solid ${B.l2}`,
            background: B.white, color: B.dark,
            fontSize: 13, fontFamily: "'Chivo', sans-serif",
            appearance: "none",
          }}
        >
          <option value="">Select stage…</option>
          <option value="Regulation 18 Consultation">Regulation 18 Consultation</option>
          <option value="Regulation 19 Consultation">Regulation 19 Consultation</option>
          <option value="Regulation 18 &amp; 19 Consultation">Regulation 18 &amp; 19 Consultation</option>
        </select>
      ) : type === "textarea" ? (
        <textarea
          value={intro[key] || ""}
          placeholder={placeholder}
          onChange={e => setIntro(p => ({ ...p, [key]: e.target.value }))}
          rows={3}
          style={{
            width: "100%", padding: "8px 12px",
            borderRadius: 6, border: `1px solid ${B.l2}`,
            background: B.white, color: B.dark,
            fontSize: 13, fontFamily: "'Chivo', sans-serif",
            resize: "vertical", boxSizing: "border-box",
            lineHeight: 1.6,
          }}
        />
      ) : (
        <input
          type="text"
          value={intro[key] || ""}
          placeholder={placeholder}
          onChange={e => setIntro(p => ({ ...p, [key]: e.target.value }))}
          style={{
            width: "100%", padding: "8px 12px",
            borderRadius: 6, border: `1px solid ${B.l2}`,
            background: B.white, color: B.dark,
            fontSize: 13, fontFamily: "'Chivo', sans-serif",
            boxSizing: "border-box",
          }}
        />
      )}
    </div>
  );

  return (
    <div style={{
      background: B.white, border: `1px solid ${B.l2}`,
      borderRadius: 10, marginBottom: 24, overflow: "hidden",
    }}>
      {/* Toggle header — single onClick on container, no nested label/button conflict */}
      <div
        onClick={() => setIncludeCover(v => !v)}
        style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "14px 20px", cursor: "pointer",
          borderBottom: includeCover ? `1px solid ${B.l2}` : "none",
          userSelect: "none",
        }}
      >
        <div style={{
          width: 38, height: 22, borderRadius: 11,
          background: includeCover ? B.dark : B.l2,
          position: "relative", flexShrink: 0,
          transition: "background 0.2s",
        }}>
          <div style={{
            position: "absolute",
            top: 3, left: includeCover ? 19 : 3,
            width: 16, height: 16, borderRadius: "50%",
            background: B.white,
            transition: "left 0.2s",
            boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
          }} />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: "700", color: B.dark, fontFamily: "'Chivo', sans-serif" }}>
            Include cover page
          </div>
          <div style={{ fontSize: 11, color: B.l4, fontFamily: "'Chivo', sans-serif" }}>
            Adds a title page before the responses in the printed PDF
          </div>
        </div>
      </div>

      {/* Form fields — only shown when toggled on */}
      {includeCover && (
        <div style={{ padding: "18px 20px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <div>{field("lpa",        "Local planning authority", "e.g. Durham County Council")}</div>
            <div>{field("stage",      "Consultation stage", "", "select")}</div>
            <div style={{ gridColumn: "1 / -1" }}>
              {field("title", "Consultation title", "e.g. Durham Local Plan 2020–2040")}
            </div>
            <div>{field("date",       "Date",        "e.g. April 2026")}</div>
            <div>{field("preparedBy", "Prepared by", "e.g. Planning Policy Team")}</div>
          </div>
          {field("notes", "Additional notes (optional)", "e.g. This document contains representations received at Regulation 19 stage…", "textarea")}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/* MAIN                                                        */
/* ═══════════════════════════════════════════════════════════ */
export default function SurveyFormatter() {
  const [step,         setStep]         = useState("modal");
  const [piiPath,      setPiiPath]      = useState(null);
  const [data,         setData]         = useState(null);
  const [columns,      setColumns]      = useState([]);
  const [piiFields,    setPiiFields]    = useState([]);
  const [suggestedPii, setSuggestedPii] = useState([]);
  const [fileName,     setFileName]     = useState("");
  const [dragging,     setDragging]     = useState(false);
  const [error,        setError]        = useState("");
  const [processing,   setProcessing]   = useState(false);
  const [generating,   setGenerating]   = useState(false);
  const [pdfProgress,  setPdfProgress]  = useState(null); // null = idle, 0–100 = building

  const [includeCover, setIncludeCover] = useState(false);
  const [intro,        setIntro]        = useState({
    lpa: "", title: "", stage: "", date: "", preparedBy: "", notes: "",
  });

  const printAreaRef = useRef(null);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel  = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Chivo:ital,wght@0,100;0,300;0,400;0,700;1,300&display=swap";
    document.head.appendChild(link);
  }, []);

  /* Scroll to top whenever the view step mounts */
  useEffect(() => {
    if (step === "view") window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  /* ── PDF: build iframe in batches so the browser doesn't choke ── */
  const handlePrint = () => {
    const area = printAreaRef.current;
    if (!area || pdfProgress !== null) return;

    /* Collect the individual respondent card elements */
    const cards = Array.from(area.children);
    const BATCH = 40;

    setPdfProgress(0);

    const existing = document.getElementById("__print_frame__");
    if (existing) existing.remove();

    const frame = document.createElement("iframe");
    frame.id = "__print_frame__";
    frame.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:210mm;height:297mm;border:none;visibility:hidden;";
    document.body.appendChild(frame);

    const doc = frame.contentDocument || frame.contentWindow.document;
    doc.open();
    doc.write(`<!DOCTYPE html><html><head>
      <meta charset="utf-8"/>
      <title>${intro.title || "Survey Responses"}</title>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Chivo:ital,wght@0,100;0,300;0,400;0,700;1,300&display=swap"/>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Chivo', sans-serif; background: white; padding: 32px; color: #1E155D; }
        @page { margin: 18mm 14mm; size: A4; }
        @media print { body { padding: 0; } }
      </style>
    </head><body><div id="content"></div></body></html>`);
    doc.close();

    /* Also copy already-loaded font faces so we don't depend solely on the link */
    try { for (const font of document.fonts) doc.fonts.add(font); } catch (_) {}

    const container = doc.getElementById("content");
    let i = 0;

    const injectBatch = () => {
      const end = Math.min(i + BATCH, cards.length);
      for (; i < end; i++) {
        container.insertAdjacentHTML("beforeend", cards[i].outerHTML);
      }
      const pct = Math.round((i / cards.length) * 100);
      setPdfProgress(pct);

      if (i < cards.length) {
        /* Yield to the main thread so the progress bar updates */
        setTimeout(injectBatch, 0);
      } else {
        /* All cards injected — wait for fonts + layout, then print */
        const ready = doc.fonts ? doc.fonts.ready : Promise.resolve();
        ready.then(() => {
          setTimeout(() => {
            frame.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;border:none;z-index:9999;background:white;";
            frame.style.visibility = "visible";
            frame.contentWindow.focus();
            frame.contentWindow.print();
            setPdfProgress(null);
            /* Clean up after print dialog closes */
            setTimeout(() => {
              const f = document.getElementById("__print_frame__");
              if (f) f.remove();
            }, 1000);
          }, 400);
        });
      }
    };

    /* Start first batch after iframe has initialised */
    frame.onload = () => setTimeout(injectBatch, 100);
  };

  const processFile = useCallback((file) => {
    setError("");
    if (!file) return;
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      setError("Please upload an Excel (.xlsx, .xls) or CSV file."); return;
    }
    setFileName(file.name);
    setProcessing(true);   // show spinner immediately
    const reader = new FileReader();
    reader.onload = (e) => {
      // setTimeout yields the main thread so the spinner renders before
      // the synchronous XLSX.read call blocks it
      setTimeout(() => {
        try {
          const wb   = XLSX.read(e.target.result, { type: "array" });
          const ws   = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
          if (!rows.length) {
            setError("The file appears to be empty.");
            setProcessing(false);
            return;
          }
          const cols     = Object.keys(rows[0]);
          const detected = cols.filter(col =>
            PII_KEYWORDS.some(kw => col.toLowerCase().includes(kw))
          );
          setColumns(cols); setSuggestedPii(detected); setData(rows);
          setProcessing(false);
          if (piiPath === "A") { setPiiFields([]); setStep("view"); }
          else { setPiiFields(detected); setStep("confirm"); }
        } catch {
          setError("Could not read the file. Please check it is a valid Excel or CSV file.");
          setProcessing(false);
        }
      }, 0);
    };
    reader.readAsArrayBuffer(file);
  }, [piiPath]);

  const togglePii = (col) =>
    setPiiFields(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]);

  const visibleColumns = columns.filter(c => !piiFields.includes(c));

  const resetToModal = () => {
    setStep("modal"); setPiiPath(null); setData(null);
    setColumns([]); setPiiFields([]); setSuggestedPii([]);
    setFileName(""); setError(""); setProcessing(false); setGenerating(false);
  };

  const btnPrimary = (onClick, label, extra = {}) => (
    <button onClick={onClick} style={{
      padding: "10px 28px", borderRadius: 6, border: "none",
      background: B.dark, color: B.white, cursor: "pointer",
      fontSize: 12, fontWeight: "700", fontFamily: "'Chivo', sans-serif",
      letterSpacing: "0.06em", textTransform: "uppercase", ...extra,
    }}>{label}</button>
  );

  const btnGhost = (onClick, label) => (
    <button onClick={onClick} style={{
      padding: "10px 20px", borderRadius: 6,
      border: `1px solid ${B.l2}`, background: B.white,
      cursor: "pointer", fontSize: 12, color: B.mid,
      fontFamily: "'Chivo', sans-serif",
    }}>{label}</button>
  );

  return (
    <>
      <style>{`
        input[type=text], input[type=date], select, textarea {
          outline: none;
          transition: border-color 0.15s;
        }
        input[type=text]:focus, select:focus, textarea:focus {
          border-color: ${B.mid} !important;
          box-shadow: 0 0 0 3px ${B.l2};
        }
        button:focus { outline: 2px solid ${B.cherry}; outline-offset: 2px; }
      `}</style>

      <div style={{ fontFamily: "'Chivo', sans-serif", minHeight: "100vh", background: B.l1 }}>

        {/* ── Header ── */}
        <div data-no-print style={{
          background: B.dark, color: B.white,
          padding: "14px 32px", display: "flex", alignItems: "center", gap: 14,
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: 8,
            background: B.cherry, display: "flex",
            alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="1" width="12" height="14" rx="1.5" stroke="white" strokeWidth="1.2" fill="none"/>
              <line x1="5" y1="5"  x2="11" y2="5"  stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
              <line x1="5" y1="8"  x2="11" y2="8"  stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
              <line x1="5" y1="11" x2="8.5" y2="11" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: "700", letterSpacing: "0.01em" }}>Survey Response Formatter</div>
            <div style={{ fontSize: 10, opacity: 0.5, marginTop: 1, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              UK Local Plan · Inspector-Ready Export
            </div>
          </div>
          {step === "view" && (
            <button onClick={handlePrint} disabled={pdfProgress !== null} style={{
              marginLeft: "auto", background: pdfProgress !== null ? B.mid : B.cherry, color: B.white,
              border: "none", borderRadius: 6, padding: "8px 20px",
              cursor: pdfProgress !== null ? "default" : "pointer",
              fontWeight: "700", fontSize: 12,
              fontFamily: "'Chivo', sans-serif", letterSpacing: "0.06em",
              textTransform: "uppercase", minWidth: 160,
              transition: "background 0.2s",
            }}>
              {pdfProgress !== null ? `Building PDF… ${pdfProgress}%` : "Download PDF"}
            </button>
          )}
        </div>

        <div style={{ maxWidth: 820, margin: "0 auto", padding: "36px 24px" }}>

          {/* ══════════════════════════════════════════════════ */}
          {/* MODAL                                              */}
          {/* ══════════════════════════════════════════════════ */}
          {step === "modal" && (
            <div>
              <div style={{ textAlign: "center", marginBottom: 32 }}>
                <div style={{
                  display: "inline-block", fontSize: 10,
                  letterSpacing: "0.14em", textTransform: "uppercase",
                  color: B.cherry, fontWeight: "700",
                  marginBottom: 14, padding: "4px 12px",
                  border: `1px solid ${B.cherry}`, borderRadius: 20,
                }}>Before you begin</div>
                <h1 style={{
                  fontSize: 28, fontWeight: "100", color: B.dark,
                  margin: "0 0 14px", lineHeight: 1.25, letterSpacing: "-0.01em",
                }}>How will you handle<br/>personal data?</h1>
                <p style={{ color: B.mid, fontSize: 13, lineHeight: 1.8, maxWidth: 500, margin: "0 auto" }}>
                  Under the Planning Inspectorate's Procedure Guide §1.27–1.28,
                  respondent <strong>names must remain visible</strong>.
                  Contact details (address, email, phone) must be removed before publication.
                </p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
                {/* Option A */}
                <button onClick={() => { setPiiPath("A"); setStep("upload"); }} style={{
                  background: B.white, border: `1.5px solid ${B.l2}`,
                  borderRadius: 12, padding: "28px 24px", cursor: "pointer",
                  textAlign: "left", fontFamily: "'Chivo', sans-serif",
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = B.mid; e.currentTarget.style.boxShadow = `0 0 0 3px ${B.l2}`; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = B.l2; e.currentTarget.style.boxShadow = "none"; }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: B.l1, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M14 4L7 11l-3-3" stroke={B.mid} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: "700", color: B.dark, marginBottom: 8 }}>I'll strip it myself</div>
                  <div style={{ fontSize: 13, color: B.mid, lineHeight: 1.75, marginBottom: 16 }}>
                    I've already removed contact details from my file. The tool will process only the anonymised export.
                  </div>
                  <div style={{ fontSize: 11, background: B.l1, borderRadius: 6, padding: "9px 12px", color: B.l5, lineHeight: 1.65, borderLeft: `3px solid ${B.l3}` }}>
                    By selecting this option you confirm you have removed all contact details and take responsibility for PII compliance.
                  </div>
                </button>

                {/* Option B */}
                <button onClick={() => { setPiiPath("B"); setStep("upload"); }} style={{
                  background: B.dark, border: `1.5px solid ${B.dark}`,
                  borderRadius: 12, padding: "28px 24px", cursor: "pointer",
                  textAlign: "left", fontFamily: "'Chivo', sans-serif",
                  position: "relative", overflow: "hidden",
                }}
                  onMouseEnter={e => e.currentTarget.style.opacity = "0.92"}
                  onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                >
                  <div style={{ position: "absolute", top: 14, right: 14, background: B.cherry, color: B.white, fontSize: 9, fontWeight: "700", letterSpacing: "0.1em", textTransform: "uppercase", padding: "3px 10px", borderRadius: 20 }}>Recommended</div>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <circle cx="8" cy="8" r="5.5" stroke="white" strokeWidth="1.5"/>
                      <path d="M12 12l3 3" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: "700", color: B.white, marginBottom: 8 }}>Help me detect &amp; remove PII</div>
                  <div style={{ fontSize: 13, color: B.l3, lineHeight: 1.75, marginBottom: 16 }}>
                    Upload your raw export. The tool will scan column headers, show you what it finds, and strip contact details before generating any output.
                  </div>
                  <div style={{ fontSize: 11, background: "rgba(255,255,255,0.07)", borderRadius: 6, padding: "9px 12px", color: B.l3, lineHeight: 1.65, borderLeft: "3px solid rgba(255,255,255,0.2)" }}>
                    By proceeding you confirm you have authority to process this data for planning examination purposes.
                  </div>
                </button>
              </div>
              <p style={{ textAlign: "center", fontSize: 11, color: B.l4, letterSpacing: "0.02em" }}>
                No data is stored between sessions · All processing happens in your browser
              </p>
            </div>
          )}

          {/* ══════════════════════════════════════════════════ */}
          {/* UPLOAD                                             */}
          {/* ══════════════════════════════════════════════════ */}
          {step === "upload" && (
            <div>
              <StepBar step={step} piiPath={piiPath} />
              {piiPath === "A" && (
                <div style={{ background: B.white, border: `1px solid ${B.l2}`, borderLeft: `4px solid ${B.cherry}`, borderRadius: 6, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: B.mid, lineHeight: 1.7 }}>
                  <strong style={{ color: B.dark }}>Reminder:</strong> You confirmed contact details have been removed. Respondent <strong>names should remain</strong> — the Inspectorate requires them (§1.27).
                </div>
              )}
              <div style={{ position: "relative" }}>
                <div
                  onDragOver={e => { e.preventDefault(); if (!processing) setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={e => { e.preventDefault(); setDragging(false); processFile(e.dataTransfer.files[0]); }}
                  onClick={() => !processing && document.getElementById("file-input").click()}
                  style={{
                    border: `2px dashed ${dragging ? B.cherry : B.l3}`,
                    borderRadius: 12, padding: "56px 40px", textAlign: "center",
                    background: dragging ? "#fff5f6" : B.white,
                    transition: "all 0.2s",
                    cursor: processing ? "default" : "pointer",
                    opacity: processing ? 0.4 : 1,
                  }}
                >
                  <svg width="44" height="44" viewBox="0 0 44 44" fill="none" style={{ margin: "0 auto 14px", display: "block" }}>
                    <rect x="8" y="4" width="28" height="36" rx="3" fill={B.l1} stroke={B.l3} strokeWidth="1.5"/>
                    <path d="M22 14v12M16 20l6-6 6 6" stroke={B.mid} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    <line x1="15" y1="30" x2="29" y2="30" stroke={B.l3} strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <div style={{ fontSize: 18, fontWeight: "100", color: B.dark, marginBottom: 8 }}>Drop your survey export here</div>
                  <div style={{ color: B.l4, fontSize: 13, marginBottom: 22 }}>or click to browse · .xlsx · .xls · .csv</div>
                  <div style={{ display: "inline-block", background: B.dark, color: B.white, padding: "10px 28px", borderRadius: 6, fontWeight: "700", fontSize: 12, letterSpacing: "0.06em", textTransform: "uppercase" }}>Choose file</div>
                  <input id="file-input" type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={e => processFile(e.target.files[0])} />
                </div>

                {/* Spinner overlay — shown while XLSX.read is running */}
                {processing && (
                  <div style={{
                    position: "absolute", inset: 0,
                    display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center",
                    borderRadius: 12, gap: 14,
                  }}>
                    <svg width="36" height="36" viewBox="0 0 36 36" fill="none"
                      style={{ animation: "spin 0.9s linear infinite" }}>
                      <circle cx="18" cy="18" r="14" stroke={B.l2} strokeWidth="3"/>
                      <path d="M18 4a14 14 0 0 1 14 14" stroke={B.cherry} strokeWidth="3" strokeLinecap="round"/>
                    </svg>
                    <div style={{ fontSize: 13, fontWeight: "700", color: B.dark, fontFamily: "'Chivo', sans-serif" }}>
                      Reading file…
                    </div>
                    <div style={{ fontSize: 11, color: B.l4, fontFamily: "'Chivo', sans-serif" }}>
                      {fileName}
                    </div>
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                  </div>
                )}
              </div>
              {error && <div style={{ marginTop: 14, background: "#fff0f2", border: `1px solid ${B.cherry}`, borderRadius: 6, padding: "11px 16px", color: B.cherry, fontSize: 13 }}>{error}</div>}
              <button onClick={resetToModal} style={{ marginTop: 18, background: "transparent", border: "none", color: B.l4, cursor: "pointer", fontSize: 12, fontFamily: "'Chivo', sans-serif", padding: 0 }}>
                ← Change PII option
              </button>
            </div>
          )}

          {/* ══════════════════════════════════════════════════ */}
          {/* CONFIRM PII                                        */}
          {/* ══════════════════════════════════════════════════ */}
          {step === "confirm" && (
            <div>
              <StepBar step={step} piiPath={piiPath} />
              <div style={{ background: B.white, border: `1px solid ${B.l2}`, borderRadius: 10, padding: "16px 20px", marginBottom: 14 }}>
                <div style={{ fontSize: 14, fontWeight: "700", color: B.dark }}>{fileName}</div>
                <div style={{ color: B.l4, fontSize: 12, marginTop: 4 }}>{data?.length} responses · {columns.length} fields detected</div>
              </div>
              <div style={{ background: "#fffbf0", border: "1px solid #f0d080", borderRadius: 8, padding: "11px 16px", marginBottom: 14, fontSize: 12, color: "#7a5c00", lineHeight: 1.7 }}>
                <strong>PII review:</strong> Tick contact detail columns to remove. Do not remove name columns — the Inspectorate requires them.
                {suggestedPii.length > 0 && ` We pre-selected ${suggestedPii.length} likely PII field(s).`}
              </div>
              <div style={{ background: B.white, borderRadius: 10, padding: 20, border: `1px solid ${B.l2}` }}>
                <div style={{ fontWeight: "700", color: B.dark, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 14 }}>Fields to remove</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {columns.map(col => {
                    const checked = piiFields.includes(col), suggested = suggestedPii.includes(col);
                    return (
                      <label key={col} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 14px", borderRadius: 6, border: `1px solid ${checked ? B.cherry : B.l2}`, background: checked ? "#fff5f6" : B.l1, transition: "all 0.15s", cursor: "pointer" }}>
                        <input type="checkbox" checked={checked} onChange={() => togglePii(col)} style={{ width: 14, height: 14, accentColor: B.cherry, cursor: "pointer" }} />
                        <span style={{ fontSize: 13, fontWeight: checked ? "700" : "400", color: B.dark, flex: 1 }}>{cleanLabel(col)}</span>
                        {suggested && <span style={{ fontSize: 10, background: B.cherry, color: B.white, borderRadius: 10, padding: "2px 9px", fontWeight: "700", letterSpacing: "0.04em", textTransform: "uppercase" }}>PII detected</span>}
                        {checked && !suggested && <span style={{ fontSize: 11, color: B.cherry, fontWeight: "700" }}>Will be removed</span>}
                      </label>
                    );
                  })}
                </div>
              </div>
              <div style={{ marginTop: 14, padding: "11px 16px", background: "#f0f8f2", border: "1px solid #b8ddb8", borderRadius: 8, fontSize: 12, color: "#2d6a2d" }}>
                <strong>{visibleColumns.length} fields</strong> retained &nbsp;·&nbsp; <strong>{piiFields.length} field(s)</strong> will be removed
              </div>
              <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
                {btnGhost(() => setStep("upload"), "← Back")}
                <button
                  onClick={() => {
                    setGenerating(true);
                    setTimeout(() => { setGenerating(false); setStep("view"); }, 0);
                  }}
                  disabled={generating}
                  style={{
                    flex: 1, padding: "10px 28px", borderRadius: 6, border: "none",
                    background: generating ? B.l4 : B.dark,
                    color: B.white, cursor: generating ? "default" : "pointer",
                    fontSize: 12, fontWeight: "700", fontFamily: "'Chivo', sans-serif",
                    letterSpacing: "0.06em", textTransform: "uppercase",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                    transition: "background 0.2s",
                  }}
                >
                  {generating ? (
                    <>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
                        style={{ animation: "spin 0.9s linear infinite", flexShrink: 0 }}>
                        <circle cx="8" cy="8" r="6" stroke="rgba(255,255,255,0.3)" strokeWidth="2"/>
                        <path d="M8 2a6 6 0 0 1 6 6" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                      Generating…
                    </>
                  ) : "Generate Formatted Responses →"}
                </button>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════ */}
          {/* VIEW                                               */}
          {/* ══════════════════════════════════════════════════ */}
          {step === "view" && (
            <div>
              <div data-no-print>
                <StepBar step={step} piiPath={piiPath} />

                {/* Summary bar */}
                <div style={{ background: B.white, border: `1px solid ${B.l2}`, borderRadius: 10, padding: "14px 20px", marginBottom: 24, display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
                  {[
                    [data.length,           "responses",       B.dark],
                    [visibleColumns.length, "fields retained", "#2d8a4e"],
                    ...(piiFields.length > 0 ? [[piiFields.length, "PII removed", B.cherry]] : []),
                  ].map(([n, label, color]) => (
                    <div key={label} style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                      <span style={{ fontSize: 22, fontWeight: "700", color }}>{n}</span>
                      <span style={{ color: B.l4, fontSize: 12 }}>{label}</span>
                    </div>
                  ))}
                  <div style={{ flex: 1 }} />
                  {piiPath === "B" && btnGhost(() => setStep("confirm"), "← Edit PII")}
                </div>

                {/* Cover page editor */}
                <IntroEditor
                  intro={intro}
                  setIntro={setIntro}
                  includeCover={includeCover}
                  setIncludeCover={setIncludeCover}
                />
              </div>

              {/* ── PRINTABLE AREA ── */}
              <div ref={printAreaRef} data-print-area>
                {includeCover && <CoverPage intro={intro} />}
                {data.map((row, i) => (
                  <ResponseCard key={i} row={row} index={i} visibleColumns={visibleColumns} />
                ))}
                <div style={{ marginTop: 32, textAlign: "center", fontSize: 10, color: B.l4, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                  {data.length} response{data.length !== 1 ? "s" : ""} · Generated by Go Vocal Survey Response Formatter
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}

import { useState, useEffect, useRef } from "react";

const API_URL = "http://127.0.0.1:8000";

function ConfidenceMeter({ value }) {
  return (
    <div className="confidence-wrap">
      <div className="confidence-label">
        <span>Match Confidence</span>
        <span>{value}%</span>
      </div>
      <div className="confidence-bar-bg">
        <div className="confidence-bar-fill" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function RiskMeter({ level }) {
  const levels = { Low: 33, Medium: 66, High: 100 };
  const colors = { Low: "#2ecc71", Medium: "#f1c40f", High: "#e74c3c" };
  return (
    <div className="risk-meter-wrap">
      <div className="confidence-label">
        <span>Priority / Risk</span>
        <span style={{ color: colors[level] }}>{level}</span>
      </div>
      <div className="confidence-bar-bg">
        <div
          className="confidence-bar-fill"
          style={{ width: `${levels[level] || 50}%`, background: colors[level] || "#999" }}
        />
      </div>
    </div>
  );
}

function AnalyzeTab() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [checkedSteps, setCheckedSteps] = useState({});
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recog = new SpeechRecognition();
      recog.continuous = false;
      recog.interimResults = false;
      recog.lang = "en-IN";
      recog.onresult = (e) => {
        const transcript = e.results[0][0].transcript;
        setText((prev) => (prev ? prev + " " + transcript : transcript));
      };
      recog.onend = () => setListening(false);
      recognitionRef.current = recog;
    }
  }, []);

  const toggleMic = () => {
    if (!recognitionRef.current) {
      alert("Voice input not supported in this browser. Try Chrome.");
      return;
    }
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      recognitionRef.current.start();
      setListening(true);
    }
  };

  const handleAnalyze = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setCheckedSteps({});

    try {
      const response = await fetch(`${API_URL}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim() }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || "Something went wrong");
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleStep = (i) => {
    setCheckedSteps((prev) => ({ ...prev, [i]: !prev[i] }));
  };

  const doneCount = result ? Object.values(checkedSteps).filter(Boolean).length : 0;
  const totalSteps = result ? result.roadmap.length : 0;
  const progressPct = totalSteps ? Math.round((doneCount / totalSteps) * 100) : 0;

  const exportAsPDF = () => {
    if (!result) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 16;
    const maxWidth = pageWidth - margin * 2;
    let y = 0;

    // Palette
    const purple = [108, 92, 231];
    const purpleLight = [162, 155, 254];
    const dark = [30, 30, 40];
    const gray = [110, 110, 120];
    const lightBg = [246, 245, 252];
    const green = [46, 204, 113];
    const amber = [230, 168, 20];
    const red = [231, 76, 60];

    const priorityColor =
      result.priority === "High" ? red : result.priority === "Low" ? green : amber;

    const ensureSpace = (needed) => {
      if (y + needed > 283) {
        addFooter();
        doc.addPage();
        y = 20;
      }
    };

    const sectionHeading = (title, emoji) => {
      ensureSpace(14);
      doc.setFillColor(...lightBg);
      doc.roundedRect(margin - 3, y - 5, maxWidth + 6, 10, 2, 2, "F");
      doc.setTextColor(...purple);
      doc.setFont(undefined, "bold");
      doc.setFontSize(12);
      doc.text(`${emoji}  ${title}`, margin, y + 1.5);
      doc.setTextColor(...dark);
      y += 12;
    };

    const bulletLine = (text, dotColor) => {
      doc.setFontSize(10.5);
      doc.setFont(undefined, "normal");
      const lines = doc.splitTextToSize(text, maxWidth - 8);
      lines.forEach((line, idx) => {
        ensureSpace(7);
        if (idx === 0) {
          doc.setFillColor(...(dotColor || purpleLight));
          doc.circle(margin + 1.3, y - 1.3, 1.1, "F");
        }
        doc.setTextColor(...dark);
        doc.text(line, margin + 6, y);
        y += 6;
      });
    };

    const numberedLine = (num, text) => {
      doc.setFontSize(10.5);
      doc.setFont(undefined, "normal");
      const lines = doc.splitTextToSize(text, maxWidth - 10);
      lines.forEach((line, idx) => {
        ensureSpace(7);
        if (idx === 0) {
          doc.setFillColor(...purple);
          doc.circle(margin + 2.5, y - 1.3, 2.8, "F");
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(7.5);
          doc.setFont(undefined, "bold");
          doc.text(String(num), margin + 2.5, y - 0.6, { align: "center" });
        }
        doc.setTextColor(...dark);
        doc.setFontSize(10.5);
        doc.setFont(undefined, "normal");
        doc.text(line, margin + 9, y);
        y += 6;
      });
    };

    const addFooter = () => {
      const pageCount = doc.internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(...gray);
      doc.setFont(undefined, "normal");
      doc.text("Generated by LifeLens AI", margin, 293);
      doc.text(`Page ${pageCount}`, pageWidth - margin, 293, { align: "right" });
    };

    // ---------- Header banner ----------
    doc.setFillColor(...purple);
    doc.rect(0, 0, pageWidth, 34, "F");
    doc.setFillColor(...purpleLight);
    doc.rect(0, 34, pageWidth, 1.5, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, "bold");
    doc.setFontSize(19);
    doc.text("LifeLens AI", margin, 16);
    doc.setFontSize(10.5);
    doc.setFont(undefined, "normal");
    doc.text("Decision Analysis Report", margin, 24);

    const genDate = new Date().toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
    });
    doc.setFontSize(9);
    doc.text(genDate, pageWidth - margin, 16, { align: "right" });

    doc.setTextColor(...dark);
    y = 46;

    // ---------- Goal block ----------
    doc.setFontSize(15);
    doc.setFont(undefined, "bold");
    const goalLines = doc.splitTextToSize(result.goal, maxWidth);
    goalLines.forEach((line) => {
      doc.text(line, margin, y);
      y += 7;
    });
    y += 2;

    // ---------- Badge row (category / priority / confidence) ----------
    const badge = (label, value, color, x) => {
      doc.setFontSize(8.5);
      const text = `${label}: ${value}`;
      const w = doc.getTextWidth(text) + 8;
      doc.setFillColor(...color, );
      doc.setDrawColor(...color);
      doc.roundedRect(x, y - 5, w, 8, 3, 3, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont(undefined, "bold");
      doc.text(text, x + 4, y);
      return x + w + 5;
    };

    let bx = margin;
    doc.setTextColor(255, 255, 255);
    bx = badge("Category", result.category, purple, bx);
    bx = badge("Priority", result.priority, priorityColor, bx);
    bx = badge("Confidence", `${result.confidence}%`, [90, 90, 100], bx);
    doc.setTextColor(...dark);
    y += 12;

    // divider
    doc.setDrawColor(230, 230, 236);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    // ---------- Current Direction ----------
    sectionHeading("Current Direction", "🧭");
    doc.setFontSize(10.5);
    doc.setFont(undefined, "italic");
    const cdLines = doc.splitTextToSize(result.current_direction, maxWidth);
    cdLines.forEach((line) => {
      ensureSpace(7);
      doc.text(line, margin, y);
      y += 6;
    });
    doc.setFont(undefined, "normal");
    y += 4;

    // ---------- Risks ----------
    sectionHeading("Risks", "⚠️");
    result.risks.forEach((r) => bulletLine(r, red));
    y += 4;

    // ---------- Roadmap ----------
    sectionHeading("Roadmap", "🛣️");
    result.roadmap.forEach((r, i) => numberedLine(i + 1, r));
    y += 4;

    // ---------- Recommendations ----------
    sectionHeading("Recommendations", "💡");
    result.recommendations.forEach((r) => bulletLine(r, green));
    y += 4;

    // ---------- Next Step (highlight box) ----------
    ensureSpace(24);
    doc.setFontSize(10.5);
    const nsLines = doc.splitTextToSize(result.next_step, maxWidth - 12);
    const boxHeight = 14 + nsLines.length * 5.5;
    doc.setFillColor(255, 249, 230);
    doc.setDrawColor(...amber);
    doc.roundedRect(margin - 3, y - 6, maxWidth + 6, boxHeight, 2, 2, "FD");
    doc.setFont(undefined, "bold");
    doc.setTextColor(...amber);
    doc.setFontSize(11);
    doc.text("🚀 Next Step", margin + 2, y + 1);
    y += 8;
    doc.setFont(undefined, "normal");
    doc.setTextColor(...dark);
    doc.setFontSize(10.5);
    nsLines.forEach((line) => {
      doc.text(line, margin + 2, y);
      y += 5.5;
    });

    addFooter();
    doc.save("lifelens-analysis.pdf");
  };

  return (
    <div>
      <div className="input-row">
        <textarea
          rows={4}
          placeholder="e.g. I want to learn AI and take an internship."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button className={`mic-btn ${listening ? "listening" : ""}`} onClick={toggleMic} title="Voice input">
          {listening ? "🔴" : "🎙️"}
        </button>
      </div>

      <button className="primary-btn" onClick={handleAnalyze} disabled={loading || !text.trim()}>
        {loading ? "Analyzing..." : "Analyze"}
      </button>

      {error && <div className="error">⚠️ {error}</div>}

      {result && (
        <div className="result-card">
          <div className="result-header">
            <h2>🎯 {result.goal}</h2>
            <span className="category-badge">{result.category}</span>
          </div>

          <ConfidenceMeter value={result.confidence} />
          <RiskMeter level={result.priority} />

          <p className="current-direction">
            <strong>Current direction:</strong> {result.current_direction}
          </p>

          <div className="section">
            <h3>⚠️ Risks</h3>
            <ul>
              {result.risks.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>

          <div className="section">
            <div className="roadmap-header">
              <h3>🛣️ Roadmap</h3>
              <span className="progress-text">{doneCount}/{totalSteps} done ({progressPct}%)</span>
            </div>
            <div className="progress-bar-bg">
              <div className="progress-bar-fill" style={{ width: `${progressPct}%` }} />
            </div>
            <ul className="roadmap-checklist">
              {result.roadmap.map((step, i) => (
                <li key={i} className={checkedSteps[i] ? "checked" : ""} onClick={() => toggleStep(i)}>
                  <span className="checkbox">{checkedSteps[i] ? "✅" : "⬜"}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="section">
            <h3>💡 Recommendations</h3>
            <ul>
              {result.recommendations.map((rec, i) => (
                <li key={i}>{rec}</li>
              ))}
            </ul>
          </div>

          <div className="next-step">
            <h3>🚀 Next Step</h3>
            <p>{result.next_step}</p>
          </div>

          <button className="secondary-btn" onClick={exportAsPDF}>
            📄 Download PDF Report
          </button>
        </div>
      )}
    </div>
  );
}

function CompareTab() {
  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const handleCompare = async () => {
    if (!optionA.trim() || !optionB.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`${API_URL}/compare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ option_a: optionA.trim(), option_b: optionB.trim() }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || "Something went wrong");
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const metrics = [
    { key: "skill_growth", label: "Skill Growth" },
    { key: "time_cost", label: "Time Cost" },
    { key: "financial_risk", label: "Financial Risk" },
    { key: "long_term_value", label: "Long-Term Value" },
  ];

  return (
    <div>
      <div className="compare-inputs">
        <input
          type="text"
          placeholder="Option A e.g. Do an internship"
          value={optionA}
          onChange={(e) => setOptionA(e.target.value)}
        />
        <span className="vs-label">VS</span>
        <input
          type="text"
          placeholder="Option B e.g. Focus on college project"
          value={optionB}
          onChange={(e) => setOptionB(e.target.value)}
        />
      </div>

      <button
        className="primary-btn"
        onClick={handleCompare}
        disabled={loading || !optionA.trim() || !optionB.trim()}
      >
        {loading ? "Comparing..." : "Compare Options"}
      </button>

      {error && <div className="error">⚠️ {error}</div>}

      {result && (
        <div className="result-card">
          <h2>📊 Comparison</h2>
          <table className="compare-table">
            <thead>
              <tr>
                <th>Factor</th>
                <th>{result.option_a.label}</th>
                <th>{result.option_b.label}</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((m) => (
                <tr key={m.key}>
                  <td>{m.label}</td>
                  <td>{result.option_a[m.key]} / 10</td>
                  <td>{result.option_b[m.key]} / 10</td>
                </tr>
              ))}
              <tr className="score-row">
                <td><strong>Overall Score</strong></td>
                <td><strong>{result.option_a.score}</strong></td>
                <td><strong>{result.option_b.score}</strong></td>
              </tr>
            </tbody>
          </table>
          <div className="recommend-box">
            🏆 Recommended: <strong>{result.recommended}</strong>
          </div>
        </div>
      )}
    </div>
  );
}

function HistoryTab() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/history`);
      const data = await res.json();
      setHistory(data.history || []);
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const clearHistory = async () => {
    await fetch(`${API_URL}/history`, { method: "DELETE" });
    setHistory([]);
  };

  return (
    <div>
      <div className="history-header">
        <h2>🕓 Past Analyses</h2>
        <div>
          <button className="secondary-btn small" onClick={loadHistory}>🔄 Refresh</button>
          <button className="secondary-btn small danger" onClick={clearHistory}>🗑️ Clear</button>
        </div>
      </div>

      {loading && <p>Loading...</p>}
      {!loading && history.length === 0 && <p className="muted">No history yet. Analyze something first.</p>}

      <ul className="history-list">
        {history.map((h, i) => (
          <li key={i}>
            <div className="history-top">
              <span className="category-badge small">{h.category}</span>
              <span className="history-time">{h.timestamp}</span>
            </div>
            <p className="history-text">{h.text}</p>
            <span className={`priority-tag ${h.priority.toLowerCase()}`}>{h.priority} • {h.confidence}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("analyze");
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    document.body.className = theme === "light" ? "light-theme" : "";
  }, [theme]);

  return (
    <div className="container">
      <div className="top-bar">
        <div>
          <h1>🧠 LifeLens AI</h1>
          <p className="subtitle">Decision support — analyze, compare, track.</p>
        </div>
        <button className="theme-toggle" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
      </div>

      <div className="tabs">
        <button className={tab === "analyze" ? "tab active" : "tab"} onClick={() => setTab("analyze")}>
          🎯 Analyze
        </button>
        <button className={tab === "compare" ? "tab active" : "tab"} onClick={() => setTab("compare")}>
          ⚖️ Compare
        </button>
        <button className={tab === "history" ? "tab active" : "tab"} onClick={() => setTab("history")}>
          🕓 History
        </button>
      </div>

      {tab === "analyze" && <AnalyzeTab />}
      {tab === "compare" && <CompareTab />}
      {tab === "history" && <HistoryTab />}
    </div>
  );
}
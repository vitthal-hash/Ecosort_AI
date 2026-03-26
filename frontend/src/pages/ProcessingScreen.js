import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { WASTE_ITEMS, BIN_MAP } from "../data/wasteData";
import "./ProcessingScreen.css";

export default function ProcessingScreen() {
  const { scanResults, setConfirmedItems, processingDone } = useApp();
  const navigate = useNavigate();

  // ── ALL hooks must be at the top — no returns before these ────────────────
  const [currentClassIdx, setCurrentClassIdx] = useState(0);
  const [selected,        setSelected]        = useState({});
  const [phase,           setPhase]           = useState("select");
  const [skipped,         setSkipped]         = useState(new Set());
  const [animatingOut,    setAnimatingOut]    = useState(false);

  // Derived values (safe after hooks)
  const classQueue   = Object.keys(scanResults).filter(c => scanResults[c] > 0);
  const currentClass = classQueue[currentClassIdx];
  const maxAllowed   = currentClass ? (scanResults[currentClass] || 1) : 0;
  const items        = currentClass ? (WASTE_ITEMS[currentClass.toLowerCase()] || []) : [];
  const mySelected   = selected[currentClass] || [];
  const binInfo      = currentClass ? BIN_MAP[currentClass.toLowerCase()] : null;

  // ── Guard: already confirmed items this session ───────────────────────────
  if (processingDone) {
    return (
      <div className="proc-empty">
        <div className="proc-empty-icon">✅</div>
        <h2>Items already processed!</h2>
        <p>
          You have already selected and confirmed items for this scan session.
          Head to Bin Sort to finish sorting, or start a new detection.
        </p>
        <div className="btn-row">
        <button onClick={() => navigate("/bin-animation")}>🗑️ Continue to Bin Sort</button>
        <button onClick={() => navigate("/scan")} style={{ marginTop: 8 }}>🔍 New Detection</button>
        <button onClick={() => navigate("/stats")} style={{ marginTop: 8 }}>📊 View Statistics</button>
        </div>
      </div>
    );
  }

  // ── Guard: nothing detected yet ───────────────────────────────────────────
  if (classQueue.length === 0) {
    return (
      <div className="proc-empty">
        <div className="proc-empty-icon">🔍</div>
        <h2>No detections to process</h2>
        <p>Go back to the scanner and detect some waste objects first.</p>
        <button onClick={() => navigate("/scan")}>← Back to Scanner</button>
      </div>
    );
  }

  // ── Handlers ──────────────────────────────────────────────────────────────
  function toggleItem(itemId) {
    setSelected(prev => {
      const cur = prev[currentClass] || [];
      if (cur.includes(itemId)) return { ...prev, [currentClass]: cur.filter(i => i !== itemId) };
      if (cur.length >= maxAllowed) return prev;
      return { ...prev, [currentClass]: [...cur, itemId] };
    });
  }

  function nextClass() {
    if (mySelected.length === 0 && !skipped.has(currentClass)) return;
    setAnimatingOut(true);
    setTimeout(() => {
      setAnimatingOut(false);
      if (currentClassIdx + 1 >= classQueue.length) setPhase("summary");
      else setCurrentClassIdx(i => i + 1);
    }, 400);
  }

  function skipClass() {
    setSkipped(prev => new Set([...prev, currentClass]));
    setSelected(prev => ({ ...prev, [currentClass]: [] }));
    setAnimatingOut(true);
    setTimeout(() => {
      setAnimatingOut(false);
      if (currentClassIdx + 1 >= classQueue.length) setPhase("summary");
      else setCurrentClassIdx(i => i + 1);
    }, 400);
  }

  function handleConfirm() {
    const confirmed = [];
    classQueue.forEach(cls => {
      (selected[cls] || []).forEach(id => {
        const item = (WASTE_ITEMS[cls.toLowerCase()] || []).find(i => i.id === id);
        if (item) confirmed.push({ ...item, class: cls, bin: BIN_MAP[cls.toLowerCase()]?.bin });
      });
    });
    setConfirmedItems(confirmed);
    navigate("/bin-animation");
  }

  // ── Summary phase ──────────────────────────────────────────────────────────
  if (phase === "summary") {
    const allSelected = classQueue.flatMap(cls =>
      (selected[cls] || []).map(id => {
        const item = (WASTE_ITEMS[cls.toLowerCase()] || []).find(i => i.id === id);
        return item ? { ...item, class: cls } : null;
      }).filter(Boolean)
    );

    return (
      <div className="proc-root summary-phase">
        <div className="summary-header">
          <div className="summary-title">
            <span className="summary-icon">✅</span>
            <div>
              <h1>Confirmed Items</h1>
              <p>{allSelected.length} item{allSelected.length !== 1 ? "s" : ""} ready for disposal</p>
            </div>
          </div>
        </div>

        <div className="summary-grid">
          {allSelected.map((item, i) => (
            <div key={item.id + i} className="summary-card" style={{ animationDelay: `${i * 0.05}s` }}>
              <img src={item.img} alt={item.label} onError={e => { e.target.style.display = "none"; }} />
              <span className="summary-emoji">{item.emoji}</span>
              <div className="summary-card-info">
                <div className="summary-card-label">{item.label}</div>
                <div className="summary-card-class">{item.class}</div>
              </div>
            </div>
          ))}
        </div>

        {allSelected.length === 0 && (
          <div className="summary-none">No items selected. All were marked as wrong detections.</div>
        )}

        <div className="summary-actions">
          <button className="btn-back" onClick={() => { setPhase("select"); setCurrentClassIdx(0); }}>
            ← Edit Selections
          </button>
          <button className="btn-confirm" onClick={handleConfirm} disabled={allSelected.length === 0}>
            Proceed to Bin Sorting →
          </button>
        </div>
      </div>
    );
  }

  // ── Selection phase ────────────────────────────────────────────────────────
  return (
    <div className={`proc-root ${animatingOut ? "slide-out" : "slide-in"}`}>

      <div className="proc-progress-bar">
        {classQueue.map((cls, i) => (
          <div
            key={cls}
            className={`proc-progress-segment ${i < currentClassIdx ? "done" : i === currentClassIdx ? "active" : ""}`}
          >
            <div className="proc-progress-dot" />
            <span>{cls}</span>
          </div>
        ))}
      </div>

      <div className="proc-class-header">
        <div className="proc-class-meta">
          <div className="proc-class-name" style={{ color: binInfo?.color || "#00ffc8" }}>
            {currentClass?.toUpperCase()}
          </div>
          <div className="proc-class-sub">
            Select up to <strong>{maxAllowed}</strong> item{maxAllowed !== 1 ? "s" : ""} detected
            <span className="proc-class-count">{mySelected.length}/{maxAllowed}</span>
          </div>
        </div>
        <div className="proc-bin-badge" style={{ background: (binInfo?.color || "#00ffc8") + "22", borderColor: binInfo?.color }}>
          {binInfo?.emoji} {binInfo?.bin}
        </div>
      </div>

      <div className="proc-items-grid">
        {items.map((item, i) => {
          const isSelected = mySelected.includes(item.id);
          const isDisabled = !isSelected && mySelected.length >= maxAllowed;
          return (
            <button
              key={item.id}
              className={`item-card ${isSelected ? "selected" : ""} ${isDisabled ? "disabled" : ""}`}
              onClick={() => toggleItem(item.id)}
              style={{ animationDelay: `${i * 0.06}s`, "--cls-color": binInfo?.color || "#00ffc8" }}
            >
              <div className="item-card-img-wrap">
                <img src={item.img} alt={item.label} className="item-card-img"
                  onError={e => { e.target.style.display = "none"; }} />
                <span className="item-card-emoji">{item.emoji}</span>
                {isSelected && <div className="item-check">✓</div>}
              </div>
              <div className="item-card-label">{item.label}</div>
            </button>
          );
        })}
      </div>

      <div className="proc-actions">
        <button className="btn-wrong" onClick={skipClass}>
          ⚠️ Wrong Detection — Skip
        </button>
        <button className="btn-next" onClick={nextClass} disabled={mySelected.length === 0}>
          {currentClassIdx + 1 >= classQueue.length
            ? "Review All →"
            : `Next: ${classQueue[currentClassIdx + 1] || ""} →`}
        </button>
      </div>

    </div>
  );
}
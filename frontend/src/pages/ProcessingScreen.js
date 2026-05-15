import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "../context/AppContext";
import { WASTE_ITEMS, BIN_MAP } from "../data/wasteData";
import "./ProcessingScreen.css";

export default function ProcessingScreen() {
  const { scanResults, setConfirmedItems, processingDone } = useApp();
  const navigate = useNavigate();

  // ── ALL hooks must be at the top — no returns before these ────────────────
  const [currentClassIdx, setCurrentClassIdx] = useState(0);
  // selected shape: { [className]: { [itemId]: count } }
  // e.g. { plastic: { plastic_bottle: 3, plastic_bag: 1 } }
  const [selected,        setSelected]        = useState({});
  const [phase,           setPhase]           = useState("select");
  const [skipped,         setSkipped]         = useState(new Set());
  const [animatingOut,    setAnimatingOut]    = useState(false);

  // Derived values (safe after hooks)
  const classQueue      = Object.keys(scanResults).filter(c => scanResults[c] > 0);
  const currentClass    = classQueue[currentClassIdx];
  const maxAllowed      = currentClass ? (scanResults[currentClass] || 1) : 0;
  const items           = currentClass ? (WASTE_ITEMS[currentClass.toLowerCase()] || []) : [];
  // mySelected is { itemId: count } for the current class
  const mySelected      = selected[currentClass] || {};
  const mySelectedTotal = Object.values(mySelected).reduce((a, b) => a + b, 0);
  const binInfo         = currentClass ? BIN_MAP[currentClass.toLowerCase()] : null;

  // ── Guard: already confirmed items this session ───────────────────────────
  if (processingDone) {
    return (
      <motion.div className="proc-empty" initial={{opacity:0}} animate={{opacity:1}}>
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
      </motion.div>
    );
  }

  // ── Guard: nothing detected yet ───────────────────────────────────────────
  if (classQueue.length === 0) {
    return (
      <motion.div className="proc-empty" initial={{opacity:0}} animate={{opacity:1}}>
        <div className="proc-empty-icon">🔍</div>
        <h2>No detections to process</h2>
        <p>Go back to the scanner and detect some waste objects first.</p>
        <button onClick={() => navigate("/scan")}>← Back to Scanner</button>
      </motion.div>
    );
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  // Clicking a card INCREMENTS its count (up to maxAllowed total across all cards).
  // Right-clicking or long-pressing decrements (handled via onContextMenu).
  function incrementItem(itemId) {
    setSelected(prev => {
      const cur = prev[currentClass] || {};
      const currentCount = cur[itemId] || 0;
      if (mySelectedTotal >= maxAllowed) return prev; // already at max
      return {
        ...prev,
        [currentClass]: { ...cur, [itemId]: currentCount + 1 },
      };
    });
  }

  function decrementItem(itemId) {
    setSelected(prev => {
      const cur = prev[currentClass] || {};
      const currentCount = cur[itemId] || 0;
      if (currentCount === 0) return prev;
      const updated = { ...cur, [itemId]: currentCount - 1 };
      if (updated[itemId] === 0) delete updated[itemId];
      return { ...prev, [currentClass]: updated };
    });
  }

  function nextClass() {
    if (mySelectedTotal === 0 && !skipped.has(currentClass)) return;
    setAnimatingOut(true);
    setTimeout(() => {
      setAnimatingOut(false);
      if (currentClassIdx + 1 >= classQueue.length) setPhase("summary");
      else setCurrentClassIdx(i => i + 1);
    }, 400);
  }

  function skipClass() {
    setSkipped(prev => new Set([...prev, currentClass]));
    setSelected(prev => ({ ...prev, [currentClass]: {} }));
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
      const counts = selected[cls] || {};
      Object.entries(counts).forEach(([id, count]) => {
        const item = (WASTE_ITEMS[cls.toLowerCase()] || []).find(i => i.id === id);
        if (item && count > 0) {
          // Push one entry per count so downstream logic stays simple
          for (let n = 0; n < count; n++) {
            confirmed.push({ ...item, class: cls, bin: BIN_MAP[cls.toLowerCase()]?.bin });
          }
        }
      });
    });
    setConfirmedItems(confirmed);
    navigate("/bin-animation");
  }

  // ── Summary phase ──────────────────────────────────────────────────────────
  if (phase === "summary") {
    // Expand { itemId: count } maps into a flat array for display
    const allSelected = classQueue.flatMap(cls => {
      const counts = selected[cls] || {};
      return Object.entries(counts).flatMap(([id, count]) => {
        const item = (WASTE_ITEMS[cls.toLowerCase()] || []).find(i => i.id === id);
        if (!item || count === 0) return [];
        return Array.from({ length: count }, (_, n) => ({ ...item, class: cls, _key: `${id}-${n}` }));
      });
    });

    return (
      <motion.div
        className="proc-root summary-phase"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
      >
        <div className="summary-header">
          <div className="summary-title">
            <span className="summary-icon">✅</span>
            <div>
              <h1>Confirmed Items</h1>
              <p>{allSelected.length} item{allSelected.length !== 1 ? "s" : ""} ready for disposal</p>
            </div>
          </div>
        </div>

        <motion.div
          className="summary-grid"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
          }}
        >
          {allSelected.map((item, i) => (
            <motion.div
              key={item._key}
              className="summary-card"
              variants={{
                hidden: { opacity: 0, y: 15 },
                visible: { opacity: 1, y: 0 }
              }}
              whileHover={{ scale: 1.05 }}
            >
              <img src={item.img} alt={item.label} onError={e => { e.target.style.display = "none"; }} />
              <span className="summary-emoji">{item.emoji}</span>
              <div className="summary-card-info">
                <div className="summary-card-label">{item.label}</div>
                <div className="summary-card-class">{item.class}</div>
              </div>
            </motion.div>
          ))}
        </motion.div>

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
      </motion.div>
    );
  }

  // ── Selection phase ────────────────────────────────────────────────────────
  return (
    <motion.div
      className="proc-root"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: animatingOut ? 0 : 1, x: animatingOut ? -30 : 0 }}
      transition={{ duration: 0.3 }}
    >

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
            Tap to add · right-click to remove · up to <strong>{maxAllowed}</strong> item{maxAllowed !== 1 ? "s" : ""}
            <span className="proc-class-count">{mySelectedTotal}/{maxAllowed}</span>
          </div>
        </div>
        <motion.div
          className="proc-bin-badge"
          style={{ background: (binInfo?.color || "#00ffc8") + "22", borderColor: binInfo?.color }}
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {binInfo?.emoji} {binInfo?.bin}
        </motion.div>
      </div>

      <motion.div
        className="proc-items-grid"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
        }}
      >
        {items.map((item) => {
          const itemCount = mySelected[item.id] || 0;
          const isSelected = itemCount > 0;
          const isDisabled = !isSelected && mySelectedTotal >= maxAllowed;
          return (
            <motion.button
              key={item.id}
              className={`item-card ${isSelected ? "selected" : ""} ${isDisabled ? "disabled" : ""}`}
              onClick={() => incrementItem(item.id)}
              onContextMenu={(e) => { e.preventDefault(); decrementItem(item.id); }}
              style={{ "--cls-color": binInfo?.color || "#00ffc8" }}
              variants={{
                hidden: { opacity: 0, scale: 0.9, y: 20 },
                visible: { opacity: 1, scale: 1, y: 0 }
              }}
              whileHover={!isDisabled ? { scale: 1.04, y: -4, boxShadow: `0 12px 32px rgba(0,0,0,0.3), 0 0 20px ${binInfo?.color || "#00ffc8"}40` } : {}}
              whileTap={!isDisabled ? { scale: 0.96 } : {}}
            >
              <div className="item-card-img-wrap">
                <img src={item.img} alt={item.label} className="item-card-img"
                  onError={e => { e.target.style.display = "none"; }} />
                <span className="item-card-emoji">{item.emoji}</span>
                {/* Show count badge when > 0 */}
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      className="item-check"
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0 }}
                      style={{
                        width: 28, height: 28,
                        fontSize: itemCount > 9 ? 11 : 14,
                        fontWeight: 700,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >
                      {itemCount}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="item-card-label">{item.label}</div>
            </motion.button>
          );
        })}
      </motion.div>

      <div className="proc-actions">
        <button className="btn-wrong" onClick={skipClass}>
          ⚠️ Wrong Detection — Skip
        </button>
        <button className="btn-next" onClick={nextClass} disabled={mySelectedTotal === 0}>
          {currentClassIdx + 1 >= classQueue.length
            ? "Review All →"
            : `Next: ${classQueue[currentClassIdx + 1] || ""} →`}
        </button>
      </div>

    </motion.div>
  );
}
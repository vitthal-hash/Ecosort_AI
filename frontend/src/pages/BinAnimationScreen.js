import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { BIN_MAP, ECO_IMPACT } from "../data/wasteData";
import "./BinAnimationScreen.css";

// ── SVG Dustbin Components ─────────────────────────────────────────────────
function DustbinSVG({ color, label, isActive, isTarget, phase }) {
  const lid = isActive ? -22 : phase === "flying" && isTarget ? -14 : 0;
  const glowOpacity = isActive ? 0.45 : isTarget && phase === "flying" ? 0.2 : 0;

  return (
    <svg
      viewBox="0 0 100 130"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", height: "100%", overflow: "visible" }}
    >
      <defs>
        <radialGradient id={`glow-${label}`} cx="50%" cy="100%" r="60%">
          <stop offset="0%" stopColor={color} stopOpacity={glowOpacity} />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`body-${label}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.9" />
          <stop offset="100%" stopColor={color} stopOpacity="0.65" />
        </linearGradient>
        <linearGradient id={`shine-${label}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.2" />
          <stop offset="50%" stopColor="#fff" stopOpacity="0.04" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.1" />
        </linearGradient>
        <filter id={`shadow-${label}`}>
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor={color} floodOpacity="0.35" />
        </filter>
      </defs>

      {/* Ground glow */}
      <ellipse cx="50" cy="128" rx="38" ry="7" fill={`url(#glow-${label})`} />

      {/* Body */}
      <path
        d="M16 52 Q14 58 14 120 Q14 128 22 128 L78 128 Q86 128 86 120 L86 52 Z"
        fill={`url(#body-${label})`}
        filter={`url(#shadow-${label})`}
        style={{ transition: "all 0.3s ease" }}
      />
      {/* Body shine */}
      <path
        d="M20 52 Q18 58 18 118 L26 118 Q26 60 26 52 Z"
        fill="url(#shine-${label})"
        opacity="0.5"
      />
      {/* Vertical ribs */}
      {[38, 50, 62].map(x => (
        <line key={x} x1={x} y1="58" x2={x} y2="122"
          stroke="#000" strokeOpacity="0.1" strokeWidth="1.5" />
      ))}

      {/* Lid hinge */}
      <rect x="38" y="44" width="24" height="5" rx="2.5"
        fill={color} opacity="0.7" />

      {/* Lid — animates open when active/target */}
      <g
        transform={`rotate(${lid}, 50, 46)`}
        style={{ transition: "transform 0.35s cubic-bezier(0.22,1,0.36,1)", transformOrigin: "50px 46px" }}
      >
        <rect x="10" y="36" width="80" height="14" rx="7"
          fill={color}
          filter={`url(#shadow-${label})`}
        />
        {/* Lid handle */}
        <rect x="38" y="30" width="24" height="9" rx="4.5"
          fill={color} opacity="0.85" />
        <rect x="44" y="32" width="12" height="5" rx="2.5"
          fill="#000" opacity="0.2" />
        {/* Lid shine */}
        <rect x="14" y="37" width="30" height="5" rx="2.5"
          fill="#fff" opacity="0.15" />
      </g>

      {/* Recycling / waste symbol */}
      <text x="50" y="98" textAnchor="middle" fontSize="22" opacity="0.3" fill="#fff">
        {
  label === "Dry Waste" ? "♻" :
  label === "Wet / Bio Waste" ? "🌿" :
  label === "Biomedical Waste" ? "☣" :
  label === "E-Waste Bin" ? "💻" :
  "♻"
}
      </text>

      {/* Active sparkles */}
      {isActive && (
        <>
          <circle cx="18" cy="30" r="3" fill={color} opacity="0.7">
            <animate attributeName="r" values="3;6;3" dur="0.6s" repeatCount="2" />
            <animate attributeName="opacity" values="0.7;0;0.7" dur="0.6s" repeatCount="2" />
          </circle>
          <circle cx="82" cy="25" r="2.5" fill={color} opacity="0.6">
            <animate attributeName="r" values="2.5;5;2.5" dur="0.5s" begin="0.1s" repeatCount="2" />
            <animate attributeName="opacity" values="0.6;0;0.6" dur="0.5s" begin="0.1s" repeatCount="2" />
          </circle>
          <circle cx="50" cy="18" r="2" fill="#fff" opacity="0.5">
            <animate attributeName="r" values="2;4;2" dur="0.7s" begin="0.2s" repeatCount="2" />
            <animate attributeName="opacity" values="0.5;0;0.5" dur="0.7s" begin="0.2s" repeatCount="2" />
          </circle>
        </>
      )}
    </svg>
  );
}

// ── Bin Config ─────────────────────────────────────────────────────────────
const BINS = [
  {
    key:   "Dry Waste",
    color: "#3b82f6",
    label: "Dry Waste",
    desc:  "Paper · Plastic · Metal · Glass",
    emoji: "🔵",
  },
  {
    key:   "Wet / Bio Waste",
    color: "#22c55e",
    label: "Wet / Bio Waste",
    desc:  "Food scraps · Organic material",
    emoji: "🟢",
  },
  {
    key:   "Biomedical Waste",
    color: "#ef4444",
    label: "Biomedical Waste",
    desc:  "Medical items — handle with care",
    emoji: "🔴",
  },
  {
  key:   "E-Waste Bin",
  color: "#f59e0b",
  label: "E-Waste Bin",
  desc:  "Electronics · Batteries · Devices",
  emoji: "🟠",
},
];

// ── TTS — only speak when explicitly called ────────────────────────────────
function speakText(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const clean = text.replace(/[#*`♻️🔵🟢🔴💡🌿☣]/g, "").trim();
  const utt = new SpeechSynthesisUtterance(clean);
  utt.rate = 1.05; utt.pitch = 1.1; utt.volume = 0.95;
  const tryVoice = () => {
    const v = window.speechSynthesis.getVoices();
    const pick = v.find(x => x.lang.startsWith("en-IN")) || v.find(x => x.lang.startsWith("en"));
    if (pick) utt.voice = pick;
  };
  tryVoice();
  if (!window.speechSynthesis.getVoices().length) {
    window.speechSynthesis.onvoiceschanged = tryVoice;
  }
  window.speechSynthesis.speak(utt);
}

// ── Arrow pointing toward a specific bin index (0=left, 1=center, 2=right) ─
function DirectionalArrow({ targetBinIndex, color, totalBins = 3 }) {
  // Map bin index to angle: left=40°, center=90°, right=140°
  const angles = {
    0: 140,
  1: 110,
  2: 70,
  3: 40,    // pointing right-down
  };
  const angle = angles[targetBinIndex] ?? 90;

  return (
    <div
      className="bin-directional-arrow"
      style={{
        transform: `rotate(${angle}deg)`,
        color: color,
        filter: `drop-shadow(0 0 8px ${color}88)`,
      }}
    >
      ↓
    </div>
  );
}

export default function BinAnimationScreen() {
  const { confirmedItems, finaliseSession, currentSession, sortingDone } = useApp();
  const navigate = useNavigate();

  const [currentIdx,   setCurrentIdx]   = useState(0);
  const [phase,        setPhase]        = useState("show"); // show | flying | landed | finished
  const [activeBin,    setActiveBin]    = useState(null);
  const [sessionSaved, setSessionSaved] = useState(false);

  // Track whether we are in an active sorting flow started THIS mount
  const isSortingActiveRef = useRef(false);

  const item    = confirmedItems[currentIdx];
  const binInfo = item ? BIN_MAP[item.class?.toLowerCase()] : null;
  const targetBinIndex = binInfo ? BINS.findIndex(b => b.key === binInfo.bin) : -1;

  // ── Guard: stop TTS if we arrived here without an active sorting flow ─────
  // If sortingDone is already true when we mount, do NOT start TTS ever.
  useEffect(() => {
    if (!sortingDone && confirmedItems.length > 0) {
      isSortingActiveRef.current = true;
    }
    // Cancel any lingering speech on mount
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  }, []);

  // ── Animate each item — ONLY when actively sorting ────────────────────────
  useEffect(() => {
    if (!item || phase === "finished") return;
    if (!isSortingActiveRef.current) return; // ← key fix: no speech if not sorting

    setPhase("show");
    setActiveBin(null);

    const t1 = setTimeout(() => {
      setPhase("flying");
      if (binInfo) {
        speakText(
          item.label + " goes into the " + binInfo.bin + " bin. " + (binInfo.tip || "")
        );
      }
      const t2 = setTimeout(() => {
        setActiveBin(binInfo?.bin);
        setPhase("landed");
      }, 1100);
      return () => clearTimeout(t2);
    }, 1600);

    return () => clearTimeout(t1);
  }, [currentIdx]);

  // Cancel speech when unmounting
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, []);

  const handleNext = useCallback(() => {
    if (currentIdx + 1 >= confirmedItems.length) {
      if (!sessionSaved) {
        finaliseSession(confirmedItems.map(i => ({
          ...i, bin: BIN_MAP[i.class?.toLowerCase()]?.bin || "Unknown",
        })));
        setSessionSaved(true);
      }
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      setPhase("finished");
    } else {
      setCurrentIdx(i => i + 1);
    }
  }, [currentIdx, confirmedItems, sessionSaved, finaliseSession]);

  // ── Finished summary ───────────────────────────────────────────────────────
  if (phase === "finished") {
    const session = currentSession || {};
    const byBin = {};
    confirmedItems.forEach(i => {
      const b = BIN_MAP[i.class?.toLowerCase()]?.bin || "Unknown";
      if (!byBin[b]) byBin[b] = [];
      byBin[b].push(i);
    });

    return (
      <div className="bin-finished">
        <div className="finished-celebration">
          <div className="finished-icon">🎉</div>
          <h1>All Items Sorted!</h1>
          <p className="finished-date">{session.date} · {session.time || ""}</p>
        </div>

        <div className="session-kpis">
          <div className="session-kpi">
            <div className="skpi-num">{session.totalItems || confirmedItems.length}</div>
            <div className="skpi-label">Items Sorted</div>
            <div className="skpi-icon">♻️</div>
          </div>
          <div className="session-kpi skpi-energy">
            <div className="skpi-num">{session.energySavedKWh || 0}</div>
            <div className="skpi-label">kWh Saved</div>
            <div className="skpi-icon">⚡</div>
          </div>
          <div className="session-kpi skpi-co2">
            <div className="skpi-num">{session.co2SavedKg || 0}</div>
            <div className="skpi-label">kg CO₂ Prevented</div>
            <div className="skpi-icon">🌍</div>
          </div>
        </div>

        <div className="bin-tally">
          {Object.entries(byBin).map(([bin, items]) => {
            const b = BINS.find(x => x.key === bin);
            return (
              <div key={bin} className="bin-tally-row" style={{ borderColor: (b?.color || "#64748b") + "55" }}>
                <div className="bin-tally-header" style={{ color: b?.color }}>
                  {b?.emoji} {bin}
                  <span className="tally-count">{items.length} item{items.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="bin-tally-items">
                  {items.map((it, i) => (
                    <span key={i} className="bin-tally-chip">{it.emoji} {it.label}</span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="finished-motivate">
          🌱 <strong>Great job!</strong> You sorted {session.totalItems || confirmedItems.length} item(s) today.
          That saves roughly <strong>{((session.energySavedKWh || 0) * 16.67).toFixed(0)} minutes</strong> of LED bulb energy!
        </div>

        <div className="finished-actions">
          <button className="btn-eco"   onClick={() => navigate("/eco-chat")}>🌿 Eco Tips & Chat →</button>
          <button className="btn-stats" onClick={() => navigate("/stats")}>📊 Full Statistics</button>
          <button className="btn-new"   onClick={() => navigate("/scan")}>🔍 New Scan</button>
        </div>
      </div>
    );
  }

  // ── Guard: already sorted or nothing to sort ───────────────────────────────
  const alreadyDone   = sortingDone && phase !== "finished";
  const nothingToSort = !sortingDone && confirmedItems.length === 0;

  if (alreadyDone || nothingToSort) {
    return (
      <div className="bin-guard">
        <div className="bin-guard-icon">{alreadyDone ? "✅" : "🔍"}</div>
        <h2>{alreadyDone ? "Items already sorted!" : "Nothing to sort yet"}</h2>
        <p>
          {alreadyDone
            ? "You have already sorted all items in this session. Start a new scan to sort more."
            : "No items confirmed yet. Go to Processing first and select your detected items."}
        </p>
        <div className="bin-guard-actions">
          <button className="bin-guard-btn primary" onClick={() => navigate("/scan")}>
            🔍 Start New Detection
          </button>
          {alreadyDone && (
            <button className="bin-guard-btn" onClick={() => navigate("/stats")}>
              📊 View Statistics
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Sorting screen ─────────────────────────────────────────────────────────
  const doneCount = currentIdx + (phase === "landed" ? 1 : 0);

  return (
    <div className="bin-root">

      <div className="bin-progress-wrap">
        <div className="bin-progress-label">Item {currentIdx + 1} of {confirmedItems.length}</div>
        <div className="bin-progress-track">
          <div className="bin-progress-fill" style={{ width: (doneCount / confirmedItems.length * 100) + "%" }} />
        </div>
      </div>

      <div className="bin-arena">

        {/* Flying item — at top, flies DOWN toward target bin */}
        {item && (
          <div
            className={"flying-item phase-" + phase}
            style={
              phase === "flying" || phase === "landed"
                ? {
                    "--fly-x": targetBinIndex === 0 ? "-120px" : targetBinIndex === 2 ? "120px" : "0px",
                  }
                : {}
            }
          >
            <div className="flying-item-inner">
              <img src={item.img} alt={item.label} className="flying-img"
                onError={e => { e.target.style.display = "none"; }} />
              <span className="flying-emoji">{item.emoji}</span>
            </div>
            <div className="flying-label">{item.label}</div>
            {phase === "show" && (
              <div className="flying-class-badge">{item.class}</div>
            )}
          </div>
        )}

        {/* Directional arrow pointing at the correct bin */}
        {(phase === "flying" || phase === "landed") && targetBinIndex >= 0 && (
          <DirectionalArrow
            targetBinIndex={targetBinIndex}
            color={binInfo?.color || "#22c55e"}
            totalBins={BINS.length}
          />
        )}

        {/* Bins row */}
        <div className="bins-row">
          {BINS.map((bin, idx) => {
            const isTarget = binInfo?.bin === bin.key;
            const isActive = activeBin === bin.key;
            const doneInBin = confirmedItems.slice(0, currentIdx)
              .filter(i => BIN_MAP[i.class?.toLowerCase()]?.bin === bin.key).length;

            return (
              <div
                key={bin.key}
                className={"bin-card" + (isActive ? " bin-active" : "") + (phase === "flying" && isTarget ? " bin-target" : "")}
                style={{ "--bcolor": bin.color }}
              >
                {isActive && <div className="bin-glow-ring" />}

                {/* SVG Dustbin illustration */}
                <div className="bin-svg-wrap">
                  <DustbinSVG
                    color={bin.color}
                    label={bin.label}
                    isActive={isActive}
                    isTarget={isTarget}
                    phase={phase}
                  />
                </div>

                <div className="bin-name" style={{ color: bin.color }}>{bin.label}</div>
                <div className="bin-desc">{bin.desc}</div>
                {doneInBin > 0 && (
                  <div className="bin-count-badge" style={{ background: bin.color }}>
                    {doneInBin} in
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>

      {/* Result card */}
      {phase === "landed" && binInfo && (
        
        <div className="bin-result-card" style={{ borderColor: binInfo.color + "55" }}>
          <div className="bin-result-icon" style={{ color: binInfo.color }}>{binInfo.emoji}</div>
          <div className="bin-result-text">
            <div className="bin-result-title" style={{ color: binInfo.color }}>
              Goes into {binInfo.bin}
            </div>
            <div className="bin-result-tip">💡 {binInfo.tip}</div>
            {(() => {
              const eco = ECO_IMPACT[item?.class?.toLowerCase()];
              if (!eco) return null;
              return (
                <div className="bin-eco-preview">
                  <div>♻️ {eco.energySaved}</div>
                  <div className="bin-reuse-list">
                    {eco.reuse.slice(0, 2).map((r, i) => (
                      <span key={i} className="bin-reuse-chip">💡 {r}</span>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
          <button
            className="btn-next-item"
            onClick={handleNext}
            style={{ background: binInfo.color }}
          >
            {currentIdx + 1 >= confirmedItems.length ? "See Summary →" : "Next Item →"}
          </button>
        </div>
      )}

    </div>
  );
}
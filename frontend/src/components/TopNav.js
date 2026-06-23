import { useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { useApp } from "../context/AppContext";
import { useEffect, useRef, useState } from "react";
import "./TopNav.css";

const NAV_ITEMS = [
  { path: "/processing",    label: "Processing",  icon: "🃏" },
  { path: "/bin-animation", label: "Bin Sort",    icon: "🗑️" },
  { path: "/eco-chat",      label: "Eco Chat",    icon: "🌿" },
  { path: "/stats",         label: "Statistics",  icon: "📊" },
  { path: "/study",         label: "Study Mode",  icon: "📰" },
];

export default function TopNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const { walletBalance, lastSessionEarnings, coinAnimTrigger } = useApp();

  // Track previous trigger to detect new completions
  const prevTrigger = useRef(0);
  const [showCoinBurst, setShowCoinBurst] = useState(false);
  const [displayEarned, setDisplayEarned] = useState(0);
  const [animateBalance, setAnimateBalance] = useState(false);

  useEffect(() => {
    if (coinAnimTrigger > 0 && coinAnimTrigger !== prevTrigger.current) {
      prevTrigger.current = coinAnimTrigger;
      setDisplayEarned(lastSessionEarnings);
      setShowCoinBurst(true);
      setAnimateBalance(true);
      const t1 = setTimeout(() => setShowCoinBurst(false), 2800);
      const t2 = setTimeout(() => setAnimateBalance(false), 700);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [coinAnimTrigger, lastSessionEarnings]);

  return (
    <nav className="topnav">
      <div className="topnav-brand" onClick={() => navigate("/scan")}>
        <div className="topnav-logo">♻</div>
        <div>
          <div className="topnav-name">ECO<span>SORT</span></div>
          <div className="topnav-wordmark">AI · v2.0</div>
        </div>
      </div>

      <div className="topnav-tabs">
        {NAV_ITEMS.map(item => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              className={`topnav-tab ${isActive ? "active" : ""}`}
              onClick={() => navigate(item.path)}
            >
              <span className="topnav-tab-icon">{item.icon}</span>
              <span>{item.label}</span>
              {isActive && <span className="topnav-tab-indicator" />}
            </button>
          );
        })}
      </div>

      <div className="topnav-right">
        {/* ── Wallet / Coin balance ── */}
        <div className={`topnav-wallet ${animateBalance ? "wallet-pop" : ""}`}>
          <span className="wallet-coin-icon">🪙</span>
          <span className="wallet-label">
            ₹{(walletBalance || 0).toFixed(2)}
          </span>
          {showCoinBurst && (
            <span className="wallet-earned-flash">+₹{displayEarned.toFixed(2)}</span>
          )}
          {showCoinBurst && (
            <div className="coin-burst" aria-hidden="true">
              {[...Array(8)].map((_, i) => (
                <span key={i} className={`coin-particle cp-${i}`}>🪙</span>
              ))}
            </div>
          )}
        </div>

        <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme">
          {isDark ? "☀️" : "🌙"}
        </button>
        <button className="topnav-scan-btn" onClick={() => navigate("/scan")}>
          🔍 New Scan
        </button>
      </div>
    </nav>
  );
}
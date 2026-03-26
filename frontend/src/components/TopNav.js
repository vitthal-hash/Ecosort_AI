import { useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
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
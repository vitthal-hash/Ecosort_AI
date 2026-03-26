import { useApp } from "../context/AppContext";
import { useNavigate } from "react-router-dom";
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid,
} from "recharts";
import "./StatisticsScreen.css";

const BIN_COLORS = {
  "Dry Waste":        "#3b82f6",
  "Wet / Bio Waste":  "#22c55e",
  "Biomedical Waste": "#ef4444",
  "Unknown":          "#64748b",
};

const TT = { background:"#0d1117", border:"1px solid #1f2937", borderRadius:8, color:"#e2e8f0" };

export default function StatisticsScreen() {
  const { allTimeStats, currentSession, clearAllTimeStats } = useApp();
  const navigate = useNavigate();

  const total     = allTimeStats.totalItems     || 0;
  const energy    = allTimeStats.energySavedKWh || 0;
  const co2       = allTimeStats.co2SavedKg     || 0;
  const binCounts = allTimeStats.binCounts      || {};
  const sessions  = allTimeStats.sessions       || [];

  const pieData = Object.entries(binCounts).map(([bin, count]) => ({
    name: bin, value: count, color: BIN_COLORS[bin] || "#64748b",
  }));

  const sessionBar = sessions.slice(-10).map((s, i) => ({
    name: "S" + (sessions.length - Math.min(10, sessions.length) + i + 1),
    items: s.totalItems || (s.items ? s.items.length : 0),
  }));

  let cum = 0;
  const cumulativeLine = sessions.map((s, i) => {
    cum += s.totalItems || (s.items ? s.items.length : 0);
    return { session: i + 1, total: cum };
  });

  const classBreakdown = {};
  sessions.forEach(function(s) {
    if (s.classCounts) {
      Object.entries(s.classCounts).forEach(function(entry) {
        var c = entry[0]; var n = entry[1];
        classBreakdown[c] = (classBreakdown[c] || 0) + n;
      });
    } else {
      (s.items || []).forEach(function(item) {
        var c = item.class || "unknown";
        classBreakdown[c] = (classBreakdown[c] || 0) + 1;
      });
    }
  });
  const classBar = Object.entries(classBreakdown)
    .sort(function(a,b){ return b[1]-a[1]; })
    .map(function(e){ return { cls: e[0], count: e[1] }; });

  const ACHIEVEMENTS = [
    { icon:"🌱", label:"First Sort",   unlocked: total >= 1   },
    { icon:"♻️", label:"10 Items",     unlocked: total >= 10  },
    { icon:"⚡", label:"Energy Saver", unlocked: energy >= 1  },
    { icon:"🌍", label:"CO₂ Fighter",  unlocked: co2 >= 5     },
    { icon:"🔥", label:"50 Items",     unlocked: total >= 50  },
    { icon:"🏆", label:"EcoChampion",  unlocked: total >= 100 },
  ];

  return (
    <div className="stats-root">

      <div className="stats-header">
        <button className="stats-back" onClick={function(){ navigate(-1); }}>← Back</button>
        <h1>My EcoStats</h1>
        <button className="stats-study" onClick={function(){ navigate("/study"); }}>📰 Study</button>
      </div>

      {currentSession && (
        <div className="current-session-banner">
          <div className="csb-label">
            🟢 This session &middot; {currentSession.date} {currentSession.time || ""}
          </div>
          <div className="csb-row">
            <div className="csb-stat">
              <span className="csb-num">{currentSession.totalItems}</span>
              <span className="csb-sub">items sorted</span>
            </div>
            <div className="csb-divider" />
            <div className="csb-stat">
              <span className="csb-num">{currentSession.energySavedKWh}</span>
              <span className="csb-sub">kWh saved</span>
            </div>
            <div className="csb-divider" />
            <div className="csb-stat">
              <span className="csb-num">{currentSession.co2SavedKg}</span>
              <span className="csb-sub">kg CO2 prevented</span>
            </div>
            <div className="csb-divider" />
            <div className="csb-classes">
              {Object.entries(currentSession.classCounts || {}).map(function(entry) {
                var cls = entry[0]; var n = entry[1];
                return (
                  <span key={cls} className="csb-chip">
                    <strong>{n}</strong> {cls}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {total === 0 ? (
        <div className="stats-empty">
          <div className="stats-empty-icon">📊</div>
          <h2>No data yet</h2>
          <p>Complete a scan and sorting session to see your impact!</p>
          <button onClick={function(){ navigate("/"); }}>Start Scanning →</button>
        </div>
      ) : (
        <div>

          <div className="stats-section-label">All-time totals</div>

          <div className="kpi-grid">
            <div className="kpi-card kpi-items">
              <div className="kpi-number">{total}</div>
              <div className="kpi-label">Items Sorted</div>
              <div className="kpi-icon">♻️</div>
            </div>
            <div className="kpi-card kpi-energy">
              <div className="kpi-number">{energy.toFixed(1)}</div>
              <div className="kpi-label">kWh Energy Saved</div>
              <div className="kpi-icon">⚡</div>
            </div>
            <div className="kpi-card kpi-co2">
              <div className="kpi-number">{co2.toFixed(1)}</div>
              <div className="kpi-label">kg CO2 Prevented</div>
              <div className="kpi-icon">🌍</div>
            </div>
            <div className="kpi-card kpi-sessions">
              <div className="kpi-number">{sessions.length}</div>
              <div className="kpi-label">Sessions</div>
              <div className="kpi-icon">🗓️</div>
            </div>
          </div>

          <div className="equivalents-strip">
            <div className="eq-item">🚗 <span>= {(co2 / 0.21).toFixed(1)} km not driven</span></div>
            <div className="eq-item">💡 <span>= {(energy / 0.06).toFixed(0)} hours of LED lighting</span></div>
            <div className="eq-item">🌳 <span>= {(co2 / 21).toFixed(3)} trees planted equivalent</span></div>
          </div>

          <div className="charts-grid">

            {pieData.length > 0 && (
              <div className="chart-card">
                <div className="chart-title">Bin Distribution</div>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      cx="50%"
                      cy="50%"
                      outerRadius={75}
                      label={function(p){ return p.name.split(" ")[0] + ": " + p.value; }}
                      labelLine={false}
                    >
                      {pieData.map(function(entry, i) {
                        return <Cell key={i} fill={entry.color} />;
                      })}
                    </Pie>
                    <Tooltip contentStyle={TT} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="chart-legend">
                  {pieData.map(function(d) {
                    return (
                      <div key={d.name} className="legend-item">
                        <span className="legend-dot" style={{ background: d.color }} />
                        <span>{d.name}: <strong>{d.value}</strong></span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {sessionBar.length > 1 && (
              <div className="chart-card">
                <div className="chart-title">Items per Session</div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={sessionBar}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={TT} />
                    <Bar dataKey="items" fill="#00ffc8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {cumulativeLine.length > 1 && (
              <div className="chart-card">
                <div className="chart-title">Cumulative Progress</div>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={cumulativeLine}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis dataKey="session" stroke="#64748b" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={TT} />
                    <Line type="monotone" dataKey="total" stroke="#00ffc8" strokeWidth={2} dot={{ fill:"#00ffc8", r:4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {classBar.length > 0 && (
              <div className="chart-card">
                <div className="chart-title">Items by Waste Class</div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={classBar} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis type="number" stroke="#64748b" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="cls" stroke="#64748b" tick={{ fontSize: 11 }} width={90} />
                    <Tooltip contentStyle={TT} />
                    <Bar dataKey="count" fill="#a78bfa" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

          </div>

          {sessions.length > 0 && (
            <div className="chart-card">
              <div className="chart-title">Session History</div>
              <div className="session-history">
                {sessions.slice().reverse().slice(0, 8).map(function(s, i) {
                  return (
                    <div key={i} className="session-row">
                      <div className="session-row-date">{s.date} {s.time || ""}</div>
                      <div className="session-row-items">
                        {Object.entries(s.classCounts || {}).map(function(entry) {
                          var cls = entry[0]; var n = entry[1];
                          return (
                            <span key={cls} className="session-row-chip">{n} {cls}</span>
                          );
                        })}
                      </div>
                      <div className="session-row-stat">⚡ {s.energySavedKWh} kWh</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="achievements">
            <div className="chart-title">Achievements</div>
            <div className="achievement-row">
              {ACHIEVEMENTS.map(function(a) {
                return (
                  <div key={a.label} className={"achievement " + (a.unlocked ? "unlocked" : "locked")}>
                    <div className="ach-icon">{a.icon}</div>
                    <div className="ach-label">{a.label}</div>
                    {!a.unlocked && <div className="ach-lock">🔒</div>}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="stats-reset-row">
            <button
              className="stats-reset-btn"
              onClick={function() {
                if (window.confirm("Clear all-time statistics? This cannot be undone.")) {
                  clearAllTimeStats();
                }
              }}
            >
              🗑 Reset All-Time Stats
            </button>
          </div>

        </div>
      )}

    </div>
  );
}
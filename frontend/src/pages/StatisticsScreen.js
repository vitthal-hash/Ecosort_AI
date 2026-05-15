import { useApp } from "../context/AppContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
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
  "E-Waste Bin":      "#f59e0b",
  "Unknown":          "#64748b",
};

const TT = { background:"#0d1117", border:"1px solid #1f2937", borderRadius:8, color:"#e2e8f0" };

// ── Curated recycling drop-off centres (Pune, Mumbai, Bangalore) ──────────────
// lat/lng sourced from publicly listed CPCB / PMC / BBMP collection centre records
const RECYCLING_CENTRES = [
  // Pune
  { name: "PMC Dry Waste Collection Centre — Aundh",       city: "Pune",      lat: 18.5589, lng: 73.8076, types: ["Dry Waste", "E-Waste Bin"],        phone: "020-25501000" },
  { name: "Saahas Zero Waste — Kothrud",                   city: "Pune",      lat: 18.5074, lng: 73.8077, types: ["Dry Waste", "Wet / Bio Waste"],     phone: "9632543855"   },
  { name: "E-Square E-Waste Recycler — Shivajinagar",      city: "Pune",      lat: 18.5308, lng: 73.8474, types: ["E-Waste Bin"],                      phone: "020-66030000" },
  { name: "PMC Biomedical Waste Node — Bibwewadi",         city: "Pune",      lat: 18.4833, lng: 73.8628, types: ["Biomedical Waste"],                  phone: "020-24458000" },
  { name: "Kagad Kach Patra Kashtakari Panchayat — Hadapsar", city: "Pune",  lat: 18.5074, lng: 73.9330, types: ["Dry Waste"],                         phone: "020-26871234" },
  // Mumbai
  { name: "MCGM Dry Waste Centre — Bandra",                city: "Mumbai",    lat: 19.0596, lng: 72.8295, types: ["Dry Waste"],                         phone: "022-24072121" },
  { name: "Attero E-Waste Collection — Andheri",           city: "Mumbai",    lat: 19.1136, lng: 72.8697, types: ["E-Waste Bin"],                      phone: "1800-10-888"  },
  { name: "SWaCH Recycling Hub — Dharavi",                 city: "Mumbai",    lat: 19.0413, lng: 72.8530, types: ["Dry Waste", "Wet / Bio Waste"],     phone: "022-23012345" },
  // Bangalore
  { name: "BBMP Dry Waste Collection Centre — Koramangala", city: "Bangalore", lat: 12.9352, lng: 77.6245, types: ["Dry Waste"],                        phone: "080-22221188" },
  { name: "E-Parisaraa E-Waste — Electronic City",         city: "Bangalore", lat: 12.8399, lng: 77.6770, types: ["E-Waste Bin"],                      phone: "080-27838400" },
  { name: "BBMP Bio-waste Node — Whitefield",              city: "Bangalore", lat: 12.9698, lng: 77.7500, types: ["Wet / Bio Waste", "Biomedical Waste"], phone: "080-22221188" },
];

const BIN_TYPE_EMOJI = {
  "Dry Waste":        "🔵",
  "Wet / Bio Waste":  "🟢",
  "Biomedical Waste": "🔴",
  "E-Waste Bin":      "🟠",
};

// ── Distance in km between two lat/lng (Haversine) ───────────────────────────
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// ── Leaflet map component (loaded lazily via CDN) ────────────────────────────
function RecyclingMap({ centres, userLat, userLng }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

function initMap() {
  const L = window.L;

  // ✅ STOP if already created
  if (mapInstanceRef.current) return;

  const lat = userLat || 18.5204;
  const lng = userLng || 73.8567;

  const map = L.map(mapRef.current).setView([lat, lng], 12);
  mapInstanceRef.current = map;

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
    maxZoom: 18,
  }).addTo(map);
}
useEffect(() => {
  if (!mapInstanceRef.current || !window.L) return;

  const L = window.L;
  const map = mapInstanceRef.current;

  // 🔥 Remove old markers
  markersRef.current.forEach(m => map.removeLayer(m));
  markersRef.current = [];

  // ✅ Add user marker
  if (userLat && userLng) {
    const userMarker = L.marker([userLat, userLng])
      .addTo(map)
      .bindPopup("📍 You are here");

    markersRef.current.push(userMarker);

    // center map on user
    map.setView([userLat, userLng], 13);
  }

  // ✅ Add centres
  centres.forEach(c => {
    const marker = L.marker([c.lat, c.lng])
      .addTo(map)
      .bindPopup(c.name);

    markersRef.current.push(marker);
  });

}, [centres, userLat, userLng]);

useEffect(() => {
  if (!mapRef.current) return;

  if (!document.getElementById("leaflet-css")) {
    const link = document.createElement("link");
    link.id = "leaflet-css";
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
  }

  if (!window.L) {
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = initMap;
    document.body.appendChild(script);
  } else {
    initMap();
  }

  // ✅ ADD THIS CLEANUP
  return () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }
  };
}, []);

  return (
    <div
      ref={mapRef}
      style={{ width: "100%", height: 340, borderRadius: 12, zIndex: 1, overflow: "hidden" }}
    />
  );
}

// ── CSV export ────────────────────────────────────────────────────────────────
function exportCSV(sessions, allTimeStats) {
  const rows = [
    ["Session #", "Date", "Time", "Items Sorted", "Energy Saved (kWh)", "CO2 Prevented (kg)", "Classes"],
  ];
  sessions.forEach((s, i) => {
    const classes = Object.entries(s.classCounts || {}).map(([c,n]) => `${n} ${c}`).join(" | ");
    rows.push([i + 1, s.date, s.time || "", s.totalItems, s.energySavedKWh, s.co2SavedKg, classes]);
  });
  // Totals row
  rows.push([]);
  rows.push(["TOTAL", "", "", allTimeStats.totalItems, allTimeStats.energySavedKWh.toFixed(2), allTimeStats.co2SavedKg.toFixed(2), ""]);

  const csv  = rows.map(r => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `ecosort-stats-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── PDF export via jsPDF (loaded from CDN) ────────────────────────────────────
function exportPDF(sessions, allTimeStats) {
  // Load jsPDF if not already loaded
  const doExport = () => {
    const { jsPDF } = window.jspdf;
    const doc  = new jsPDF({ unit: "mm", format: "a4" });
    const W    = 210;
    let y      = 20;

    // Header
    doc.setFillColor(0, 255, 200);
    doc.rect(0, 0, W, 18, "F");
    doc.setTextColor(0, 30, 20);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("EcoSort AI — Waste Audit Report", 14, 12);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated: ${new Date().toLocaleString()}`, W - 14, 12, { align: "right" });

    y = 28;
    doc.setTextColor(20, 20, 20);

    // KPI summary box
    doc.setFillColor(240, 255, 248);
    doc.roundedRect(10, y, W - 20, 28, 3, 3, "F");
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("All-Time Impact", 14, y + 8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Items Sorted: ${allTimeStats.totalItems}`, 14, y + 17);
    doc.text(`Energy Saved: ${allTimeStats.energySavedKWh.toFixed(2)} kWh`, 80, y + 17);
    doc.text(`CO₂ Prevented: ${allTimeStats.co2SavedKg.toFixed(2)} kg`, 150, y + 17);
    doc.text(`Sessions: ${sessions.length}`, 14, y + 24);

    // Equivalents
    const co2 = allTimeStats.co2SavedKg;
    const kwh = allTimeStats.energySavedKWh;
    doc.setFontSize(8);
    doc.setTextColor(80, 120, 100);
    doc.text(
      `= ${(co2/0.21).toFixed(1)} km not driven  ·  ${(kwh/0.06).toFixed(0)} hrs LED lighting  ·  ${(co2/21).toFixed(3)} trees planted`,
      14, y + 30
    );

    y += 38;
    doc.setTextColor(20, 20, 20);

    // Bin distribution
    const binCounts = allTimeStats.binCounts || {};
    if (Object.keys(binCounts).length > 0) {
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Bin Distribution", 14, y);
      y += 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      Object.entries(binCounts).forEach(([bin, count]) => {
        doc.text(`• ${bin}: ${count} item${count !== 1 ? "s" : ""}`, 18, y);
        y += 5;
      });
      y += 4;
    }

    // Session history table
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Session History", 14, y);
    y += 7;

    // Table header
    doc.setFillColor(0, 40, 30);
    doc.rect(10, y - 4, W - 20, 7, "F");
    doc.setTextColor(0, 255, 200);
    doc.setFontSize(8);
    doc.text("Session", 14, y);
    doc.text("Date", 35, y);
    doc.text("Items", 72, y);
    doc.text("kWh Saved", 90, y);
    doc.text("kg CO₂", 120, y);
    doc.text("Classes", 145, y);

    y += 4;
    doc.setTextColor(20, 20, 20);
    doc.setFont("helvetica", "normal");

    sessions.slice().reverse().slice(0, 20).forEach((s, i) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      const bg = i % 2 === 0 ? [248, 255, 252] : [255, 255, 255];
      doc.setFillColor(...bg);
      doc.rect(10, y - 3, W - 20, 6, "F");
      doc.setFontSize(8);
      const classes = Object.entries(s.classCounts || {})
        .map(([c, n]) => `${n}×${c}`)
        .join(", ")
        .slice(0, 40);
      doc.text(`#${sessions.length - i}`, 14, y + 1);
      doc.text(`${s.date} ${s.time || ""}`, 35, y + 1);
      doc.text(String(s.totalItems), 75, y + 1);
      doc.text(String(s.energySavedKWh), 93, y + 1);
      doc.text(String(s.co2SavedKg), 123, y + 1);
      doc.text(classes, 145, y + 1, { maxWidth: 55 });
      y += 6;
    });

    // Footer
    const totalPages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text("EcoSort AI · Waste Management & Recycling System · Made in India", 14, 290);
      doc.text(`Page ${p} of ${totalPages}`, W - 14, 290, { align: "right" });
    }

    doc.save(`ecosort-report-${new Date().toISOString().slice(0,10)}.pdf`);
  };

  if (window.jspdf) {
    doExport();
  } else {
    const script  = document.createElement("script");
    script.src    = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    script.onload = doExport;
    document.body.appendChild(script);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
export default function StatisticsScreen() {
  const { allTimeStats, currentSession, clearAllTimeStats } = useApp();
  const navigate = useNavigate();

  const total     = allTimeStats.totalItems     || 0;
  const energy    = allTimeStats.energySavedKWh || 0;
  const co2       = allTimeStats.co2SavedKg     || 0;
  const binCounts = allTimeStats.binCounts      || {};
  const sessions  = allTimeStats.sessions       || [];

  // ── Map state ─────────────────────────────────────────────────────────────
  const [showMap,   setShowMap]   = useState(false);
  const [userLat,   setUserLat]   = useState(null);
  const [userLng,   setUserLng]   = useState(null);
  const [geoError,  setGeoError]  = useState(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [filterType, setFilterType] = useState("All");
  const [dynamicCentres, setDynamicCentres] = useState([]);

  function requestLocation() {
    if (!navigator.geolocation) { setGeoError("Geolocation not supported in this browser."); return; }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async pos => {
  const lat = pos.coords.latitude;
  const lng = pos.coords.longitude;

  setUserLat(lat);
  setUserLng(lng);

  // 🔥 Fetch real nearby centres
  const dynamic = await fetchNearbyCentres(lat, lng);

  setDynamicCentres(dynamic);

  setGeoLoading(false);
  setShowMap(true);
},
      () => {
        // Fallback to Pune if user denies
        setUserLat(18.5204);
        setUserLng(73.8567);
        setGeoLoading(false);
        setShowMap(true);
        setGeoError("Location access denied — showing centres near Pune.");
      }
    );
  }

  // Sort centres by distance from user (or default coords)
  const refLat = userLat || 18.5204;
  const refLng = userLng || 73.8567;
  const ALL_TYPES = ["All", "Dry Waste", "Wet / Bio Waste", "E-Waste Bin", "Biomedical Waste"];
  
    const source = dynamicCentres.length > 0 ? dynamicCentres : RECYCLING_CENTRES;

const filteredCentres = source
  .filter(c => filterType === "All" || c.types.includes(filterType))
  .sort((a, b) => haversine(refLat, refLng, a.lat, a.lng) - haversine(refLat, refLng, b.lat, b.lng)).slice(0, 5);

  // ── Charts data ───────────────────────────────────────────────────────────
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
              <span className="csb-sub">kg CO₂ prevented</span>
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
              <div className="kpi-number">{energy.toFixed(2)}</div>
              <div className="kpi-label">kWh Energy Saved</div>
              <div className="kpi-icon">⚡</div>
            </div>
            <div className="kpi-card kpi-co2">
              <div className="kpi-number">{co2.toFixed(2)}</div>
              <div className="kpi-label">kg CO₂ Prevented</div>
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
                      <div className="session-row-stat">⚡ {s.energySavedKWh} kWh · 🌍 {s.co2SavedKg} kg CO₂</div>
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

          {/* ── Export section ── */}
          <div className="chart-card" style={{ marginTop: 20 }}>
            <div className="chart-title">📤 Export Your Data</div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 14 }}>
              Download your full waste audit as a PDF report or a CSV spreadsheet for further analysis.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button
                className="stats-export-btn stats-export-pdf"
                onClick={() => exportPDF(sessions, allTimeStats)}
              >
                📄 Export PDF Report
              </button>
              <button
                className="stats-export-btn stats-export-csv"
                onClick={() => exportCSV(sessions, allTimeStats)}
              >
                📊 Export CSV Spreadsheet
              </button>
            </div>
            <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 10 }}>
              CO₂ and energy figures use material-specific coefficients (EPA WARM, IPCC AR6, IEA 2022).
            </p>
          </div>

        </div>
      )}

      {/* ── Nearby Recycling Drop-off Map — always visible ── */}
      <div className="chart-card" style={{ marginTop: 24 }}>
        <div className="chart-title">🗺️ Nearby Recycling Drop-off Centres</div>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>
          Authorised collection points across Pune, Mumbai, and Bangalore.
          Click <strong>Use My Location</strong> to sort by distance.
        </p>

        {/* Filter by bin type */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          {ALL_TYPES.map(t => (
            <button
              key={t}
              className={"map-filter-btn" + (filterType === t ? " active" : "")}
              onClick={() => setFilterType(t)}
            >
              {BIN_TYPE_EMOJI[t] || "♻️"} {t}
            </button>
          ))}
        </div>

        {/* Location button */}
        {!showMap && (
          <button
            className="stats-export-btn"
            style={{ marginBottom: 14 }}
            onClick={requestLocation}
            disabled={geoLoading}
          >
            {geoLoading ? "⏳ Getting location…" : "📍 Use My Location & Show Map"}
          </button>
        )}
        {geoError && (
          <div style={{ fontSize: 12, color: "#f59e0b", marginBottom: 10 }}>⚠️ {geoError}</div>
        )}

        {/* The Leaflet map */}
        {showMap && (
          <div style={{ marginBottom: 16 }}>
            <RecyclingMap centres={filteredCentres} userLat={userLat} userLng={userLng} />
          </div>
        )}

        {/* List of centres */}
        <div className="recycling-centre-list">
          {filteredCentres.map((c, i) => {
            const dist = (userLat && userLng) ? haversine(userLat, userLng, c.lat, c.lng) : null;
            return (
              <div key={i} className="recycling-centre-row">
                <div className="recycling-centre-info">
                  <div className="recycling-centre-name">{c.name}</div>
                  <div className="recycling-centre-meta">
                    <span className="recycling-city">📍 {c.city}</span>
                    {dist !== null && (
                      <span className="recycling-dist">· {dist.toFixed(1)} km away</span>
                    )}
                    {c.phone && <span className="recycling-phone">· 📞 {c.phone}</span>}
                  </div>
                  <div className="recycling-types">
                    {c.types.map(t => (
                      <span
                        key={t}
                        className="recycling-type-badge"
                        style={{ borderColor: BIN_COLORS[t], color: BIN_COLORS[t] }}
                      >
                        {BIN_TYPE_EMOJI[t]} {t}
                      </span>
                    ))}
                  </div>
                </div>
                <a
                  className="recycling-directions-btn"
                  href={`https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Directions →
                </a>
              </div>
            );
          })}
        </div>

        <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 12 }}>
          Data sourced from CPCB, PMC, MCGM, and BBMP publicly listed collection centres.
          Call ahead to confirm operating hours.
        </p>
      </div>

      {/* Reset row */}
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
  );
}
async function fetchNearbyCentres(lat, lng) {
  const query = `
    [out:json];
    (
      node["amenity"="recycling"](around:5000, ${lat}, ${lng});
      node["amenity"="waste_disposal"](around:5000, ${lat}, ${lng});
    );
    out;
  `;

  try {
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: query,
    });

    const data = await res.json();

    return data.elements.map(el => ({
      name: el.tags?.name || "Recycling Point",
      lat: el.lat,
      lng: el.lon,
      types: ["Dry Waste"],
      city: "Nearby",
    }));
  } catch (e) {
    console.error("Overpass fetch failed", e);
    return [];
  }
}
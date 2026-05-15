import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { computeImpact } from "../data/wasteData";

const AppContext = createContext(null);

const API = "http://localhost:5000/api";

function readSession(key, fallback) {
  try { return JSON.parse(sessionStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}
function writeSession(key, value) {
  try { sessionStorage.setItem(key, JSON.stringify(value)); } catch {}
}

const EMPTY_STATS = { sessions: [], totalItems: 0, energySavedKWh: 0, co2SavedKg: 0, binCounts: {} };

// userId: the logged-in user's id string (or null if logged out).
// This is passed in from App.js so AppContext always knows who is active.
export function AppProvider({ children, userId }) {

  // ── Current cycle (sessionStorage) ─────────────────────────
  const [scanResults,    setScanResultsState]    = useState(() => readSession("es_scanResults", {}));
  const [confirmedItems, setConfirmedItemsState] = useState(() => readSession("es_confirmedItems", []));
  const [currentSession, setCurrentSessionState] = useState(() => readSession("es_currentSession", null));
  const [processingDone, setProcessingDoneState] = useState(() => readSession("es_processingDone", false));
  const [sortingDone,    setSortingDoneState]    = useState(() => readSession("es_sortingDone", false));

  // ── All-time stats (per user, from backend) ─────────────────
  const [allTimeStats, setAllTimeStatsState] = useState(EMPTY_STATS);

  // 🔥 Reload stats from backend whenever the logged-in user changes
  useEffect(() => {
    if (!userId) {
      // User logged out — clear stats from memory
      setAllTimeStatsState(EMPTY_STATS);
      return;
    }

    async function loadStats() {
      try {
        const res  = await fetch(`${API}/stats/${userId}`);
        const data = await res.json();
        if (data) setAllTimeStatsState(data);
      } catch (e) {
        console.error("Failed to load stats", e);
      }
    }
    loadStats();
  }, [userId]);   // ← re-runs every time userId changes (login / logout)

  // ── Setters ───────────────────────────────────────────────

  const setScanResults = useCallback((data) => {
    setScanResultsState(data);
    setConfirmedItemsState([]);
    setCurrentSessionState(null);
    setProcessingDoneState(false);
    setSortingDoneState(false);

    writeSession("es_scanResults",    data);
    writeSession("es_confirmedItems", []);
    writeSession("es_currentSession", null);
    writeSession("es_processingDone", false);
    writeSession("es_sortingDone",    false);
  }, []);

  const setConfirmedItems = useCallback((items) => {
    setConfirmedItemsState(items);
    writeSession("es_confirmedItems", items);
    setProcessingDoneState(true);
    writeSession("es_processingDone", true);
  }, []);

  // ── FINALISE SESSION ───────────────────────────────────────
  const finaliseSession = useCallback(async (itemsWithBin) => {

    const date = new Date().toISOString().slice(0, 10);
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const binCounts   = {};
    const classCounts = {};

    itemsWithBin.forEach(item => {
      const b = item.bin   || "Unknown";
      const c = item.class || "unknown";
      binCounts[b]   = (binCounts[b]   || 0) + 1;
      classCounts[c] = (classCounts[c] || 0) + 1;
    });

    const { co2SavedKg, energySavedKWh } = computeImpact(itemsWithBin);

    const session = {
      date,
      time,
      items: itemsWithBin,
      classCounts,
      binCounts,
      totalItems: itemsWithBin.length,
      energySavedKWh,
      co2SavedKg,
    };

    setCurrentSessionState(session);
    setSortingDoneState(true);
    writeSession("es_currentSession", session);
    writeSession("es_sortingDone", true);

    // Build updated all-time stats
    const next = {
      sessions:       [...(allTimeStats.sessions || []), session],
      totalItems:     (allTimeStats.totalItems     || 0) + session.totalItems,
      energySavedKWh: parseFloat(((allTimeStats.energySavedKWh || 0) + energySavedKWh).toFixed(2)),
      co2SavedKg:     parseFloat(((allTimeStats.co2SavedKg     || 0) + co2SavedKg).toFixed(2)),
      binCounts:      { ...allTimeStats.binCounts },
    };

    Object.entries(binCounts).forEach(([bin, cnt]) => {
      next.binCounts[bin] = (next.binCounts[bin] || 0) + cnt;
    });

    setAllTimeStatsState(next);

    // 🔥 SAVE TO BACKEND under this user's id
    if (userId) {
      try {
        await fetch(`${API}/save/${userId}`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(next),
        });
      } catch (e) {
        console.error("Failed to save stats", e);
      }
    }

  }, [allTimeStats, userId]);

  const resetCycle = useCallback(() => {
    setScanResultsState({});
    setConfirmedItemsState([]);
    setCurrentSessionState(null);
    setProcessingDoneState(false);
    setSortingDoneState(false);

    writeSession("es_scanResults",    {});
    writeSession("es_confirmedItems", []);
    writeSession("es_currentSession", null);
    writeSession("es_processingDone", false);
    writeSession("es_sortingDone",    false);
  }, []);

  const clearAllTimeStats = useCallback(async () => {
    setAllTimeStatsState(EMPTY_STATS);

    if (userId) {
      try {
        await fetch(`${API}/clear/${userId}`, { method: "POST" });
      } catch (e) {
        console.error("Failed to clear stats", e);
      }
    }
  }, [userId]);

  return (
    <AppContext.Provider value={{
      scanResults,    setScanResults,
      confirmedItems, setConfirmedItems,
      currentSession, finaliseSession,
      processingDone,
      sortingDone,
      resetCycle,
      allTimeStats,   clearAllTimeStats,
      addToStats: finaliseSession,
      stats: allTimeStats,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
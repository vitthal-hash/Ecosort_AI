import { createContext, useContext, useState, useCallback } from "react";

/**
 * STORAGE STRATEGY
 * sessionStorage → current cycle data — survives refresh, clears on tab close
 * localStorage   → all-time cumulative stats — permanent
 */

function readSession(key, fallback) {
  try { return JSON.parse(sessionStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}
function writeSession(key, value) {
  try { sessionStorage.setItem(key, JSON.stringify(value)); } catch {}
}
function readLocal(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}
function writeLocal(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

const AppContext = createContext(null);

export function AppProvider({ children }) {

  // ── Current cycle (sessionStorage) ───────────────────────────────────────
  const [scanResults,        setScanResultsState]        = useState(() => readSession("es_scanResults", {}));
  const [confirmedItems,     setConfirmedItemsState]     = useState(() => readSession("es_confirmedItems", []));
  const [currentSession,     setCurrentSessionState]     = useState(() => readSession("es_currentSession", null));
  // processingDone: true once user clicks "Proceed to Bin Sorting" — blocks re-entry to processing
  const [processingDone,     setProcessingDoneState]     = useState(() => readSession("es_processingDone", false));
  // sortingDone: true once BinAnimation finishes — blocks re-entry to bin sort
  const [sortingDone,        setSortingDoneState]        = useState(() => readSession("es_sortingDone", false));

  // ── All-time stats (localStorage) ────────────────────────────────────────
  const [allTimeStats, setAllTimeStatsState] = useState(() =>
    readLocal("es_allTimeStats", {
      sessions: [], totalItems: 0, energySavedKWh: 0, co2SavedKg: 0, binCounts: {},
    })
  );

  // ── Setters ───────────────────────────────────────────────────────────────
  const setScanResults = useCallback((data) => {
    // New scan cycle — reset ALL cycle flags
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
    // Mark processing as done when user confirms items
    setProcessingDoneState(true);
    writeSession("es_processingDone", true);
  }, []);

  // Called once when BinAnimation completes
  const finaliseSession = useCallback((itemsWithBin) => {
    const date = new Date().toISOString().slice(0, 10);
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const binCounts = {};
    const classCounts = {};
    itemsWithBin.forEach(item => {
      const b = item.bin || "Unknown";
      const c = item.class || "unknown";
      binCounts[b]   = (binCounts[b]   || 0) + 1;
      classCounts[c] = (classCounts[c] || 0) + 1;
    });

    const energySavedKWh = parseFloat((itemsWithBin.length * 0.3).toFixed(2));
    const co2SavedKg     = parseFloat((itemsWithBin.length * 0.5).toFixed(2));

    const session = {
      date, time, items: itemsWithBin, classCounts, binCounts,
      totalItems: itemsWithBin.length, energySavedKWh, co2SavedKg,
    };

    setCurrentSessionState(session);
    setSortingDoneState(true);
    writeSession("es_currentSession", session);
    writeSession("es_sortingDone",    true);

    setAllTimeStatsState(prev => {
      const next = {
        sessions:      [...(prev.sessions || []), session],
        totalItems:    (prev.totalItems    || 0) + session.totalItems,
        energySavedKWh: parseFloat(((prev.energySavedKWh || 0) + energySavedKWh).toFixed(2)),
        co2SavedKg:    parseFloat(((prev.co2SavedKg    || 0) + co2SavedKg).toFixed(2)),
        binCounts:     { ...prev.binCounts },
      };
      Object.entries(binCounts).forEach(([bin, cnt]) => {
        next.binCounts[bin] = (next.binCounts[bin] || 0) + cnt;
      });
      writeLocal("es_allTimeStats", next);
      return next;
    });
  }, []);

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

  const clearAllTimeStats = useCallback(() => {
    const empty = { sessions: [], totalItems: 0, energySavedKWh: 0, co2SavedKg: 0, binCounts: {} };
    setAllTimeStatsState(empty);
    writeLocal("es_allTimeStats", empty);
  }, []);

  return (
    <AppContext.Provider value={{
      scanResults,    setScanResults,
      confirmedItems, setConfirmedItems,
      currentSession, finaliseSession,
      processingDone,  // true once items selected — blocks re-entry to processing
      sortingDone,     // true once bins done — blocks re-entry to bin sort
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
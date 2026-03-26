import "./App.css";     /* ← loads base resets and theme variable fallbacks */

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider }    from "./context/AppContext";
import { ThemeProvider }  from "./context/ThemeContext";
import Layout             from "./components/Layout";
import Landing3D          from "./Landing3D";
import ScanMode           from "./pages/ScanMode";
import ProcessingScreen   from "./pages/ProcessingScreen";
import BinAnimationScreen from "./pages/BinAnimationScreen";
import EcoChatScreen      from "./pages/EcoChatScreen";
import StatisticsScreen   from "./pages/StatisticsScreen";
import StudyMode          from "./pages/StudyMode";

export default function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/"              element={<Landing3D />} />
            <Route path="/scan"          element={<ScanMode />} />
            <Route path="/processing"    element={<Layout><ProcessingScreen /></Layout>} />
            <Route path="/bin-animation" element={<Layout><BinAnimationScreen /></Layout>} />
            <Route path="/eco-chat"      element={<Layout><EcoChatScreen /></Layout>} />
            <Route path="/stats"         element={<Layout><StatisticsScreen /></Layout>} />
            <Route path="/study"         element={<Layout><StudyMode /></Layout>} />
            <Route path="*"              element={<Navigate to="/" />} />
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </ThemeProvider>
  );
}
import "./App.css";

import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation
} from "react-router-dom";

import { AnimatePresence } from "framer-motion";

import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { AppProvider }  from "./context/AppContext";

import ProtectedRoute from "./components/ProtectedRoute";
import Layout         from "./components/Layout";

import Landing3D          from "./Landing3D";
import AuthPage           from "./pages/AuthPage";
import ScanMode           from "./pages/ScanMode";
import ProcessingScreen   from "./pages/ProcessingScreen";
import BinAnimationScreen from "./pages/BinAnimationScreen";
import EcoChatScreen      from "./pages/EcoChatScreen";
import StatisticsScreen   from "./pages/StatisticsScreen";
import StudyMode          from "./pages/StudyMode";

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>

        {/* Public Routes */}
        <Route path="/"     element={<Landing3D />} />
        <Route path="/auth" element={<AuthPage />} />

        {/* Protected Routes */}
        <Route path="/scan" element={
          <ProtectedRoute><ScanMode /></ProtectedRoute>
        } />

        <Route path="/processing" element={
          <ProtectedRoute><Layout><ProcessingScreen /></Layout></ProtectedRoute>
        } />

        <Route path="/bin-animation" element={
          <ProtectedRoute><Layout><BinAnimationScreen /></Layout></ProtectedRoute>
        } />

        <Route path="/eco-chat" element={
          <ProtectedRoute><Layout><EcoChatScreen /></Layout></ProtectedRoute>
        } />

        <Route path="/stats" element={
          <ProtectedRoute><Layout><StatisticsScreen /></Layout></ProtectedRoute>
        } />

        <Route path="/study" element={
          <ProtectedRoute><Layout><StudyMode /></Layout></ProtectedRoute>
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" />} />

      </Routes>
    </AnimatePresence>
  );
}

// ── Inner wrapper: reads currentUser AFTER AuthProvider is mounted ────────────
// This lets us pass the userId down into AppProvider reactively.
function AppWithAuth() {
  const { currentUser } = useAuth();

  return (
    // Pass userId so AppContext knows whose stats to load/save.
    // When currentUser is null (logged out) userId is null and stats are cleared.
    <AppProvider userId={currentUser?.id ?? null}>
      <BrowserRouter>
        <AnimatedRoutes />
      </BrowserRouter>
    </AppProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppWithAuth />
      </AuthProvider>
    </ThemeProvider>
  );
}
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Wrap any route that requires login.
// Usage in App.js:  <Route path="/scan" element={<ProtectedRoute><ScanMode /></ProtectedRoute>} />
export default function ProtectedRoute({ children }) {
  const { currentUser } = useAuth();
  if (!currentUser) return <Navigate to="/auth" replace />;
  return children;
}
import { createContext, useContext, useState, useCallback } from "react";

const AuthContext = createContext(null);

const API = "http://localhost:5000/api";

function readSession(key, fallback) {
  try { return JSON.parse(sessionStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}
function writeSession(key, value) {
  try { sessionStorage.setItem(key, JSON.stringify(value)); } catch {}
}

export function AuthProvider({ children }) {
  // Persist login across page refreshes within the same browser tab
  const [currentUser, setCurrentUser] = useState(() => readSession("es_user", null));

  const signup = useCallback(async (email, password) => {
    const res  = await fetch(`${API}/auth/signup`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Signup failed.");
    // Auto-login after successful signup
    setCurrentUser(data.user);
    writeSession("es_user", data.user);
    return data.user;
  }, []);

  const login = useCallback(async (email, password) => {
    const res  = await fetch(`${API}/auth/login`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Login failed.");
    setCurrentUser(data.user);
    writeSession("es_user", data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    sessionStorage.removeItem("es_user");
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, signup }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
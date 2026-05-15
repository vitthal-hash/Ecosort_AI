import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import "./AuthPage.css";

export default function AuthPage() {
  const navigate          = useNavigate();
  const { login, signup } = useAuth();

  const [tab,      setTab]      = useState("login");   // "login" | "signup"
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");        // signup only
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState("");

  function switchTab(t) {
    setTab(t);
    setError("");
    setSuccess("");
    setEmail("");
    setPassword("");
    setConfirm("");
  }

  // ── Client-side validation ────────────────────────────────────────────────
  function validate() {
    if (!email.trim()) return "Email is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      return "Please enter a valid email address (e.g. you@example.com).";
    if (!password) return "Password is required.";
    if (tab === "signup") {
      if (password.length < 6) return "Password must be at least 6 characters.";
      if (password !== confirm)  return "Passwords do not match.";
    }
    return null;
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    try {
      if (tab === "signup") {
        await signup(email.trim(), password);
        setSuccess("Account created! Taking you to the scanner…");
        setTimeout(() => navigate("/scan"), 1200);
      } else {
        await login(email.trim(), password);
        navigate("/scan");
      }
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const emailHasError  = error && (error.toLowerCase().includes("email"));
  const passHasError   = error && (error.toLowerCase().includes("password") || error.toLowerCase().includes("incorrect"));
  const confirmHasError = error && error.toLowerCase().includes("match");

  return (
    <div className="auth-root">
      <motion.div
        className="auth-card"
        initial={{ opacity: 0, y: 32, scale: 0.97 }}
        animate={{ opacity: 1, y: 0,  scale: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Brand */}
        <div className="auth-brand">
          <div className="auth-brand-icon">♻</div>
          <div className="auth-brand-name">ECO<span>SORT</span> AI</div>
        </div>

        {/* Title */}
        <h1 className="auth-title">
          {tab === "login" ? "Welcome back" : "Create account"}
        </h1>
        <p className="auth-subtitle">
          {tab === "login"
            ? "Sign in to continue to EcoSort"
            : "Join EcoSort and start sorting smarter"}
        </p>

        {/* Tab switcher */}
        <div className="auth-tabs">
          <button
            className={`auth-tab ${tab === "login"  ? "active" : ""}`}
            onClick={() => switchTab("login")}
            type="button"
          >
            Sign In
          </button>
          <button
            className={`auth-tab ${tab === "signup" ? "active" : ""}`}
            onClick={() => switchTab("signup")}
            type="button"
          >
            Sign Up
          </button>
        </div>

        {/* Form */}
        <form className="auth-form" onSubmit={handleSubmit} noValidate>

          {/* Email */}
          <div className="auth-field">
            <label className="auth-label">Email address</label>
            <input
              className={`auth-input ${emailHasError ? "error" : ""}`}
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(""); }}
              autoComplete="email"
              disabled={loading}
            />
          </div>

          {/* Password */}
          <div className="auth-field">
            <label className="auth-label">Password</label>
            <input
              className={`auth-input ${passHasError ? "error" : ""}`}
              type="password"
              placeholder={tab === "signup" ? "Min 6 characters" : "Enter your password"}
              value={password}
              onChange={e => { setPassword(e.target.value); setError(""); }}
              autoComplete={tab === "signup" ? "new-password" : "current-password"}
              disabled={loading}
            />
            {tab === "signup" && (
              <span className="auth-hint">At least 6 characters</span>
            )}
          </div>

          {/* Confirm password — signup only */}
          {tab === "signup" && (
            <div className="auth-field">
              <label className="auth-label">Confirm Password</label>
              <input
                className={`auth-input ${confirmHasError ? "error" : ""}`}
                type="password"
                placeholder="Repeat your password"
                value={confirm}
                onChange={e => { setConfirm(e.target.value); setError(""); }}
                autoComplete="new-password"
                disabled={loading}
              />
            </div>
          )}

          {/* Error message */}
          {error && (
            <motion.div
              className="auth-error"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <span>⚠️</span> {error}
            </motion.div>
          )}

          {/* Success message */}
          {success && (
            <motion.div
              className="auth-success"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <span>✅</span> {success}
            </motion.div>
          )}

          {/* Submit */}
          <button className="auth-submit" type="submit" disabled={loading}>
            {loading && <span className="auth-spinner" />}
            {loading
              ? (tab === "login" ? "Signing in…" : "Creating account…")
              : (tab === "login" ? "Sign In →" : "Create Account →")}
          </button>
        </form>

        {/* Back to landing */}
        <div className="auth-back">
          <button className="auth-back-btn" onClick={() => navigate("/")} type="button">
            ← Back to landing
          </button>
        </div>
      </motion.div>
    </div>
  );
}
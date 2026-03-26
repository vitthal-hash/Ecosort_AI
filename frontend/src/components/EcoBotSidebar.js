import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";

import "./EcoBotSidebar.css";

// ── System prompt ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are EcoBot — the built-in AI assistant for the EcoSort AI waste management app (made in India). You live as a persistent sidebar helper throughout the app.

You know TWO things deeply:

1. THE ECOSORT APP — how it works, step by step:
   - HOME / SCAN PAGE (/): User points camera at waste objects. The AI model (YOLOv8 best.pt) detects and tracks objects in real time, showing bounding boxes with class names and confidence %. Click "Start Detecting" to begin. Click "Stop" to freeze counts. Click "Start Processing" to proceed with detected items.
   - PROCESSING PAGE (/processing): Shows detected waste classes one by one. For each class, user sees 8 item cards with images (e.g. plastic bottle, plastic bag). Select up to N items (N = count detected). Click "Wrong Detection – Skip" if the AI made a mistake. After all classes, a summary shows. Click "Proceed to Bin Sorting".
   - BIN ANIMATION (/bin-animation): Each selected item animates flying into its correct bin. Bins used: Blue (Dry Waste) for plastic/paper/metal/glass/cardboard, Green (Wet/Bio Waste) for organic, Red (Biomedical Waste) for medical items. After all items, shows tally and routes to Eco Chat or Stats.
   - ECO CHAT (/eco-chat): Dedicated full-screen chat page with eco impact sidebar. Shows per-class stats (decompose time, CO2 saved, energy saved, reuse ideas).
   - STATISTICS (/stats): Personal dashboard — total items sorted, energy saved (kWh), CO2 prevented (kg), pie/bar/line charts, achievements badges.
   - STUDY MODE (/study): Curated eco articles + live news (needs free GNews API key from gnews.io). Topic tabs: recycling, plastic, climate, zero waste, biodegradable, energy.
   - ECOBOT SIDEBAR (this!): Always visible on the right side on every page except the scan page. Collapsible. Knows current page context.

2. ECO & WASTE KNOWLEDGE (India context):
   - Waste categories: Dry Waste (blue bin), Wet/Bio Waste (green bin), Hazardous/Biomedical (red bin)
   - Recycling facts, reuse ideas, energy savings, CO2 numbers
   - Swachh Bharat Mission, Indian municipal waste rules
   - Composting, circular economy, zero waste tips

RULES:
- Answer app questions clearly and helpfully — guide the user through whatever step they're on
- Answer eco/waste questions with facts and encouragement
- If asked something completely unrelated (cricket, movies, etc.), warmly redirect: "I'm your eco & app guide! Ask me about the app or recycling 🌱"
- Keep responses SHORT (2-4 sentences) since you're a sidebar — use bullet points for lists
- Use emojis naturally
- Current page context will be provided in each message — use it to give relevant tips`;

// ── Page-specific welcome messages and quick tips ─────────────────────────────
const PAGE_CONTEXT = {
  "/processing": {
    welcome: "You're on the **Item Selection** step! 🃏 For each waste class detected, select the specific items that were there. You can pick up to the number detected. If the AI got it wrong, use **'Wrong Detection – Skip'**.",
    tips: [
      "How do I select items?",
      "What does 'Wrong Detection' mean?",
      "Why is there a max limit on selections?",
      "What happens after I select all items?",
    ],
  },
  "/bin-animation": {
    welcome: "Watch your items go into the **right bins**! 🗑️ Blue = Dry Waste, Green = Wet/Bio, Red = Biomedical. Each item shows an eco tip after sorting.",
    tips: [
      "Why does plastic go in the blue bin?",
      "What is Dry Waste vs Wet Waste?",
      "What happens after all items are sorted?",
      "How is biomedical waste handled?",
    ],
  },
  "/eco-chat": {
    welcome: "This is the **full Eco Chat** page 🌿 You can also chat with me right here in the sidebar anytime! The left panel shows eco impact for each class you sorted.",
    tips: [
      "Show eco impact of plastic",
      "How much CO₂ did I save?",
      "What are reuse ideas for glass?",
      "Go to Statistics",
    ],
  },
  "/stats": {
    welcome: "Your **EcoStats** dashboard 📊 See your total impact — items sorted, energy saved, CO₂ prevented. Achievements unlock as you sort more!",
    tips: [
      "How is energy saved calculated?",
      "What are the achievements?",
      "How do I unlock EcoChampion?",
      "Go to Study Mode",
    ],
  },
  "/study": {
    welcome: "**Study Mode** 📰 Browse curated eco articles and live news. For live news, add a free GNews API key (gnews.io) in the yellow banner.",
    tips: [
      "How do I get live news?",
      "What topics are covered?",
      "Tell me about composting",
      "What is zero waste living?",
    ],
  },
};

const DEFAULT_CONTEXT = {
  welcome: "Hi! I'm EcoBot 🌿 Ask me anything about the app or recycling!",
  tips: [
    "How does this app work?",
    "What are the steps in EcoSort?",
    "What bins are used?",
    "Tell me an eco fact",
  ],
};

export default function EcoBotSidebar({ onToggle }) {
  const location  = useLocation();
  const navigate  = useNavigate();
  const { confirmedItems, scanResults } = useApp();

  const [isOpen,      setIsOpen]      = useState(true);
  const [messages,    setMessages]    = useState(() => {
    try { return JSON.parse(sessionStorage.getItem("ecobot_messages") || "[]"); }
    catch { return []; }
  });
  const [input,       setInput]       = useState("");
  const [loading,     setLoading]     = useState(false);
  const [speaking,    setSpeaking]    = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [hasNewMsg,   setHasNewMsg]   = useState(false);

  const chatEndRef     = useRef(null);
  const recognitionRef = useRef(null);
  const prevPathRef    = useRef(null);
  // Per-conversation Gemini history (not persisted — resets on hard reload)
  const historyRef     = useRef([]);

  // FIX: Use refs for values needed inside sendMessage to avoid stale closures
  const isOpenRef         = useRef(isOpen);
  const locationRef       = useRef(location);
  const scanResultsRef    = useRef(scanResults);
  const confirmedItemsRef = useRef(confirmedItems);
  const loadingRef        = useRef(loading);

  useEffect(() => { isOpenRef.current = isOpen; }, [isOpen]);
  useEffect(() => { locationRef.current = location; }, [location]);
  useEffect(() => { scanResultsRef.current = scanResults; }, [scanResults]);
  useEffect(() => { confirmedItemsRef.current = confirmedItems; }, [confirmedItems]);
  useEffect(() => { loadingRef.current = loading; }, [loading]);

  const pageCtx = PAGE_CONTEXT[location.pathname] || DEFAULT_CONTEXT;

  // Persist messages to sessionStorage
  useEffect(() => {
    try { sessionStorage.setItem("ecobot_messages", JSON.stringify(messages)); }
    catch {}
  }, [messages]);

  // Send a welcome message on page change
  useEffect(() => {
    if (prevPathRef.current === location.pathname) return;
    prevPathRef.current = location.pathname;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.role === "assistant" && lastMsg.text === pageCtx.welcome) return;
    const welcomeMsg = { role: "assistant", text: pageCtx.welcome, ts: Date.now() };
    setMessages(prev => prev.length === 0 ? [welcomeMsg] : [...prev, welcomeMsg]);
    if (!isOpenRef.current) setHasNewMsg(true);
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Build page-aware context appended to system prompt
  // Uses refs so it can be called inside sendMessage without stale values
  const buildContext = useCallback(() => {
    const loc = locationRef.current;
    const sr  = scanResultsRef.current;
    const ci  = confirmedItemsRef.current;
    const parts = [`Current page: ${loc.pathname}`];
    if (Object.keys(sr || {}).length > 0) {
      parts.push(`Detected classes: ${Object.entries(sr).map(([k, v]) => `${k}(${v})`).join(", ")}`);
    }
    if (ci?.length > 0) {
      parts.push(`Confirmed items: ${ci.map(i => i.label).join(", ")}`);
    }
    return "\n\nContext: " + parts.join(". ");
  }, []);

  // ── Send message ────────────────────────────────────────────────────────────
  // FIX: stable callback — no dependency array churn. All mutable state accessed via refs.
  const sendMessage = useCallback(async (text) => {
    if (!text?.trim() || loadingRef.current) return;
    const trimmed = text.trim();
    const userMsg = { role: "user", text: trimmed, ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    loadingRef.current = true;

    // Handle navigation commands locally — no API call needed
    const lower = trimmed.toLowerCase();
    if (lower.includes("go to stat") || lower.includes("open stat")) {
      setMessages(prev => [...prev, { role: "assistant", text: "Taking you to Statistics! 📊", ts: Date.now() }]);
      setLoading(false); loadingRef.current = false;
      setTimeout(() => navigate("/stats"), 600);
      return;
    }
    if (lower.includes("go to study") || lower.includes("study mode")) {
      setMessages(prev => [...prev, { role: "assistant", text: "Opening Study Mode! 📰", ts: Date.now() }]);
      setLoading(false); loadingRef.current = false;
      setTimeout(() => navigate("/study"), 600);
      return;
    }
    if (lower.includes("new scan") || lower.includes("start scan")) {
      setMessages(prev => [...prev, { role: "assistant", text: "Heading back to the scanner! 🔍", ts: Date.now() }]);
      setLoading(false); loadingRef.current = false;
      setTimeout(() => navigate("/"), 600);
      return;
    }

    try {
      const fullSystemPrompt = SYSTEM_PROMPT + buildContext();
      const res = await fetch("http://127.0.0.1:8000/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ prompt: text }),
});

const data = await res.json();

if (data.error) {
  console.log("BACKEND ERROR:", data.error);
  throw new Error(data.error);
}

const reply = data.reply;

      // Update history for next turn
      historyRef.current = [
        ...historyRef.current.slice(-6),
        { role: "user",  parts: [{ text: trimmed }] },
        { role: "model", parts: [{ text: reply }] },
      ];

      setMessages(prev => [...prev, { role: "assistant", text: reply, ts: Date.now() }]);
      if (!isOpenRef.current) setHasNewMsg(true);
      speakText(reply);
    } catch (err) {
  const msg = String(err?.message || "");

  let errText = "🔌 EcoBot error: " + (msg || "Something went wrong");

  if (msg.includes("429")) {
    errText = "⏳ Rate limit hit — wait a few seconds and try again.";
  }

  setMessages(prev => [
    ...prev,
    { role: "assistant", text: errText, ts: Date.now() }
  ]);
}finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [navigate, buildContext]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── TTS ─────────────────────────────────────────────────────────────────────
  function speakText(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const plain = text.replace(/\*\*(.*?)\*\*/g, "$1").replace(/[#*`•]/g, "");
    const utt = new SpeechSynthesisUtterance(plain);
    utt.rate = 1.1; utt.pitch = 1.05; utt.volume = 0.9;
    const tryVoice = () => {
      const v = speechSynthesis.getVoices();
      const pick = v.find(x => x.lang.startsWith("en-IN")) || v.find(x => x.lang.startsWith("en"));
      if (pick) utt.voice = pick;
    };
    tryVoice();
    if (!speechSynthesis.getVoices().length) speechSynthesis.onvoiceschanged = tryVoice;
    utt.onstart = () => setSpeaking(true);
    utt.onend   = () => setSpeaking(false);
    utt.onerror = () => setSpeaking(false);
    speechSynthesis.speak(utt);
  }

  function stopSpeaking() { window.speechSynthesis?.cancel(); setSpeaking(false); }

  // ── Voice input ─────────────────────────────────────────────────────────────
  function toggleVoice() {
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Voice input needs Chrome or Edge."); return; }
    const rec = new SR();
    rec.lang = "en-IN"; rec.interimResults = false; rec.continuous = false;
    rec.onstart  = () => setIsListening(true);
    rec.onend    = () => setIsListening(false);
    rec.onerror  = () => setIsListening(false);
    rec.onresult = e => {
      const t = e.results[0][0].transcript;
      setInput(t);
      setTimeout(() => sendMessage(t), 200);
    };
    rec.start(); recognitionRef.current = rec;
  }

  const handleOpen = () => {
    setIsOpen(true);
    setHasNewMsg(false);
    if (onToggle) onToggle(true);
  };

  return (
    <div className={`ecobot-sidebar ${isOpen ? "open" : "closed"}`}>

      {/* ── COLLAPSED TAB ── */}
      {!isOpen && (
        <button className="ecobot-tab" onClick={handleOpen}>
          <span className="ecobot-tab-icon">🌿</span>
          <span className="ecobot-tab-label">EcoBot</span>
          {hasNewMsg && <span className="ecobot-notif" />}
        </button>
      )}

      {/* ── OPEN PANEL ── */}
      {isOpen && (
        <div className="ecobot-panel">
          {/* Header */}
          <div className="ecobot-header">
            <div className="ecobot-avatar">🤖</div>
            <div className="ecobot-header-text">
              <div className="ecobot-name">EcoBot</div>
              <div className="ecobot-status">
                {speaking ? (
                  <span className="speaking-dots">
                    <span /><span /><span /> Speaking
                  </span>
                ) : loading ? "Thinking…" : "● Online"}
              </div>
            </div>
            <div className="ecobot-header-actions">
              {speaking && (
                <button className="ecobot-stop-btn" onClick={stopSpeaking} title="Stop speaking">⏹</button>
              )}
              <button
                className="ecobot-close-btn"
                onClick={() => { setIsOpen(false); if (onToggle) onToggle(false); }}
                title="Collapse"
              >‹</button>
            </div>
          </div>

          {/* Messages */}
          <div className="ecobot-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`ebot-msg ebot-msg-${msg.role}`}>
                {msg.role === "assistant" && <span className="ebot-avatar-sm">🌿</span>}
                <div className="ebot-bubble">
                  {msg.text.split("\n").filter(Boolean).map((line, j) => (
                    <p key={j}>{line.replace(/\*\*(.*?)\*\*/g, "$1")}</p>
                  ))}
                  {msg.role === "assistant" && (
                    <button className="ebot-speak" onClick={() => speakText(msg.text)} title="Read aloud">🔊</button>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="ebot-msg ebot-msg-assistant">
                <span className="ebot-avatar-sm">🌿</span>
                <div className="ebot-bubble ebot-typing"><span /><span /><span /></div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick tips */}
          <div className="ecobot-chips">
            {pageCtx.tips.map((tip, i) => (
              <button key={i} className="ecobot-chip" onClick={() => sendMessage(tip)} disabled={loading}>
                {tip}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="ecobot-input-row">
            <button
              className={`ebot-voice-btn ${isListening ? "listening" : ""}`}
              onClick={toggleVoice}
              title={isListening ? "Stop" : "Speak"}
            >
              {isListening ? "⏹" : "🎤"}
            </button>
            <input
              className="ecobot-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage(input);
  }
}}
              placeholder={isListening ? "Listening…" : "Ask anything…"}
              disabled={isListening || loading}
            />
            <button
              className="ebot-send-btn"
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
            >
              {loading ? <span className="ebot-spinner" /> : "→"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
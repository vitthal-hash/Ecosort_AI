import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { ECO_IMPACT, BIN_MAP } from "../data/wasteData";
  // ✅ uses correct model
import "./EcoChatScreen.css";

const SYSTEM_PROMPT = `You are EcoBot, an enthusiastic and knowledgeable eco-advisor for the EcoSort AI waste management app running in India.
Your role is to educate users about:
- Environmental impact of waste items they've scanned and sorted
- Recycling tips and best practices specific to India (Swachh Bharat, municipal rules)
- How to reuse items creatively at home
- Energy and carbon savings from proper recycling
- Fun ecology facts that inspire real action
- Local waste management: Pune, Mumbai, Bangalore, Delhi context

Rules:
- ONLY discuss waste management, recycling, sustainability, ecology, environment topics
- If asked anything unrelated, warmly redirect: "Great question! But I'm best at eco topics 🌱 — ask me about recycling!"
- Be encouraging, warm, and inspiring — like a knowledgeable friend
- Give specific numbers and facts when possible (energy kWh, CO2 kg, years to decompose)
- Keep responses to 3-5 sentences unless asked for detail
- Use emojis naturally but not excessively
- Reference the user's sorted items specifically when relevant`;

export default function EcoChatScreen() {
  const { confirmedItems } = useApp();
  const navigate = useNavigate();

  const [messages, setMessages]       = useState([]);
  const [input, setInput]             = useState("");
  const [loading, setLoading]         = useState(false);
  const [speaking, setSpeaking]       = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [activeClass, setActiveClass] = useState(null);
  const chatEndRef     = useRef(null);
  const recognitionRef = useRef(null);
  // Keep a Gemini-format history for multi-turn conversation
  const historyRef = useRef([]);

  // Group confirmed items by class
  const classSummary = {};
  confirmedItems.forEach(i => {
    if (!classSummary[i.class]) classSummary[i.class] = [];
    classSummary[i.class].push(i.label);
  });

  // Welcome message on mount
  useEffect(() => {
    const classes = Object.keys(classSummary);
    const welcomeText = classes.length > 0
      ? `🌱 Excellent sorting session! You disposed of **${confirmedItems.length} item(s)** across ${classes.length} waste category(s): ${classes.join(", ")}.\n\nClick any category on the left to see its eco impact, or ask me anything about recycling and sustainability! 💚`
      : `🌱 Welcome to EcoChat! I'm EcoBot — your AI eco-advisor.\n\nAsk me anything about recycling, sustainability, how to reduce your carbon footprint, or how to reuse everyday items! 💚`;
    setMessages([{ role: "assistant", text: welcomeText, ts: Date.now() }]);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Build session context string appended to system prompt
  function buildSessionContext() {
    const classes = Object.keys(classSummary);
    if (classes.length === 0) return "";
    return `\n\nSession context: The user just sorted these items — ${
      classes.map(c => `${c}: ${classSummary[c].join(", ")}`).join("; ")
    }. Reference these specifically when relevant.`;
  }

  // ── Send message ────────────────────────────────────────────────────────────
  async function sendMessage(text) {
    if (!text.trim() || loading) return;

    const trimmed = text.trim();
    const userMsg = { role: "user", text: trimmed, ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const fullSystemPrompt = SYSTEM_PROMPT + buildSessionContext();

      // askGemini maintains history externally — we pass historyRef
      const res = await fetch("http://127.0.0.1:8000/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ prompt: trimmed }),
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

      const botMsg = { role: "assistant", text: reply, ts: Date.now() };
      setMessages(prev => [...prev, botMsg]);
      speakText(reply);
    } catch (err) {
  console.error("EcoBot Error:", err);   // 🔥 see real error in console

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
  setLoading(false);   // ✅ THIS WAS MISSING
}}
  // ── Text-to-speech ──────────────────────────────────────────────────────────
  function speakText(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const plain = text.replace(/\*\*(.*?)\*\*/g, "$1").replace(/[#*`]/g, "");
    const utt = new SpeechSynthesisUtterance(plain);
    utt.rate = 1.05; utt.pitch = 1.1; utt.volume = 0.92;
    const trySetVoice = () => {
      const voices = speechSynthesis.getVoices();
      const preferred = voices.find(v => v.lang.startsWith("en-IN"))
        || voices.find(v => v.lang.startsWith("en") && v.name.toLowerCase().includes("female"))
        || voices.find(v => v.lang.startsWith("en"));
      if (preferred) utt.voice = preferred;
    };
    trySetVoice();
    if (speechSynthesis.getVoices().length === 0) speechSynthesis.onvoiceschanged = trySetVoice;
    utt.onstart = () => setSpeaking(true);
    utt.onend   = () => setSpeaking(false);
    utt.onerror = () => setSpeaking(false);
    speechSynthesis.speak(utt);
  }

  function stopSpeaking() {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }

  // ── Voice input ─────────────────────────────────────────────────────────────
  function toggleVoice() {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Voice input requires Chrome or Edge browser."); return; }
    const rec = new SR();
    rec.lang = "en-IN";
    rec.interimResults = false;
    rec.continuous = false;
    rec.onstart  = () => setIsListening(true);
    rec.onend    = () => setIsListening(false);
    rec.onerror  = () => setIsListening(false);
    rec.onresult = e => {
      const t = e.results[0][0].transcript;
      setInput(t);
      setTimeout(() => sendMessage(t), 300);
    };
    rec.start();
    recognitionRef.current = rec;
  }

  // Context-aware quick chips
  const quickQuestions = activeClass
    ? [
        `How much energy is saved by recycling ${activeClass}?`,
        `How can I reuse ${activeClass} creatively at home?`,
        `What happens when ${activeClass} ends up in landfill?`,
        `Give me a fun fact about ${activeClass} recycling`,
      ]
    : [
        "What are the 3 Rs of waste management?",
        "How do I start composting at home?",
        "Which plastics can actually be recycled in India?",
        "How much CO₂ does recycling save?",
        "What is Swachh Bharat and how can I help?",
      ];

  return (
    <div className="eco-root">
      <aside className="eco-panel">

  {/* 🔽 SCROLLABLE PART */}
  <div className="eco-panel-scroll">

    <div className="eco-panel-brand">
      <span className="eco-panel-icon">🌿</span>
      <div>
        <div className="eco-panel-title">Eco Impact</div>
        <div className="eco-panel-sub">Your session insights</div>
      </div>
    </div>

    <div className="eco-class-tabs">
      <div className="section-label">Your sorted categories</div>
      {Object.keys(classSummary).map(cls => (
        <button
          key={cls}
          className={`eco-class-tab ${activeClass === cls ? "active" : ""}`}
          onClick={() => setActiveClass(activeClass === cls ? null : cls)}
          style={{ "--tc": BIN_MAP[cls.toLowerCase()]?.color || "#00ffc8" }}
        >
          <span>{BIN_MAP[cls.toLowerCase()]?.emoji || "♻️"}</span>
          <span>{cls}</span>
          <span className="tab-count">{classSummary[cls].length}</span>
        </button>
      ))}
      {Object.keys(classSummary).length === 0 && (
        <div className="eco-no-items">
          <p>No items sorted yet.</p>
          <button onClick={() => navigate("/")}>← Start Scanning</button>
        </div>
      )}
    </div>

    {activeClass && (() => {
      const eco = ECO_IMPACT[activeClass.toLowerCase()];
      if (!eco) return null;
      return (
        <div className="eco-detail">
          <div className="eco-stat-row">
            <div className="eco-stat">
              <div className="eco-stat-label">⏳ Decomposes in</div>
              <div className="eco-stat-value">{eco.decompose}</div>
            </div>
            <div className="eco-stat">
              <div className="eco-stat-label">🌫️ CO₂ Saved</div>
              <div className="eco-stat-value">{eco.co2Saved}</div>
            </div>
          </div>
          <div className="eco-energy">⚡ {eco.energySaved}</div>
          <div className="eco-reuse-title">Creative reuse ideas:</div>
          <ul className="eco-reuse-list">
            {eco.reuse.map((r, i) => <li key={i}>♻️ {r}</li>)}
          </ul>
          <div className="eco-funfact">🧠 <em>{eco.funFact}</em></div>
          <button
            className="ask-eco-btn"
            onClick={() => sendMessage(`Tell me more about ${activeClass} recycling and its environmental impact`)}
          >
            Ask EcoBot about {activeClass} →
          </button>
        </div>
      );
    })()}

  </div>

  {/* 🔽 FIXED BOTTOM PART */}
  <div className="eco-panel-nav">
    <button className="btn-nav" onClick={() => navigate("/stats")}>📊 My Statistics</button>
    <button className="btn-nav" onClick={() => navigate("/study")}>📰 Study Mode</button>
    <button className="btn-nav" onClick={() => navigate("/")}>🔍 New Scan</button>
  </div>

</aside>

      {/* ── RIGHT: chat ── */}
      <div className="eco-chat">
        <div className="eco-chat-header">
          <div className="eco-bot-avatar">🤖</div>
          <div className="eco-chat-header-text">
            <div className="eco-chat-title">EcoBot</div>
            <div className="eco-chat-sub">AI Eco Advisor · Waste & Sustainability · India</div>
          </div>
          {speaking && (
            <div className="speaking-indicator" onClick={stopSpeaking} title="Click to stop speaking">
              <span className="wave" /><span className="wave" /><span className="wave" />
              🔊 Speaking — tap to stop
            </div>
          )}
        </div>

        <div className="eco-messages">
          {messages.map((msg, i) => (
            <div key={i} className={`eco-msg eco-msg-${msg.role}`}>
              {msg.role === "assistant" && <div className="eco-msg-avatar">🌿</div>}
              <div className="eco-msg-bubble">
                <div className="eco-msg-text">
                  {msg.text.split("\n").filter(Boolean).map((line, j) => (
                    <p key={j}>{line.replace(/\*\*(.*?)\*\*/g, "$1")}</p>
                  ))}
                </div>
                <div className="eco-msg-footer">
                  <span className="eco-msg-ts">
                    {new Date(msg.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  {msg.role === "assistant" && (
                    <button className="speak-btn" onClick={() => speakText(msg.text)} title="Read aloud">
                      🔊
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="eco-msg eco-msg-assistant">
              <div className="eco-msg-avatar">🌿</div>
              <div className="eco-msg-bubble typing">
                <span /><span /><span />
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="quick-chips">
          {quickQuestions.map((q, i) => (
            <button key={i} className="quick-chip" onClick={() => sendMessage(q)} disabled={loading}>
              {q}
            </button>
          ))}
        </div>

        <div className="eco-input-row">
          <button
            className={`voice-btn ${isListening ? "listening" : ""}`}
            onClick={toggleVoice}
            title={isListening ? "Click to stop listening" : "Click to speak"}
          >
            {isListening ? "⏹" : "🎤"}
          </button>
          <input
            className="eco-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage(input);
  }
}}
            placeholder={isListening ? "Listening… speak now" : "Ask about recycling, eco impact, reuse ideas…"}
            disabled={isListening}
          />
          <button
            className="send-btn"
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
          >
            {loading ? <span className="send-spinner" /> : "→"}
          </button>
        </div>
      </div>
    </div>
  );
}
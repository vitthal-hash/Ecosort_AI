const express  = require("express");
const mongoose = require("mongoose");
const cors     = require("cors");
const bcrypt   = require("bcryptjs");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// ── CONNECT TO MONGODB ────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));

// ── USER SCHEMA ───────────────────────────────────────────────────────────────
const UserSchema = new mongoose.Schema({
  email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  createdAt:    { type: Date, default: Date.now },
});
const User = mongoose.model("User", UserSchema);

// ── STATS SCHEMA (now per-user) ───────────────────────────────────────────────
// Each user gets exactly ONE Stats document linked by userId.
const StatsSchema = new mongoose.Schema({
  userId:         { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  sessions:       { type: Array,  default: [] },
  totalItems:     { type: Number, default: 0 },
  energySavedKWh: { type: Number, default: 0 },
  co2SavedKg:     { type: Number, default: 0 },
  binCounts:      { type: Object, default: {} },
});
const Stats = mongoose.model("Stats", StatsSchema);

// ── EMAIL VALIDATION HELPER ───────────────────────────────────────────────────
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).toLowerCase());
}

// ── AUTH: SIGN UP ─────────────────────────────────────────────────────────────
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !isValidEmail(email))
      return res.status(400).json({ error: "Please enter a valid email address." });

    if (!password || password.length < 6)
      return res.status(400).json({ error: "Password must be at least 6 characters." });

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing)
      return res.status(409).json({ error: "An account with this email already exists." });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email: email.toLowerCase().trim(), passwordHash });

    // Create an empty stats document for this new user right away
    await Stats.create({ userId: user._id });

    res.status(201).json({
      message: "Account created successfully.",
      user: { id: user._id, email: user.email },
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Server error. Please try again." });
  }
});

// ── AUTH: LOGIN ───────────────────────────────────────────────────────────────
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !isValidEmail(email))
      return res.status(400).json({ error: "Please enter a valid email address." });

    if (!password)
      return res.status(400).json({ error: "Password is required." });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user)
      return res.status(404).json({ error: "No account found with this email." });

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match)
      return res.status(401).json({ error: "Incorrect password." });

    res.json({
      message: "Login successful.",
      user: { id: user._id, email: user.email },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error. Please try again." });
  }
});

// ── STATS: GET (for a specific user) ─────────────────────────────────────────
// GET /api/stats/:userId
app.get("/api/stats/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId))
      return res.status(400).json({ error: "Invalid user ID." });

    const data = await Stats.findOne({ userId });
    res.json(data || {
      sessions: [], totalItems: 0, energySavedKWh: 0, co2SavedKg: 0, binCounts: {},
    });
  } catch (err) {
    console.error("Stats fetch error:", err);
    res.status(500).json({ error: "Failed to fetch stats." });
  }
});

// ── STATS: SAVE (for a specific user) ────────────────────────────────────────
// POST /api/save/:userId
app.post("/api/save/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId))
      return res.status(400).json({ error: "Invalid user ID." });

    // findOneAndUpdate with upsert: creates if missing, updates if exists
    const data = await Stats.findOneAndUpdate(
      { userId },
      { $set: { ...req.body, userId } },
      { upsert: true, new: true }
    );
    res.json(data);
  } catch (err) {
    console.error("Stats save error:", err);
    res.status(500).json({ error: "Failed to save stats." });
  }
});

// ── STATS: CLEAR (for a specific user) ───────────────────────────────────────
// POST /api/clear/:userId
app.post("/api/clear/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId))
      return res.status(400).json({ error: "Invalid user ID." });

    const empty = { sessions: [], totalItems: 0, energySavedKWh: 0, co2SavedKg: 0, binCounts: {} };
    await Stats.findOneAndUpdate({ userId }, { $set: empty }, { upsert: true });
    res.json(empty);
  } catch (err) {
    console.error("Stats clear error:", err);
    res.status(500).json({ error: "Failed to clear stats." });
  }
});

app.listen(process.env.PORT, () =>
  console.log(`Server running on http://localhost:${process.env.PORT}`)
);
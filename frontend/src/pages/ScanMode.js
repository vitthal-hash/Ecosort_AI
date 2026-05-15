import "./ScanMode.css";
import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "../context/AppContext";

/* ─── helpers ─────────────────────────────────────────────────────────────── */
function iou(a, b) {
  const xi1 = Math.max(a[0], b[0]), yi1 = Math.max(a[1], b[1]);
  const xi2 = Math.min(a[2], b[2]), yi2 = Math.min(a[3], b[3]);
  const inter = Math.max(0, xi2 - xi1) * Math.max(0, yi2 - yi1);
  if (inter === 0) return 0;
  const aA = (a[2]-a[0])*(a[3]-a[1]), bA = (b[2]-b[0])*(b[3]-b[1]);
  return inter / (aA + bA - inter);
}
function deduplicateDetections(dets) {
  const kept = [];
  for (const d of dets) {
    if (!kept.some(k => k.class === d.class && iou(k.box, d.box) > 0.45)) kept.push(d);
  }
  return kept;
}

const CLASS_COLORS = ["#00ff96","#ff6b6b","#ffd700","#a78bfa","#38bdf8","#fb923c","#f472b6","#4ade80","#facc15","#60a5fa"];
const colorCache = {}; let colorIdx = 0;
function classColor(cls) {
  const key = cls?.toLowerCase() ?? "unknown";
  if (!colorCache[key]) colorCache[key] = CLASS_COLORS[colorIdx++ % CLASS_COLORS.length];
  return colorCache[key];
}
const CLASS_ICONS = {
  plastic:"♻️", glass:"🍶", metal:"🥫", paper:"📄",
  cardboard:"📦", organic:"🌿", "medical-waste":"🩺", "e-waste":"💻",
  biodegradable:"🌿", default:"🔍",
};
function classIcon(cls) { return CLASS_ICONS[cls?.toLowerCase()] || CLASS_ICONS.default; }

async function callDetect(fileOrBlob) {
  const fd = new FormData();
  fd.append("file", fileOrBlob);
  const res  = await fetch("http://127.0.0.1:8000/detect", { method: "POST", body: fd });
  const data = await res.json();
  const detections = deduplicateDetections(data.detections || []);

  // Build counts directly from detections — never rely on data.counts which
  // may be empty, missing, or use different casing than detections[].class.
  const counts = {};
  detections.forEach(det => {
    const key = det.class.toLowerCase();
    counts[key] = (counts[key] || 0) + 1;
  });

  return { detections, counts };
}

/* ─── ImageCard ────────────────────────────────────────────────────────────── */
function ImageCard({ entry, onRemove, onDetect }) {
  const imgRef  = useRef(null);
  const wrapRef = useRef(null);
  const [rd, setRd] = useState({ w: 0, h: 0, top: 0, left: 0 });

  const measure = useCallback(() => {
    const img  = imgRef.current;
    const wrap = wrapRef.current;
    if (!img || !wrap) return;
    const ir = img.getBoundingClientRect();
    const wr = wrap.getBoundingClientRect();
    setRd({ w: ir.width, h: ir.height, top: ir.top - wr.top, left: ir.left - wr.left });
  }, []);

  useEffect(() => {
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  const nw = imgRef.current?.naturalWidth  || 1;
  const nh = imgRef.current?.naturalHeight || 1;

  const isDone    = entry.status === "done";
  const isLoading = entry.status === "loading";
  const isError   = entry.status === "error";
  const hasDets   = isDone && entry.detections.length > 0;

  return (
    <div className="img-card">
      <div className="img-card-preview" ref={wrapRef}>
        <img
          ref={imgRef}
          src={entry.previewUrl}
          alt={entry.file.name}
          className="img-card-img"
          onLoad={measure}
        />

        {hasDets && rd.w > 0 && (
          <div
            style={{
              position: "absolute",
              top: rd.top, left: rd.left,
              width: rd.w, height: rd.h,
              pointerEvents: "none",
            }}
          >
            {entry.detections.map((det, i) => {
              const [x1, y1, x2, y2] = det.box;
              const color = classColor(det.class);
              return (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    top:    `${(y1 / nh) * 100}%`,
                    left:   `${(x1 / nw) * 100}%`,
                    width:  `${((x2 - x1) / nw) * 100}%`,
                    height: `${((y2 - y1) / nh) * 100}%`,
                    border: `2px solid ${color}`,
                    boxSizing: "border-box",
                    boxShadow: `0 0 8px ${color}88`,
                    borderRadius: 3,
                  }}
                >
                  <span style={{
                    position: "absolute", top: -18, left: -1,
                    background: color, color: "#000",
                    fontSize: 9, fontWeight: 700,
                    padding: "1px 5px", borderRadius: 3,
                    whiteSpace: "nowrap", lineHeight: "16px",
                  }}>
                    {det.class.toUpperCase()} {(det.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {isLoading && (
          <div className="img-card-loading-overlay">
            <div className="img-card-spinner" />
          </div>
        )}

        <div className={`img-card-badge${isDone ? " done" : isError ? " error" : ""}`}>
          {isDone
            ? (entry.detections.length > 0 ? `✅ ${entry.detections.length} obj` : "⚠️ None")
            : isError ? "❌ Error"
            : "⏳ Pending"}
        </div>

        <button className="img-card-remove" onClick={() => onRemove(entry.id)}>✕</button>
      </div>

      <div className="img-card-footer">
        <span className="img-card-name" title={entry.file.name}>{entry.file.name}</span>
        {(entry.status === "idle" || entry.status === "error") && (
          <button
            className={"img-card-detect-btn" + (entry.status === "error" ? " retry" : "")}
            onClick={() => onDetect(entry.id)}
          >
            {entry.status === "error" ? "↺ Retry" : "▶ Detect"}
          </button>
        )}
      </div>

      {isDone && entry.detections.length > 0 && (
        <div className="img-card-classes">
          {Object.entries(entry.counts).filter(([, n]) => n > 0).map(([cls, n]) => (
            <span
              key={cls}
              className="img-card-class-chip"
              style={{ borderColor: classColor(cls), color: classColor(cls) }}
            >
              {classIcon(cls)} {cls} ×{n}
            </span>
          ))}
        </div>
      )}

      {isError && <div className="img-card-error">{entry.error}</div>}
    </div>
  );
}

/* ─── ScanMode ────────────────────────────────────────────────────────────── */
export default function ScanMode() {
  const navigate           = useNavigate();
  const { setScanResults } = useApp();
  const [activeTab, setActiveTab] = useState("camera");

  /* ── camera state ─────────────────────────────────────── */
  const videoRef    = useRef(null);
  const canvasRef   = useRef(null);
  const intervalRef = useRef(null);
  const activeRef   = useRef(false);

  const [detections,   setDetections]   = useState([]);
  const [liveCounts,   setLiveCounts]   = useState({});
  const [trackedIds,   setTrackedIds]   = useState({});
  const [uniqueCounts, setUniqueCounts] = useState({});
  const [isRunning,    setIsRunning]    = useState(false);
  const [fps,          setFps]          = useState(0);
  const [camError,     setCamError]     = useState(null);
  const [videoDims,    setVideoDims]    = useState({ w: 1280, h: 720 });
  const lastFrameTime = useRef(Date.now());

  /* ── upload state: multi-image list ──────────────────── */
  const [imageList, setImageList] = useState([]);
  const fileInputRef = useRef(null);

  /* ── upload state: video ──────────────────────────────── */
  const [videoEntry,    setVideoEntry]    = useState(null);
  const [videoStatus,   setVideoStatus]   = useState("idle");
  const [videoCounts,   setVideoCounts]   = useState({});
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoError,    setVideoError]    = useState(null);
  const uploadVideoRef = useRef(null);

  // finalCounts is computed inline during render — always in sync, no lag.

  /* ── camera helpers ───────────────────────────────────── */
  const startCamera = async () => {
    setCamError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "environment" },
      });
      videoRef.current.srcObject = stream;
      videoRef.current.onloadedmetadata = () =>
        setVideoDims({ w: videoRef.current.videoWidth, h: videoRef.current.videoHeight });
      setTrackedIds({});
      setUniqueCounts({});
      setDetections([]);
      setLiveCounts({});
      activeRef.current = true;
      setIsRunning(true);
    } catch {
      setCamError("Camera access denied. Please allow camera permissions.");
    }
  };

  const stopCamera = useCallback(() => {
    activeRef.current = false;
    clearInterval(intervalRef.current);
    intervalRef.current = null;
    videoRef.current?.srcObject?.getTracks().forEach(t => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    const canvas = canvasRef.current;
    if (canvas) canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    setDetections([]);
    setLiveCounts({});
    setIsRunning(false);
  }, []);

  const uniqueCountsRef = useRef({});
  useEffect(() => { uniqueCountsRef.current = uniqueCounts; }, [uniqueCounts]);

  const handleProcess = useCallback(() => {
    stopCamera();
    setScanResults({ ...uniqueCountsRef.current });
    navigate("/processing");
  }, [stopCamera, setScanResults, navigate]);

  useEffect(() => {
    if (!isRunning) return;
    intervalRef.current = setInterval(async () => {
      if (!activeRef.current) return;
      const video  = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) return;
      canvas.width  = video.videoWidth  || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise(res => canvas.toBlob(res, "image/jpeg", 0.85));
      if (!activeRef.current) return;
      try {
        const { detections: deduped, counts } = await callDetect(blob);
        if (!activeRef.current) return;
        setDetections(deduped);
        setLiveCounts(counts);
        setTrackedIds(prev => {
          const updated = { ...prev };
          deduped.forEach(det => {
            if (det.id !== undefined && det.id !== -1) {
              if (!updated[det.class]) updated[det.class] = new Set();
              updated[det.class].add(det.id);
            }
          });
          return updated;
        });
        const now = Date.now();
        setFps(Math.round(1000 / (now - lastFrameTime.current)));
        lastFrameTime.current = now;
      } catch {}
    }, 500);
    return () => { clearInterval(intervalRef.current); intervalRef.current = null; };
  }, [isRunning]);

  useEffect(() => {
    const counts = {};
    Object.entries(trackedIds).forEach(([cls, ids]) => { counts[cls] = ids.size; });
    setUniqueCounts(counts);
  }, [trackedIds]);

  /* ── upload helpers ───────────────────────────────────── */

  useEffect(() => {
    return () => {
      imageList.forEach(e => URL.revokeObjectURL(e.previewUrl));
      if (videoEntry) URL.revokeObjectURL(videoEntry.previewUrl);
    };
  }, []); // eslint-disable-line

  function handleFileChange(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    e.target.value = "";

    const images = files.filter(f => f.type.startsWith("image/"));
    const videos  = files.filter(f => f.type.startsWith("video/"));

    if (images.length) {
      const newEntries = images.map(f => ({
        id:         Math.random().toString(36).slice(2),
        file:       f,
        previewUrl: URL.createObjectURL(f),
        status:     "idle",
        detections: [],
        counts:     {},
        error:      "",
      }));
      setImageList(prev => [...prev, ...newEntries]);
    }

    if (videos.length) {
      const f = videos[0];
      if (videoEntry) URL.revokeObjectURL(videoEntry.previewUrl);
      setVideoEntry({ file: f, previewUrl: URL.createObjectURL(f) });
      setVideoStatus("idle");
      setVideoCounts({});
      setVideoProgress(0);
      setVideoError(null);
    }
  }

  // Keep a ref mirror of imageList so async functions always get the latest file refs
  const imageListRef = useRef(imageList);
  useEffect(() => { imageListRef.current = imageList; }, [imageList]);

  async function detectOneImage(id) {
    setImageList(prev =>
      prev.map(e => e.id === id ? { ...e, status: "loading", detections: [], counts: {}, error: "" } : e)
    );
    const entry = imageListRef.current.find(e => e.id === id);
    if (!entry) return;
    try {
      const { detections, counts } = await callDetect(entry.file);
      setImageList(prev =>
        prev.map(e => e.id === id ? { ...e, status: "done", detections, counts } : e)
      );
    } catch {
      setImageList(prev =>
        prev.map(e => e.id === id
          ? { ...e, status: "error", error: "Detection failed — is the backend running?" }
          : e
        )
      );
    }
  }

  // Snapshot IDs before the loop so the iterator is stable across async re-renders
  async function detectAllImages() {
    const pendingIds = imageListRef.current
      .filter(e => e.status === "idle" || e.status === "error")
      .map(e => e.id);
    for (const id of pendingIds) {
      await detectOneImage(id);
    }
  }

  function removeImage(id) {
    setImageList(prev => {
      const entry = prev.find(e => e.id === id);
      if (entry) URL.revokeObjectURL(entry.previewUrl);
      return prev.filter(e => e.id !== id);
    });
  }

  function clearAllImages() {
    imageListRef.current.forEach(e => URL.revokeObjectURL(e.previewUrl));
    setImageList([]);
  }

  async function detectVideo() {
    const video = uploadVideoRef.current;
    if (!video || !videoEntry) return;
    setVideoStatus("loading");
    setVideoProgress(0);
    setVideoError(null);

    const offCanvas = document.createElement("canvas");
    const ctx       = offCanvas.getContext("2d");
    const merged    = {};
    const STEP      = 0.5;

    try {
      await new Promise(res => { video.onloadedmetadata = res; video.load(); });
      const duration    = video.duration;
      const totalFrames = Math.ceil(duration / STEP);
      let frameIdx      = 0;

      for (let t = 0; t < duration; t += STEP) {
        await new Promise((res, rej) => {
          video.currentTime = t;
          video.onseeked    = res;
          video.onerror     = rej;
        });
        offCanvas.width  = video.videoWidth  || 640;
        offCanvas.height = video.videoHeight || 480;
        ctx.drawImage(video, 0, 0, offCanvas.width, offCanvas.height);
        const blob = await new Promise(res => offCanvas.toBlob(res, "image/jpeg", 0.8));
        const { counts } = await callDetect(blob);
        Object.entries(counts).forEach(([cls, n]) => {
          merged[cls] = Math.max(merged[cls] || 0, n);
        });
        frameIdx++;
        setVideoProgress(Math.round((frameIdx / totalFrames) * 100));
      }
      setVideoCounts(merged);
      setVideoStatus("done");
    } catch (err) {
      setVideoError("Video scan failed: " + (err?.message || "unknown error"));
      setVideoStatus("error");
    } finally {
      setVideoProgress(0);
    }
  }

  function removeVideo() {
    if (videoEntry) URL.revokeObjectURL(videoEntry.previewUrl);
    setVideoEntry(null);
    setVideoStatus("idle");
    setVideoCounts({});
    setVideoError(null);
  }

  /* ── derived values ───────────────────────────────────── */

  // Compute finalCounts inline — reads the exact imageList from this render,
  // so it's always correct with zero lag. counts keys are already lowercased
  // by callDetect, so no further normalisation needed here.
  const finalCounts = {};
  imageList.forEach(e => {
    if (e.status === "done") {
      Object.entries(e.counts).forEach(([cls, n]) => {
        finalCounts[cls] = (finalCounts[cls] || 0) + n;
      });
    }
  });
  if (videoStatus === "done") {
    Object.entries(videoCounts).forEach(([cls, n]) => {
      finalCounts[cls] = Math.max(finalCounts[cls] || 0, n);
    });
  }

  const anyImagePending    = imageList.some(e => e.status === "idle" || e.status === "error");
  const anyImageLoading    = imageList.some(e => e.status === "loading");
  const canStartProcessing = Object.keys(finalCounts).some(k => finalCounts[k] > 0);
  const hasAnything        = imageList.length > 0 || videoEntry !== null;

  function handleUploadProcess() {
    setScanResults({ ...finalCounts });
    navigate("/processing");
  }

  const detectedClasses = Object.keys(uniqueCounts);
  const totalDetected   = Object.values(uniqueCounts).reduce((a, b) => a + b, 0);
  const canProcess      = detectedClasses.length > 0;

  /* ─────────────────────────────────────────────────────────
     RENDER
  ─────────────────────────────────────────────────────────── */
  return (
    <div className="scan-root">
      <div className="camera-panel">

        {/* ── tab bar ── */}
        <div className="scan-tab-bar">
          <button
            className={"scan-tab" + (activeTab === "camera" ? " active" : "")}
            onClick={() => setActiveTab("camera")}
          >
            📷 Live Camera
          </button>
          <button
            className={"scan-tab" + (activeTab === "upload" ? " active" : "")}
            onClick={() => { setActiveTab("upload"); stopCamera(); }}
          >
            🖼️ Upload Image / Video
          </button>
        </div>

        {/* ══════ CAMERA TAB ══════ */}
        {activeTab === "camera" && (
          <div className="cam-wrapper">
            <video ref={videoRef} autoPlay playsInline muted className="cam-video" />
            <canvas ref={canvasRef} style={{ display: "none" }} />

            <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
              <AnimatePresence>
                {detections.map((det, idx) => {
                  const [x1, y1, x2, y2] = det.box;
                  const color = classColor(det.class);
                  return (
                    <motion.div
                      key={det.id !== undefined && det.id !== -1 ? `det-${det.id}` : `det-un-${idx}`}
                      initial={{ opacity: 0, scale: 1.1 }}
                      animate={{
                        opacity: 1, scale: 1,
                        top:    `${(y1 / videoDims.h) * 100}%`,
                        left:   `${(x1 / videoDims.w) * 100}%`,
                        width:  `${((x2 - x1) / videoDims.w) * 100}%`,
                        height: `${((y2 - y1) / videoDims.h) * 100}%`,
                      }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ type: "spring", stiffness: 300, damping: 25, mass: 0.5 }}
                      className="bounding-box"
                      style={{ borderColor: color, boxShadow: `0 0 15px ${color}40, inset 0 0 10px ${color}20` }}
                    >
                      <div className="bb-corner tl" style={{ borderColor: color }} />
                      <div className="bb-corner tr" style={{ borderColor: color }} />
                      <div className="bb-corner bl" style={{ borderColor: color }} />
                      <div className="bb-corner br" style={{ borderColor: color }} />
                      <div className="bb-label" style={{ backgroundColor: color, color: "#000" }}>
                        {det.class.toUpperCase()} {(det.confidence * 100).toFixed(0)}%
                      </div>
                      {det.id !== undefined && det.id !== -1 && (
                        <div className="bb-id" style={{ borderColor: color, color }}>#{det.id}</div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {isRunning && <div className="scan-line-wrapper"><div className="scan-line" /></div>}
            {isRunning && <div className="fps-badge">{fps} FPS</div>}
            {!isRunning && (
              <div className="cam-idle">
                <div className="idle-orb"><span className="idle-orb-inner">♻</span></div>
                <div className="idle-text">
                  AWAITING CAMERA FEED
                  <div className="idle-sub">Press START DETECTING to begin</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════ UPLOAD TAB ══════ */}
        {activeTab === "upload" && (
          <div className="upload-panel">

            {/* drop zone */}
            <label className="upload-dropzone" style={hasAnything ? { padding: "14px 24px", maxWidth: "100%" } : {}}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                style={{ display: "none" }}
                onChange={handleFileChange}
              />
              <div className="upload-dropzone-inner" style={hasAnything ? { gap: 6, padding: 0 } : {}}>
                <div className="upload-icon" style={hasAnything ? { fontSize: 28 } : {}}>🖼️</div>
                <div className="upload-hint" style={hasAnything ? { fontSize: 13 } : {}}>
                  {hasAnything ? "➕ Add more images / video" : "Click to select images or video"}
                </div>
                {!hasAnything && (
                  <div className="upload-hint-sub">
                    JPG · PNG · WEBP · MP4 · MOV · WEBM — multiple images supported
                  </div>
                )}
              </div>
            </label>

            {/* ── IMAGE GRID ── */}
            {imageList.length > 0 && (
              <div style={{ width: "100%", maxWidth: 720 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)", letterSpacing: "0.08em" }}>
                    {imageList.length} IMAGE{imageList.length !== 1 ? "S" : ""}
                    &nbsp;·&nbsp;
                    {imageList.filter(e => e.status === "done").length} DETECTED
                  </span>
                  <div style={{ display: "flex", gap: 8 }}>
                    {anyImagePending && !anyImageLoading && (
                      <button
                        className="btn btn-start"
                        style={{ padding: "7px 16px", fontSize: 12 }}
                        onClick={detectAllImages}
                      >
                        ▶ Detect All
                      </button>
                    )}
                    <button
                      className="btn btn-stop"
                      style={{ padding: "7px 16px", fontSize: 12 }}
                      onClick={clearAllImages}
                    >
                      🗑 Clear All
                    </button>
                  </div>
                </div>

                <div className="upload-img-grid">
                  {imageList.map(entry => (
                    <ImageCard
                      key={entry.id}
                      entry={entry}
                      onRemove={removeImage}
                      onDetect={detectOneImage}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ── VIDEO ── */}
            {videoEntry && (
              <div style={{ width: "100%", maxWidth: 560 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)", letterSpacing: "0.08em" }}>
                    VIDEO FILE
                  </span>
                  <button className="btn btn-stop" style={{ padding: "5px 12px", fontSize: 11 }} onClick={removeVideo}>
                    ✕ Remove
                  </button>
                </div>

                <video
                  ref={uploadVideoRef}
                  src={videoEntry.previewUrl}
                  controls
                  style={{ width: "100%", borderRadius: 10, border: "1px solid var(--border)" }}
                />

                {videoStatus === "loading" && (
                  <div className="video-progress-wrap" style={{ marginTop: 8 }}>
                    <div className="video-progress-label">Scanning frames… {videoProgress}%</div>
                    <div className="video-progress-track">
                      <div className="video-progress-fill" style={{ width: videoProgress + "%" }} />
                    </div>
                  </div>
                )}

                {videoStatus === "done" && (
                  <div className="upload-results" style={{ marginTop: 8 }}>
                    <div className="upload-results-title">✅ Video scan complete</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                      {Object.entries(videoCounts).filter(([, n]) => n > 0).map(([cls, n]) => (
                        <span key={cls} className="img-card-class-chip"
                          style={{ borderColor: classColor(cls), color: classColor(cls) }}
                        >
                          {classIcon(cls)} {cls} ×{n}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {videoError && <div className="error-banner" style={{ marginTop: 8 }}>{videoError}</div>}

                {(videoStatus === "idle" || videoStatus === "error") && (
                  <button className="btn btn-start" style={{ marginTop: 10, width: "100%" }} onClick={detectVideo}>
                    {videoStatus === "error" ? "↺ Retry Video Scan" : "▶ Scan Video Frames"}
                  </button>
                )}
              </div>
            )}

            {/* ── MERGED RESULTS + START PROCESSING ── */}
            {canStartProcessing && (
              <div className="upload-results" style={{ width: "100%", maxWidth: 720 }}>
                <div className="upload-results-title">
                  🎯 Ready — {Object.values(finalCounts).reduce((a, b) => a + b, 0)} objects across all uploads
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "10px 0 14px" }}>
                  {Object.entries(finalCounts).map(([cls, n]) => (
                    <div
                      key={cls}
                      className="count-row"
                      style={{ borderLeftColor: classColor(cls), flex: "0 0 auto", minWidth: 150, margin: 0 }}
                    >
                      <div className="count-left">
                        <span className="count-icon">{classIcon(cls)}</span>
                        <span className="count-label">{cls}</span>
                      </div>
                      <div className="count-badge" style={{ color: classColor(cls) }}>{n}</div>
                    </div>
                  ))}
                </div>

                <button
                  className="btn btn-process"
                  style={{ width: "100%" }}
                  onClick={handleUploadProcess}
                >
                  <span className="btn-icon">→</span> Start Processing
                </button>
              </div>
            )}

          </div>
        )}

        {/* camera pills + error */}
        {activeTab === "camera" && detectedClasses.length > 0 && (
          <div className="live-pills">
            {detectedClasses.map(cls => (
              <span key={cls} className="pill" style={{ borderColor: classColor(cls), color: classColor(cls) }}>
                {classIcon(cls)} {cls}
              </span>
            ))}
          </div>
        )}
        {activeTab === "camera" && camError && <div className="error-banner">{camError}</div>}
      </div>

      {/* ── SIDE PANEL ── */}
      <aside className="side-panel">
        <div className="brand">
          <div className="brand-icon-wrap">♻</div>
          <div>
            <div className="brand-name">ECO<span>SORT</span></div>
            <div className="brand-sub">Detection System</div>
          </div>
        </div>
        <div className="divider" />

        {activeTab === "camera" && (
          <>
            <div className={`status-row${isRunning ? " active" : ""}`}>
              <span className="status-dot" />
              <span>{isRunning ? "SCANNING" : "STANDBY"}</span>
              {isRunning && (
                <span className="status-count">
                  {Object.values(liveCounts).reduce((a, b) => a + b, 0)} in frame
                </span>
              )}
            </div>

            <div className="counts-section">
              <div className="section-label">Unique Objects Tracked</div>
              {detectedClasses.length === 0 ? (
                <div className="empty-state">No objects detected yet</div>
              ) : (
                <div className="count-list">
                  {detectedClasses.map(cls => (
                    <div key={cls} className="count-row" style={{ borderLeftColor: classColor(cls) }}>
                      <div className="count-left">
                        <span className="count-icon">{classIcon(cls)}</span>
                        <span className="count-label">{cls}</span>
                      </div>
                      <div className="count-badge" style={{ color: classColor(cls) }}>{uniqueCounts[cls]}</div>
                      <div className="count-bar-wrap">
                        <div className="count-bar" style={{ width: Math.min(100, uniqueCounts[cls] * 15) + "%", background: classColor(cls) }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {totalDetected > 0 && (
                <div className="total-row">
                  <span>Total Unique</span>
                  <span className="total-num">{totalDetected}</span>
                </div>
              )}
            </div>

            <div className="divider" />

            <div className="actions">
              {!isRunning ? (
                <button className="btn btn-start" onClick={startCamera}>
                  <span className="btn-icon">▶</span> Start Detecting
                </button>
              ) : (
                <button className="btn btn-stop" onClick={stopCamera}>
                  <span className="btn-icon">■</span> Stop
                </button>
              )}
              {canProcess && (
                <button className="btn btn-process" onClick={handleProcess}>
                  <span className="btn-icon">→</span> Start Processing
                </button>
              )}
            </div>

            {detectedClasses.length > 0 && (
              <div className="legend">
                <div className="section-label">Active Classes</div>
                <div className="legend-grid">
                  {detectedClasses.map(cls => (
                    <div key={cls} className="legend-item">
                      <span className="legend-dot" style={{ background: classColor(cls) }} />
                      <span>{cls}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === "upload" && (
          <>
            <div className="status-row">
              <span className="status-dot" style={{
                background: canStartProcessing ? "#00ff96"
                  : anyImageLoading || videoStatus === "loading" ? "#fbbf24"
                  : "#64748b",
              }} />
              <span>
                {canStartProcessing        ? "READY"
                  : anyImageLoading || videoStatus === "loading" ? "DETECTING…"
                  : "AWAITING DETECTION"}
              </span>
            </div>

            <div className="counts-section">
              <div className="section-label">Detected Objects</div>
              {!canStartProcessing ? (
                <div className="empty-state">
                  {hasAnything ? "Run detection on your files" : "Upload images or video to begin"}
                </div>
              ) : (
                <div className="count-list">
                  {Object.entries(finalCounts).map(([cls, n]) => (
                    <div key={cls} className="count-row" style={{ borderLeftColor: classColor(cls) }}>
                      <div className="count-left">
                        <span className="count-icon">{classIcon(cls)}</span>
                        <span className="count-label">{cls}</span>
                      </div>
                      <div className="count-badge" style={{ color: classColor(cls) }}>{n}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="divider" />
            <div className="section-label" style={{ fontSize: 10, marginBottom: 6 }}>Tips</div>
            <ul style={{ paddingLeft: 18, fontSize: 12, color: "var(--text-dim)", lineHeight: 1.9, listStyle: "disc" }}>
              <li>Good lighting helps accuracy</li>
              <li>Multiple images are merged</li>
              <li>Avoid blurry / dark photos</li>
              <li>Video: 10–60 s ideal</li>
            </ul>
          </>
        )}

        <div className="footer">EcoSort AI · v2.0</div>
      </aside>
    </div>
  );
}
import "./ScanMode.css";
import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";

function iou(a, b) {
  const xi1 = Math.max(a[0], b[0]), yi1 = Math.max(a[1], b[1]);
  const xi2 = Math.min(a[2], b[2]), yi2 = Math.min(a[3], b[3]);
  const inter = Math.max(0, xi2 - xi1) * Math.max(0, yi2 - yi1);
  if (inter === 0) return 0;
  const aA = (a[2]-a[0])*(a[3]-a[1]), bA = (b[2]-b[0])*(b[3]-b[1]);
  return inter / (aA + bA - inter);
}
function deduplicateDetections(detections) {
  const kept = [];
  for (const det of detections) {
    const overlap = kept.some(k => k.class === det.class && iou(k.box, det.box) > 0.45);
    if (!overlap) kept.push(det);
  }
  return kept;
}

const CLASS_COLORS = ["#00ff96","#ff6b6b","#ffd700","#a78bfa","#38bdf8","#fb923c","#f472b6","#4ade80","#facc15","#60a5fa"];
const colorCache = {}; let colorIdx = 0;
function classColor(cls) {
  if (!colorCache[cls]) colorCache[cls] = CLASS_COLORS[colorIdx++ % CLASS_COLORS.length];
  return colorCache[cls];
}
const CLASS_ICONS = { plastic:"♻️", glass:"🍶", metal:"🥫", paper:"📄", cardboard:"📦", organic:"🌿", "medical-waste":"🩺", default:"🔍" };
function classIcon(cls) { return CLASS_ICONS[cls?.toLowerCase()] || CLASS_ICONS.default; }

export default function ScanMode() {
  const navigate = useNavigate();
  const { setScanResults } = useApp();

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
  const [error,        setError]        = useState(null);
  const lastFrameTime = useRef(Date.now());

  const startCamera = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      videoRef.current.srcObject = stream;
      setTrackedIds({});
      setUniqueCounts({});
      setDetections([]);
      setLiveCounts({});
      activeRef.current = true;
      setIsRunning(true);
    } catch {
      setError("Camera access denied. Please allow camera permissions.");
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
    const counts = uniqueCountsRef.current;
    stopCamera();
    setScanResults({ ...counts });
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
        const fd = new FormData();
        fd.append("file", blob);
        const res  = await fetch("http://127.0.0.1:8000/detect", { method: "POST", body: fd });
        const data = await res.json();
        if (!activeRef.current) return;

        const deduped = deduplicateDetections(data.detections || []);
        setDetections(deduped);
        setLiveCounts(data.counts || {});

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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const video = videoRef.current;
    if (video && video.readyState >= 2) ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    if (!detections || detections.length === 0) return;

    detections.forEach(det => {
      const [x1, y1, x2, y2] = det.box;
      const color = classColor(det.class);
      const w = x2 - x1, h = y2 - y1;

      ctx.shadowColor = color; ctx.shadowBlur = 20;
      ctx.strokeStyle = color; ctx.lineWidth = 2;
      ctx.strokeRect(x1, y1, w, h);

      const cs = Math.min(w, h, 24); ctx.lineWidth = 4;
      [[x1,y1,1,1],[x2,y1,-1,1],[x1,y2,1,-1],[x2,y2,-1,-1]].forEach(([cx,cy,dx,dy]) => {
        ctx.beginPath(); ctx.moveTo(cx+dx*cs,cy); ctx.lineTo(cx,cy); ctx.lineTo(cx,cy+dy*cs); ctx.stroke();
      });
      ctx.shadowBlur = 0;

      const FSIZ = 16;
      const labelText = det.class.toUpperCase() + "  " + (det.confidence * 100).toFixed(0) + "%";
      ctx.font = "bold " + FSIZ + "px 'Space Mono', monospace";
      const tw = ctx.measureText(labelText).width;
      const bh = FSIZ + 12, pad = 10;
      const badgeY = y1 >= bh + 4 ? y1 : y1 + bh + 2;

      ctx.shadowColor = color; ctx.shadowBlur = 10; ctx.fillStyle = color;
      ctx.beginPath(); ctx.roundRect(x1, badgeY - bh, tw + pad * 2, bh, [5,5,5,0]); ctx.fill();
      ctx.shadowBlur = 0; ctx.fillStyle = "#000000";
      ctx.font = "bold " + FSIZ + "px 'Space Mono', monospace";
      ctx.fillText(labelText, x1 + pad, badgeY - bh / 2 + FSIZ / 2 - 1);

      if (det.id !== undefined && det.id !== -1) {
        const idTxt = "#" + det.id; const IFS = 11;
        ctx.font = "bold " + IFS + "px 'Space Mono', monospace";
        const iw = ctx.measureText(idTxt).width;
        const ibh = IFS + 8, ipad = 6, ibx = x2 - iw - ipad * 2;
        ctx.fillStyle = "rgba(0,0,0,0.85)"; ctx.strokeStyle = color; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.roundRect(ibx, y1+2, iw+ipad*2, ibh, 4); ctx.fill(); ctx.stroke();
        ctx.fillStyle = color;
        ctx.fillText(idTxt, ibx + ipad, y1 + 2 + ibh / 2 + IFS / 2 - 1);
      }
    });
  }, [detections]);

  const totalDetected   = Object.values(uniqueCounts).reduce((a, b) => a + b, 0);
  const detectedClasses = Object.keys(uniqueCounts);
  const canProcess = detectedClasses.length > 0;

  return (
    <div className="scan-root">
      {/* ── Camera panel ── */}
      <div className="camera-panel">
        <div className="cam-wrapper">
          <video ref={videoRef} autoPlay playsInline muted className="cam-video" />
          <canvas ref={canvasRef} className="cam-canvas" />
          {isRunning && <div className="scan-line-wrapper"><div className="scan-line" /></div>}
          {isRunning && <div className="fps-badge">{fps} FPS</div>}
          {!isRunning && (
            <div className="cam-idle">
              <div className="idle-orb">
                <span className="idle-orb-inner">♻</span>
              </div>
              <div className="idle-text">
                AWAITING CAMERA FEED
                <div className="idle-sub">Press START DETECTING to begin</div>
              </div>
            </div>
          )}
        </div>

        {detectedClasses.length > 0 && (
          <div className="live-pills">
            {detectedClasses.map(cls => (
              <span key={cls} className="pill" style={{ borderColor: classColor(cls), color: classColor(cls) }}>
                {classIcon(cls)} {cls}
              </span>
            ))}
          </div>
        )}
        {error && <div className="error-banner">{error}</div>}
      </div>

      {/* ── Side panel ── */}
      <aside className="side-panel">
        <div className="brand">
          <div className="brand-icon-wrap">♻</div>
          <div>
            <div className="brand-name">ECO<span>SORT</span></div>
            <div className="brand-sub">Detection System</div>
          </div>
        </div>

        <div className="divider" />

        <div className={`status-row ${isRunning ? "active" : ""}`}>
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

        <div className="footer">EcoSort AI · v2.0</div>
      </aside>
    </div>
  );
}
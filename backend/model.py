from ultralytics import YOLO
import os


# ── Locate best.pt by walking up from this file's location ───────────────────
# Works whether model.py is in:  root/model.py  OR  root/backend/model.py
def _find_model(filename="best.pt"):
    current = os.path.dirname(os.path.abspath(__file__))
    for _ in range(5):          # search up to 5 parent levels
        candidate = os.path.join(current, filename)
        if os.path.isfile(candidate):
            return candidate
        current = os.path.dirname(current)
    raise FileNotFoundError(
        f"\n\n[EcoSort] Could not find '{filename}'.\n"
        f"  Searched up from: {os.path.dirname(os.path.abspath(__file__))}\n"
        "  Make sure best.pt is in the project root folder."
    )

MODEL_PATH = _find_model("best.pt")
print(f"[EcoSort] ✅ Loaded model from: {MODEL_PATH}")

model = YOLO(MODEL_PATH)


def detect_frame(frame):
    results = model.track(frame, persist=True)

    detections = []

    for r in results:
        if r.boxes is None:
            continue

        for box in r.boxes:
            cls   = int(box.cls[0])
            conf  = float(box.conf[0])
            label = model.names[cls]
            coords = list(map(int, box.xyxy[0].tolist()))

            track_id = -1
            if hasattr(box, "id") and box.id is not None:
                track_id = int(box.id[0])

            detections.append({
                "class":      label,
                "confidence": round(conf, 2),
                "box":        coords,
                "id":         track_id,
            })

    counts = count_objects(detections)
    return detections, counts


# ── IoU ──────────────────────────────────────────────────────────────────────
def calculate_iou(box1, box2):
    x1, y1, x2, y2 = box1
    x1b, y1b, x2b, y2b = box2
    xi1 = max(x1, x1b);  yi1 = max(y1, y1b)
    xi2 = min(x2, x2b);  yi2 = min(y2, y2b)
    inter = max(0, xi2 - xi1) * max(0, yi2 - yi1)
    if inter == 0:
        return 0
    area1 = (x2 - x1) * (y2 - y1)
    area2 = (x2b - x1b) * (y2b - y1b)
    union = area1 + area2 - inter
    return inter / union if union > 0 else 0


# ── Count unique tracked objects in the current frame ────────────────────────
def count_objects(detections):
    seen: dict[str, set] = {}
    for d in detections:
        label    = d["class"]
        track_id = d.get("id", -1)
        if track_id is None or track_id == -1:
            continue
        seen.setdefault(label, set()).add(track_id)
    return {cls: len(ids) for cls, ids in seen.items()}
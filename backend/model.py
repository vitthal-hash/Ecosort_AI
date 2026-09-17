import os
import torch
from ultralytics import YOLO

# Keep BLAS/torch thread usage low — multi-threaded ops can spike memory
# and CPU contention on small instances (e.g. Render's 512Mi tier).
torch.set_num_threads(1)


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
    """
    Runs detection on a single, independent frame/image.

    NOTE: Uses model.predict() rather than model.track(). Tracking (ByteTrack/
    BoT-SORT) is for associating objects across a continuous sequence of
    frames (e.g. video). Since /detect receives one standalone image per
    request with no relationship to previous requests, tracking adds memory
    and compute overhead for no benefit — predict() is the correct tool here.
    """
    results = model.predict(
        frame,
        imgsz=320,
        device="cpu",
        verbose=False,
    )

    detections = []

    for r in results:
        if r.boxes is None:
            continue

        for box in r.boxes:
            cls    = int(box.cls[0])
            conf   = float(box.conf[0])
            label  = model.names[cls]
            coords = list(map(int, box.xyxy[0].tolist()))

            detections.append({
                "class":      label,
                "confidence": round(conf, 2),
                "box":        coords,
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


# ── Count detections per class in the current frame ──────────────────────────
# Without persistent tracking across frames, "counts" simply means how many
# detected boxes of each class appeared in this single image.
def count_objects(detections):
    counts: dict[str, int] = {}
    for d in detections:
        label = d["class"]
        counts[label] = counts.get(label, 0) + 1
    return counts
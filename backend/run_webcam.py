import cv2
import time
from model import detect_frame, count_objects

cap = cv2.VideoCapture(0)

print("EcoSort AI Running... Press 'q' to quit\n")

# -------- SYSTEM STATE --------
state = "LIVE"   # LIVE → FROZEN

buffer_counts = []
freeze_counts = None

start_time = time.time()
STABILIZATION_TIME = 2  # seconds


def counts_are_stable(buffer):
    if len(buffer) < 3:
        return False

    return all(c == buffer[0] for c in buffer)


while True:
    ret, frame = cap.read()
    if not ret:
        break

    results, detections = detect_frame(frame)
    counts = count_objects(detections)

    annotated = results[0].plot()

    # -------- LIVE STATE --------
    if state == "LIVE":

        buffer_counts.append(counts)

        # keep only last few frames
        if len(buffer_counts) > 5:
            buffer_counts.pop(0)

        # check stability
        if time.time() - start_time > STABILIZATION_TIME:
            if counts_are_stable(buffer_counts) and counts:
                freeze_counts = counts
                state = "FROZEN"

                print("\n=== FROZEN DETECTION ===")
                print(freeze_counts)

                freeze_start = time.time()

            buffer_counts = []
            start_time = time.time()

    # -------- FROZEN STATE --------
    elif state == "FROZEN":

        # Display frozen counts on screen
        y_offset = 30
        for label, count in freeze_counts.items():
            text = f"{label}: {count}"

            cv2.putText(
                annotated,
                text,
                (10, y_offset),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.8,
                (0, 0, 255),
                3
            )
            y_offset += 40

        # simulate processing time (later UI will replace this)
        if time.time() - freeze_start > 3:
            print("\nResuming detection...\n")
            state = "LIVE"
            start_time = time.time()

    # -------- DISPLAY --------
    cv2.imshow("EcoSort AI", annotated)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
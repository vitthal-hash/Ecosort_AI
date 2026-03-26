from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from model import detect_frame
from dotenv import load_dotenv
from gemini_api import router as gemini_router
import numpy as np
import cv2

app = FastAPI()
app.include_router(gemini_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/detect")
async def detect(file: UploadFile = File(...)):
    contents = await file.read()
    np_arr   = np.frombuffer(contents, np.uint8)
    frame    = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    detections, counts = detect_frame(frame)
    return {"detections": detections, "counts": counts}
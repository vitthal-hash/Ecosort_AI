from fastapi import APIRouter
from google import genai
import os
from dotenv import load_dotenv

load_dotenv()  # load .env

router = APIRouter()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

@router.post("/chat")
def chat(data: dict):
    prompt = data.get("prompt", "")

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )

        return {
            "reply": response.text
        }

    except Exception as e:
        return {"error": str(e)}
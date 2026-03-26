from fastapi import APIRouter
from google import genai

router = APIRouter()

client = genai.Client(api_key="AIzaSyAlzdAgswNQ80CfMxAZ7FtpduDJ9Wh5qew")

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
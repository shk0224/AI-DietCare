import os
import json
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def generate_diet_plan(
    age: int,
    height_cm: float,
    weight_kg: float,
    gender: str,
    activity_level: str,
    goal: str,
    daily_calories: int,
    protein_target_g: int,
    preferences: list[str] | None = None
) -> dict:
    pref_text = ", ".join(preferences) if preferences else "none"

    prompt = f"""
You are a nutrition assistant. Provide general wellness info, NOT medical advice.

User profile:
- age: {age}
- height_cm: {height_cm}
- weight_kg: {weight_kg}
- gender: {gender}
- activity_level: {activity_level}
- goal: {goal}

Targets:
- daily_calories: {daily_calories}
- protein_target_g: {protein_target_g}

Preferences/constraints: {pref_text}

Return ONLY valid JSON with EXACTLY these keys:
- "daily_calories" (number)
- "protein_target_g" (number)
- "breakfast" (array of 2-3 items)
- "lunch" (array of 2-3 items)
- "dinner" (array of 2-3 items)
- "snacks" (array of 2-3 items)
- "hydration" (array of 2 items)
- "avoid_foods" (array of 3 items)
- "notes" (array of 3 short tips)
- "disclaimer" (string, 1 line)

Rules:
- Keep items short and practical.
- No supplement advice.
- No disease claims.
- No extra keys.
- No markdown.
"""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You provide general diet guidance, not medical advice."},
            {"role": "user", "content": prompt}
        ],
    )

    content = (response.choices[0].message.content or "").strip()

    try:
        data = json.loads(content)
        return data
    except Exception:
        return {
            "daily_calories": daily_calories,
            "protein_target_g": protein_target_g,
            "breakfast": [],
            "lunch": [],
            "dinner": [],
            "snacks": [],
            "hydration": [],
            "avoid_foods": [],
            "notes": [],
            "disclaimer": "General wellness info only. For medical conditions, consult a qualified clinician."
        }
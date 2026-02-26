from fastapi import FastAPI
from pydantic import BaseModel

from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from functions.body_metrics import (
    calculate_bmi,
    calculate_bmr_mifflin,
    calculate_tdee,
    apply_goal,
    protein_target
)

from functions.usda_food import search_food, get_food_details
from functions.diet_guidance import generate_diet_plan


app = FastAPI()

# Serve UI
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/ui")
def ui():
    return FileResponse("static/index.html")


class DietInput(BaseModel):
    age: int
    height_cm: float
    weight_kg: float
    gender: str
    activity_level: str
    goal: str
    preferences: list[str] = []


class FoodSearchInput(BaseModel):
    query: str
    page_size: int = 5


@app.get("/")
def root():
    return {"message": "Diet API running. Open /docs or /ui"}


@app.post("/food/search")
def food_search(data: FoodSearchInput):
    results = search_food(data.query, page_size=data.page_size)
    return {"query": data.query, "results": results}


@app.get("/food/{fdc_id}")
def food_details(fdc_id: int):
    details = get_food_details(fdc_id)
    return details


@app.post("/diet/plan")
def diet_plan(data: DietInput):
    bmi_value = calculate_bmi(data.height_cm, data.weight_kg)

    bmr_value = calculate_bmr_mifflin(
        age=data.age,
        height_cm=data.height_cm,
        weight_kg=data.weight_kg,
        gender=data.gender
    )

    tdee_value = calculate_tdee(bmr_value, data.activity_level)

    calories_target = apply_goal(tdee_value, data.goal)
    protein_target_g = protein_target(data.weight_kg, data.goal)

    ai_plan = generate_diet_plan(
        age=data.age,
        height_cm=data.height_cm,
        weight_kg=data.weight_kg,
        gender=data.gender,
        activity_level=data.activity_level,
        goal=data.goal,
        daily_calories=calories_target,
        protein_target_g=protein_target_g,
        preferences=data.preferences
    )

    return {
        "bmi": bmi_value,
        "bmr": bmr_value,
        "tdee": tdee_value,
        "daily_calories_target": calories_target,
        "protein_target_g": protein_target_g,
        "ai_plan": ai_plan,
        "disclaimer": "General wellness info only. Not medical advice."
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app_diet:app", host="0.0.0.0", port=8080, reload=True)
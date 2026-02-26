import os
import requests
from dotenv import load_dotenv

load_dotenv()

USDA_API_KEY = (os.getenv("USDA_API_KEY") or "").strip()
BASE_URL = "https://api.nal.usda.gov/fdc/v1"


def _ensure_usda_key():
    if not USDA_API_KEY:
        raise ValueError("USDA_API_KEY missing. Please add USDA_API_KEY in .env")


def search_food(query: str, page_size: int = 5) -> list[dict]:
    _ensure_usda_key()

    url = f"{BASE_URL}/foods/search"
    params = {"api_key": USDA_API_KEY}

    payload = {
        "query": query,
        "pageSize": page_size,
        "pageNumber": 1
    }

    response = requests.post(url, params=params, json=payload, timeout=15)
    response.raise_for_status()
    data = response.json()

    foods = data.get("foods", [])
    results = []

    for f in foods:
        results.append({
            "fdcId": f.get("fdcId"),
            "description": f.get("description"),
            "dataType": f.get("dataType"),
            "brandOwner": f.get("brandOwner"),
            "foodCategory": f.get("foodCategory"),
        })

    return results


def get_food_details(fdc_id: int) -> dict:
    _ensure_usda_key()

    url = f"{BASE_URL}/food/{fdc_id}"
    params = {"api_key": USDA_API_KEY}

    response = requests.get(url, params=params, timeout=15)
    response.raise_for_status()
    data = response.json()

    nutrients = {}
    food_nutrients = data.get("foodNutrients", [])

    for item in food_nutrients:
        nutrient = item.get("nutrient", {})
        name = (nutrient.get("name") or "").strip().lower()
        unit = (nutrient.get("unitName") or "").strip()
        amount = item.get("amount", None)

        if amount is None:
            continue

        # MVP: common nutrients
        if name in [
            "energy",
            "protein",
            "carbohydrate, by difference",
            "total lipid (fat)",
            "fiber, total dietary"
        ]:
            nutrients[name] = {"value": amount, "unit": unit}

    result = {
        "fdcId": data.get("fdcId"),
        "description": data.get("description"),
        "dataType": data.get("dataType"),
        "brandOwner": data.get("brandOwner"),
        "ingredients": data.get("ingredients"),
        "nutrients": nutrients,
    }
    return result
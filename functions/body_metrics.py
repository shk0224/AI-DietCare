def calculate_bmi(height_cm: float, weight_kg: float) -> float:
    height_m = height_cm / 100.0
    if height_m <= 0:
        return 0.0

    bmi_value = weight_kg / (height_m * height_m)
    bmi_rounded = round(bmi_value, 2)
    return bmi_rounded


def calculate_bmr_mifflin(age: int, height_cm: float, weight_kg: float, gender: str) -> float:
    base = (10.0 * weight_kg) + (6.25 * height_cm) - (5.0 * age)

    gender_lower = (gender or "").strip().lower()
    gender_adjustment = -161.0
    if gender_lower == "male":
        gender_adjustment = 5.0

    bmr_value = base + gender_adjustment
    bmr_rounded = round(bmr_value, 2)
    return bmr_rounded


def get_activity_multiplier(activity_level: str) -> float:
    level = (activity_level or "").strip().lower()

    if level in ["sedentary", "low"]:
        return 1.2
    if level in ["light", "lightly active"]:
        return 1.375
    if level in ["moderate", "moderately active"]:
        return 1.55
    if level in ["high", "very active"]:
        return 1.725
    if level in ["athlete", "extra active"]:
        return 1.9

    return 1.2


def calculate_tdee(bmr: float, activity_level: str) -> float:
    multiplier = get_activity_multiplier(activity_level)
    tdee_value = bmr * multiplier
    tdee_rounded = round(tdee_value, 2)
    return tdee_rounded


def apply_goal(tdee: float, goal: str) -> int:
    g = (goal or "").strip().lower()

    calories_value = tdee
    if g in ["loss", "weight loss", "fat loss", "lose"]:
        calories_value = tdee - 400.0
    elif g in ["gain", "weight gain", "bulk", "gaining"]:
        calories_value = tdee + 300.0

    if calories_value < 1200:
        calories_value = 1200

    calories_int = int(round(calories_value, 0))
    return calories_int


def protein_target(weight_kg: float, goal: str) -> int:
    g = (goal or "").strip().lower()

    grams_per_kg = 1.6
    if g in ["gain", "weight gain", "bulk", "gaining"]:
        grams_per_kg = 1.8
    elif g in ["loss", "weight loss", "fat loss", "lose"]:
        grams_per_kg = 1.7

    protein_value = weight_kg * grams_per_kg
    protein_int = int(round(protein_value, 0))
    return protein_int
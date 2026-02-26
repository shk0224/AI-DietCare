// ========= helpers =========
const $ = (sel) => document.querySelector(sel);

function setStatus(el, msg, ok = true) {
  if (!el) return;
  el.textContent = msg || "";
  el.classList.remove("ok", "err");
  if (msg) el.classList.add(ok ? "ok" : "err");
}

function show(el, on = true) {
  if (!el) return;
  el.classList.toggle("hidden", !on);
}

function safeNumber(n) {
  const x = Number(n);
  return Number.isFinite(x) ? x : null;
}

function bmiTag(bmi) {
  if (bmi === null) return { label: "—", cls: "" };
  if (bmi < 18.5) return { label: "Underweight", cls: "tag-warn" };
  if (bmi < 25) return { label: "Normal", cls: "tag-ok" };
  if (bmi < 30) return { label: "Overweight", cls: "tag-warn" };
  return { label: "Obese", cls: "tag-err" };
}

function toList(el, items) {
  if (!el) return;
  el.innerHTML = "";
  if (!items || !Array.isArray(items) || items.length === 0) {
    const li = document.createElement("li");
    li.textContent = "—";
    el.appendChild(li);
    return;
  }
  for (const it of items) {
    const li = document.createElement("li");
    li.textContent = String(it);
    el.appendChild(li);
  }
}

function prettyGoal(g) {
  if (!g) return "—";
  if (g === "loss") return "Lose weight";
  if (g === "maintain") return "Maintain";
  if (g === "gain") return "Gain muscle";
  return String(g);
}

// ========= Diet Plan rendering =========
let lastDietJson = null;

function renderDiet(resp) {
  lastDietJson = resp;

  const dietSummary = $("#dietSummary");
  const dietActions = $("#dietActions");
  const mealSections = $("#mealSections");
  const rawBlock = $("#rawBlock");
  const dietRaw = $("#dietRaw");

  // Some APIs return:
  //  A) { bmi,bmr,tdee,daily_calories_target,protein_target_g, ai_plan:{breakfast:[],...} }
  //  B) { ai_plan:{ daily_calories, protein_target_g, breakfast:[], ... } } (and maybe no top-level bmi)
  const plan = resp?.ai_plan ?? resp ?? {};
  const bmi = safeNumber(resp?.bmi ?? plan?.bmi);
  const bmr = safeNumber(resp?.bmr ?? plan?.bmr);
  const tdee = safeNumber(resp?.tdee ?? plan?.tdee);

  const calories =
    safeNumber(resp?.daily_calories_target) ??
    safeNumber(plan?.daily_calories) ??
    safeNumber(plan?.daily_calories_target);

  const protein =
    safeNumber(resp?.protein_target_g) ??
    safeNumber(plan?.protein_target_g);

  // summary cards
  show(dietSummary, true);
  show(dietActions, true);
  show(mealSections, true);
  show(rawBlock, true);

  // BMI
  const bmiEl = $("#bmiValue");
  const bmiTagEl = $("#bmiTag");
  const tag = bmiTag(bmi);
  bmiEl.textContent = bmi !== null ? bmi.toFixed(1) : "—";
  bmiTagEl.textContent = tag.label;
  bmiTagEl.className = `mini-sub ${tag.cls}`;

  // calories + protein
  $("#calValue").textContent = calories !== null ? String(Math.round(calories)) : "—";
  $("#proValue").textContent = protein !== null ? String(Math.round(protein)) : "—";

  // goal + tdee
  const selectedGoal = $("#goal")?.value || "";
  $("#goalValue").textContent = prettyGoal(selectedGoal);
  const tdeeLine = [];
  if (bmr !== null) tdeeLine.push(`BMR: ${Math.round(bmr)}`);
  if (tdee !== null) tdeeLine.push(`TDEE: ${Math.round(tdee)}`);
  $("#tdeeLine").textContent = tdeeLine.length ? tdeeLine.join(" • ") : "—";

  // meals
  toList($("#mealBreakfast"), plan?.breakfast);
  toList($("#mealLunch"), plan?.lunch);
  toList($("#mealDinner"), plan?.dinner);
  toList($("#mealSnacks"), plan?.snacks);
  toList($("#mealHydration"), plan?.hydration);

  // notes: try common keys
  const notes =
    plan?.notes ??
    plan?.tips ??
    plan?.guidance ??
    resp?.disclaimer
      ? [resp.disclaimer]
      : null;

  toList($("#mealNotes"), Array.isArray(notes) ? notes : (notes ? [notes] : ["General wellness guidance only."]));

  // raw json
  dietRaw.textContent = JSON.stringify(resp, null, 2);
}

async function submitDiet(e) {
  e.preventDefault();

  const dietStatus = $("#dietStatus");
  setStatus(dietStatus, "Generating plan...");

  // Hide old output until new arrives
  show($("#dietSummary"), false);
  show($("#dietActions"), false);
  show($("#mealSections"), false);
  show($("#rawBlock"), false);

  const payload = {
    age: Number($("#age").value),
    height_cm: Number($("#height_cm").value),
    weight_kg: Number($("#weight_kg").value),
    gender: $("#gender").value,
    activity_level: $("#activity_level").value,
    goal: $("#goal").value,
    preferences: String($("#preferences").value || "")
      .split(",")
      .map(s => s.trim())
      .filter(Boolean)
  };

  try {
    const res = await fetch("/diet/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const txt = await res.text();
      setStatus(dietStatus, `Error: ${res.status} ${res.statusText}`, false);
      // show raw for debugging
      show($("#rawBlock"), true);
      $("#dietRaw").textContent = txt;
      return;
    }

    const data = await res.json();
    setStatus(dietStatus, "Success ✅");
    renderDiet(data);
  } catch (err) {
    setStatus(dietStatus, `Network/Server error: ${String(err)}`, false);
  }
}

// Copy + Download
function initDietActions() {
  const copyBtn = $("#copyPlanBtn");
  const downloadBtn = $("#downloadJsonBtn");

  copyBtn?.addEventListener("click", async () => {
    if (!lastDietJson) return;
    const plan = lastDietJson?.ai_plan ?? lastDietJson;
    const lines = [];

    const bmi = safeNumber(lastDietJson?.bmi ?? plan?.bmi);
    const calories =
      safeNumber(lastDietJson?.daily_calories_target) ??
      safeNumber(plan?.daily_calories) ??
      safeNumber(plan?.daily_calories_target);
    const protein =
      safeNumber(lastDietJson?.protein_target_g) ??
      safeNumber(plan?.protein_target_g);

    lines.push("AI Diet Plan");
    lines.push("----------");
    if (bmi !== null) lines.push(`BMI: ${bmi.toFixed(1)}`);
    if (calories !== null) lines.push(`Daily Calories: ${Math.round(calories)} kcal`);
    if (protein !== null) lines.push(`Protein Target: ${Math.round(protein)} g`);
    lines.push("");

    const addMeal = (title, arr) => {
      if (!arr || !Array.isArray(arr) || arr.length === 0) return;
      lines.push(title);
      for (const it of arr) lines.push(`- ${it}`);
      lines.push("");
    };

    addMeal("Breakfast", plan?.breakfast);
    addMeal("Lunch", plan?.lunch);
    addMeal("Dinner", plan?.dinner);
    addMeal("Snacks", plan?.snacks);
    addMeal("Hydration", plan?.hydration);

    const text = lines.join("\n");

    try {
      await navigator.clipboard.writeText(text);
      alert("Copied ✅");
    } catch {
      alert("Copy failed (browser permission).");
    }
  });

  downloadBtn?.addEventListener("click", () => {
    if (!lastDietJson) return;
    const blob = new Blob([JSON.stringify(lastDietJson, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "diet_plan.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });
}

// ========= Food Search rendering =========
function clearFoodDetails() {
  $("#foodTitle").textContent = "Click a result to view nutrients";
  $("#nutriGrid").innerHTML = "";
  show($("#foodDetailsRaw"), false);
  $("#foodDetailsRaw").textContent = "";
}

function nutrientFrom(details, keys) {
  // details.foodNutrients: array of nutrient objects
  const arr = details?.foodNutrients;
  if (!Array.isArray(arr)) return null;

  const normalized = arr.map(n => {
    const name = (n?.nutrient?.name ?? n?.nutrientName ?? "").toLowerCase();
    const unit = (n?.nutrient?.unitName ?? n?.unitName ?? "").toLowerCase();
    const value = n?.amount ?? n?.value ?? null;
    return { name, unit, value };
  });

  for (const key of keys) {
    const k = key.toLowerCase();
    const found = normalized.find(n => n.name.includes(k));
    if (found && found.value !== null && found.value !== undefined) return found;
  }
  return null;
}

function addNutriCard(label, value, unit) {
  const grid = $("#nutriGrid");
  const div = document.createElement("div");
  div.className = "nutri-item";
  div.innerHTML = `
    <div class="nutri-label">${label}</div>
    <div class="nutri-value">${value ?? "—"} <span class="nutri-unit">${unit ?? ""}</span></div>
  `;
  grid.appendChild(div);
}

function renderFoodDetails(details) {
  const desc = details?.description ?? "Food";
  const dt = details?.dataType ?? "";
  const cat = details?.foodCategory ?? details?.foodCategory?.description ?? "";
  $("#foodTitle").textContent = `${desc}${dt ? ` • ${dt}` : ""}${cat ? ` • ${cat}` : ""}`;

  $("#nutriGrid").innerHTML = "";

  const energy = nutrientFrom(details, ["energy"]);
  const protein = nutrientFrom(details, ["protein"]);
  const carbs = nutrientFrom(details, ["carbohydrate"]);
  const fat = nutrientFrom(details, ["total lipid", "fat"]);
  const fiber = nutrientFrom(details, ["fiber"]);
  const sugar = nutrientFrom(details, ["sugars"]);
  const sodium = nutrientFrom(details, ["sodium"]);

  addNutriCard("Calories", energy ? Math.round(energy.value) : null, energy?.unit || "kcal");
  addNutriCard("Protein", protein ? Math.round(protein.value) : null, protein?.unit || "g");
  addNutriCard("Carbs", carbs ? Math.round(carbs.value) : null, carbs?.unit || "g");
  addNutriCard("Fat", fat ? Math.round(fat.value) : null, fat?.unit || "g");
  addNutriCard("Fiber", fiber ? Math.round(fiber.value) : null, fiber?.unit || "g");
  addNutriCard("Sugar", sugar ? Math.round(sugar.value) : null, sugar?.unit || "g");
  addNutriCard("Sodium", sodium ? Math.round(sodium.value) : null, sodium?.unit || "mg");

  // raw (optional debugging)
  $("#foodDetailsRaw").textContent = JSON.stringify(details, null, 2);
}

async function fetchFoodDetails(fdcId) {
  const foodStatus = $("#foodStatus");
  setStatus(foodStatus, "Loading details...");
  clearFoodDetails();

  try {
    const res = await fetch(`/food/${encodeURIComponent(fdcId)}`);
    if (!res.ok) {
      const txt = await res.text();
      setStatus(foodStatus, `Error loading details: ${res.status}`, false);
      show($("#foodDetailsRaw"), true);
      $("#foodDetailsRaw").textContent = txt;
      return;
    }
    const details = await res.json();
    setStatus(foodStatus, "Details loaded ✅");
    renderFoodDetails(details);
    // show raw only if you want: keep hidden by default
    // show($("#foodDetailsRaw"), true);
  } catch (err) {
    setStatus(foodStatus, `Network/Server error: ${String(err)}`, false);
  }
}

function renderFoodResults(items) {
  const ul = $("#foodResults");
  ul.innerHTML = "";

  if (!items || items.length === 0) {
    const li = document.createElement("li");
    li.className = "list-item";
    li.textContent = "No results found.";
    ul.appendChild(li);
    return;
  }

  for (const it of items) {
    const li = document.createElement("li");
    li.className = "list-item";
    const desc = it?.description ?? "Item";
    const fdcId = it?.fdcId ?? "";
    const dt = it?.dataType ?? "";
    const brand = it?.brandOwner ?? "";
    const cat = it?.foodCategory ?? "";

    li.innerHTML = `
      <div class="li-title">${desc}</div>
      <div class="li-sub">
        <span class="pill">${dt || "Food"}</span>
        <span class="muted">fdcId: ${fdcId}</span>
        ${brand ? `<span class="muted">• brand: ${brand}</span>` : ""}
        ${cat ? `<span class="muted">• ${cat}</span>` : ""}
      </div>
    `;

    li.addEventListener("click", () => fetchFoodDetails(fdcId));
    ul.appendChild(li);
  }
}

async function submitFood(e) {
  e.preventDefault();

  const foodStatus = $("#foodStatus");
  setStatus(foodStatus, "Searching...");
  clearFoodDetails();

  const query = $("#foodQuery").value;
  const pageSize = Number($("#pageSize").value || 5);
  const commonOnly = $("#commonOnly").checked;

  const payload = { query, page_size: pageSize };

  try {
    const res = await fetch("/food/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const txt = await res.text();
      setStatus(foodStatus, `Error: ${res.status} ${res.statusText}`, false);
      return;
    }

    const data = await res.json();
    let results = data?.results ?? [];

    // optional filter: hide branded
    if (commonOnly) {
      results = results.filter(r => String(r?.dataType || "").toLowerCase() !== "branded");
    }

    setStatus(foodStatus, `Search done ✅ (click an item for details)`);
    renderFoodResults(results);
  } catch (err) {
    setStatus(foodStatus, `Network/Server error: ${String(err)}`, false);
  }
}

// ========= init =========
window.addEventListener("DOMContentLoaded", () => {
  $("#dietForm")?.addEventListener("submit", submitDiet);
  $("#foodForm")?.addEventListener("submit", submitFood);
  initDietActions();
  clearFoodDetails();
});
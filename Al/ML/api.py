from fastapi import FastAPI, HTTPException
from pathlib import Path
from typing import Optional
import pandas as pd
import joblib
import math

from pydantic import BaseModel
import numpy as np

app = FastAPI(
    title="AI Dengue Prediction API",
    description="Predict dengue cases 2, 3 and 4 weeks ahead.",
    version="1.0"
)

BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR / "models"
DATA_DIR = BASE_DIR / "data"

models = {}
for horizon in [2, 3, 4]:
    model_path = MODEL_DIR / f"dengue_model_{horizon}w.joblib"
    if model_path.exists():
        models[horizon] = joblib.load(model_path)
    else:
        print(f"WARNING: Missing model {model_path}")

for package in models.values():
    package["risk_thresholds"][0.50] = 1.0

candidate_files = [
    DATA_DIR / "dengue_dataset_final.xlsx",
    DATA_DIR / "bangladesh_dengue_large_dataset_onsite.xlsx",
    DATA_DIR / "dengue_dataset.xlsx",
]
DATA_PATH = next((p for p in candidate_files if p.exists()), candidate_files[-1])
print("Loading dataset from:", DATA_PATH.name)

df = pd.read_excel(DATA_PATH) if DATA_PATH.suffix == ".xlsx" else pd.read_csv(DATA_PATH)
df["date"] = pd.to_datetime(df["date"])
df = df.sort_values(["ward_id", "date"]).copy()

if "hospital_beds_required" not in df.columns:
    df["hospital_beds_required"] = (df["dengue_cases"] * 0.29).round().astype(int)

for i in range(1, 5):
    df[f"rainfall_lag_{i}"] = df.groupby("ward_id")["rainfall_mm"].shift(i)

for weeks in [2, 3, 4]:
    df[f"rainfall_prev_{weeks}w_sum"] = (
        df.groupby("ward_id")["rainfall_mm"]
        .transform(lambda s: s.shift(1).rolling(weeks).sum())
    )

df["temp_lag_1"] = df.groupby("ward_id")["avg_temp_c"].shift(1)
df["humidity_lag_1"] = df.groupby("ward_id")["relative_humidity_pct"].shift(1)

for i in range(1, 5):
    df[f"dengue_cases_lag_{i}"] = df.groupby("ward_id")["dengue_cases"].shift(i)

all_dates = sorted(df["date"].dt.strftime("%Y-%m-%d").unique())[4:]
available_dates = all_dates[-52:]

ward_meta = (
    df[["ward_id", "population_density_sqkm", "sanitation_score"]]
    .drop_duplicates("ward_id")
)

bed_capacity = {
    row["ward_id"]: max(
        1,
        round((float(row["population_density_sqkm"]) / 25000.0) + (float(row["sanitation_score"]) * 3.0))
    )
    for _, row in ward_meta.iterrows()
}

print("Dataset loaded and features prepared!")
print("Available wards:", df["ward_id"].nunique())


def build_drivers(row):
    rain_now = float(row["rainfall_mm"])
    rain_4w = float(row["rainfall_prev_4w_sum"])
    humidity = float(row["relative_humidity_pct"])
    water_log = float(row["water_logging_risk_index"])
    temp = float(row["avg_temp_c"])
    density = int(row["population_density_sqkm"])
    sanitation = float(row["sanitation_score"])

    drivers = [
        {
            "factor": "Multi-Week Rainfall",
            "value": f"{rain_now:.1f} mm now | {rain_4w:.1f} mm (prev 4w)",
            "score": min(100, round(((rain_now + rain_4w) / 350) * 100)),
            "impact": "High" if (rain_4w >= 150 or rain_now >= 60) else ("Moderate" if rain_4w >= 50 else "Low"),
            "reason": "Stagnant rainwater over 2-4 weeks drives Aedes mosquito breeding."
        },
        {
            "factor": "Relative Humidity",
            "value": f"{humidity:.1f}%",
            "score": min(100, max(5, round(((humidity - 40) / 55) * 100))),
            "impact": "High" if humidity >= 80 else ("Moderate" if humidity >= 68 else "Low"),
            "reason": "High humidity extends adult mosquito lifespan and biting activity."
        },
        {
            "factor": "Water-Logging Risk",
            "value": f"{water_log:.2f}",
            "score": round(water_log * 100),
            "impact": "High" if water_log >= 0.7 else ("Moderate" if water_log >= 0.45 else "Low"),
            "reason": "Poor drainage traps rainwater in neighborhood drains longer."
        },
        {
            "factor": "Average Temperature",
            "value": f"{temp:.1f} °C",
            "score": min(100, max(10, round(((temp - 15) / 20) * 100))),
            "impact": "High" if (27 <= temp <= 33) else ("Moderate" if temp >= 23 else "Low"),
            "reason": "Warm weather (27-33 °C) speeds up egg hatching and viral incubation."
        },
        {
            "factor": "Ward Vulnerability",
            "value": f"{density:,}/sqkm | Sanitation {sanitation:.2f}",
            "score": min(100, round((density / 75000) * 60 + (1 - sanitation) * 40)),
            "impact": "High" if (density >= 50000 or sanitation <= 0.45) else "Moderate",
            "reason": "High crowding and weaker sanitation speed up local transmission."
        }
    ]
    return sorted(drivers, key=lambda d: d["score"], reverse=True)


@app.get("/")
def home():
    return {
        "message": "AI Dengue Prediction API is running!",
        "available_models": list(models.keys())
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "models_loaded": list(models.keys())
    }


@app.get("/wards")
def get_wards():
    wards = (
        df[["city", "ward_id", "population_density_sqkm", "water_logging_risk_index", "sanitation_score"]]
        .drop_duplicates()
        .sort_values(["city", "ward_id"])
        .to_dict(orient="records")
    )
    return {
        "total_wards": len(wards),
        "latest_date": available_dates[-1] if available_dates else None,
        "available_dates": available_dates,
        "wards": wards
    }


@app.post("/predict/{horizon}")
def predict_dengue(horizon: int, features: dict):
    if horizon not in [2, 3, 4]:
        raise HTTPException(status_code=400, detail="Horizon must be 2, 3 or 4 weeks.")
    if horizon not in models:
        raise HTTPException(status_code=503, detail=f"The {horizon}-week model is not available.")

    model_package = models[horizon]
    model = model_package["model"]
    feature_columns = model_package["features"]
    thresholds = model_package["risk_thresholds"]

    missing_features = [col for col in feature_columns if col not in features]
    if missing_features:
        raise HTTPException(
            status_code=422,
            detail={"message": "Missing required features.", "missing_features": missing_features}
        )

    try:
        input_data = pd.DataFrame([{col: features[col] for col in feature_columns}])
        prediction = max(float(model.predict(input_data)[0]), 0)

        if prediction < thresholds[0.50]:
            risk = "Low"
        elif prediction < thresholds[0.75]:
            risk = "Medium"
        elif prediction < thresholds[0.90]:
            risk = "High"
        else:
            risk = "Critical"

        return {
            "success": True,
            "prediction_horizon": f"{horizon} weeks",
            "predicted_dengue_cases": round(prediction, 2),
            "risk_level": risk,
            "risk_thresholds": thresholds
        }
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))


@app.get("/predict/ward/{ward_id}/{horizon}")
def predict_ward(ward_id: str, horizon: int, date: Optional[str] = None):
    if horizon not in [2, 3, 4]:
        raise HTTPException(status_code=400, detail="Horizon must be 2, 3 or 4 weeks.")
    if horizon not in models:
        raise HTTPException(status_code=503, detail="Requested model is not available.")

    ward_data = df[df["ward_id"] == ward_id].copy()
    if ward_data.empty:
        raise HTTPException(status_code=404, detail="Ward not found.")

    model_package = models[horizon]
    model = model_package["model"]
    feature_columns = model_package["features"]
    thresholds = model_package["risk_thresholds"]

    ward_data = ward_data.dropna(subset=feature_columns).sort_values("date")
    if ward_data.empty:
        raise HTTPException(status_code=422, detail="Not enough historical data for this ward.")

    if date:
        matched = ward_data[ward_data["date"].dt.strftime("%Y-%m-%d") == date]
        if matched.empty:
            raise HTTPException(status_code=404, detail=f"No valid record for ward {ward_id} on {date}.")
        row = matched.iloc[-1]
    else:
        row = ward_data.iloc[-1]

    input_data = pd.DataFrame([{col: row[col] for col in feature_columns}])
    prediction = max(float(model.predict(input_data)[0]), 0)

    if prediction < thresholds[0.50]:
        risk = "Low"
    elif prediction < thresholds[0.75]:
        risk = "Medium"
    elif prediction < thresholds[0.90]:
        risk = "High"
    else:
        risk = "Critical"

    return {
        "success": True,
        "city": row["city"],
        "ward_id": ward_id,
        "data_date": row["date"].strftime("%Y-%m-%d"),
        "current_cases": int(row["dengue_cases"]),
        "prediction_horizon": f"{horizon} weeks",
        "predicted_dengue_cases": round(prediction, 2),
        "risk_level": risk,
        "weather": {
            "avg_temp_c": round(float(row["avg_temp_c"]), 2),
            "rainfall_mm": round(float(row["rainfall_mm"]), 2),
            "relative_humidity_pct": round(float(row["relative_humidity_pct"]), 2),
            "rainfall_lag_1": round(float(row["rainfall_lag_1"]), 2),
            "rainfall_lag_2": round(float(row["rainfall_lag_2"]), 2),
            "rainfall_lag_3": round(float(row["rainfall_lag_3"]), 2),
            "rainfall_lag_4": round(float(row["rainfall_lag_4"]), 2),
            "rainfall_prev_4w_sum": round(float(row["rainfall_prev_4w_sum"]), 2),
        },
        "drivers": build_drivers(row),
        "data_warning": "Prediction uses historical dataset values, not live weather data."
    }


@app.get("/forecast/all")
def forecast_all(horizon: int, date: Optional[str] = None):
    if horizon not in [2, 3, 4]:
        raise HTTPException(status_code=400, detail="Horizon must be 2, 3 or 4 weeks.")
    if horizon not in models:
        raise HTTPException(status_code=503, detail="Requested model is not available.")

    target_date = date or available_dates[-1]
    if target_date not in available_dates:
        raise HTTPException(status_code=404, detail=f"Date {target_date} is not available.")

    model_package = models[horizon]
    model = model_package["model"]
    feature_columns = model_package["features"]
    thresholds = model_package["risk_thresholds"]

    rows = df[df["date"] == pd.Timestamp(target_date)].dropna(subset=feature_columns)
    if rows.empty:
        raise HTTPException(status_code=404, detail="No ward data for this date.")

    predictions = model.predict(rows[feature_columns])

    wards = []
    for (_, row), prediction in zip(rows.iterrows(), predictions):
        value = max(float(prediction), 0)
        if value < thresholds[0.50]:
            risk = "Low"
        elif value < thresholds[0.75]:
            risk = "Medium"
        elif value < thresholds[0.90]:
            risk = "High"
        else:
            risk = "Critical"

        wards.append({
            "ward_id": row["ward_id"],
            "city": row["city"],
            "population_density_sqkm": int(row["population_density_sqkm"]),
            "current_cases": int(row["dengue_cases"]),
            "predicted_cases": round(value, 2),
            "risk_level": risk
        })

    return {
        "success": True,
        "data_date": target_date,
        "horizon_weeks": horizon,
        "total_wards": len(wards),
        "wards": wards,
        "data_warning": "Forecast uses historical dataset values, not live weather data."
    }


@app.get("/capacity")
def get_capacity():
    return {
        "success": True,
        "rule": "Assumed bed capacity per ward = round((population_density_sqkm / 25,000) + (sanitation_score * 3)), minimum 1 bed (documented operational assumption; dataset has no bed capacity column)",
        "capacity": bed_capacity
    }


SALINE_PER_CASE = 2.38
BEDS_PER_CASE = 0.29


class SimulateRequest(BaseModel):
    date: Optional[str] = None
    deployed_crews: dict[str, int] = {}


@app.post("/simulate")
def simulate_vector_control(req: SimulateRequest):
    if not all(h in models for h in [2, 3, 4]):
        raise HTTPException(status_code=503, detail="All 2, 3, and 4-week models must be loaded.")

    target_date = req.date or available_dates[-1]
    if target_date not in available_dates:
        raise HTTPException(status_code=404, detail=f"Date {target_date} is not available.")

    feature_columns = models[2]["features"]
    base_df = (
        df[df["date"] == pd.Timestamp(target_date)]
        .dropna(subset=feature_columns)
        .sort_values(["city", "ward_id"])
        .reset_index(drop=True)
    )
    if base_df.empty:
        raise HTTPException(status_code=404, detail="No ward data for this date.")

    base_preds = {
        h: np.maximum(models[h]["model"].predict(base_df[feature_columns]), 0)
        for h in [2, 3, 4]
    }

    preview_mode = len(req.deployed_crews) == 0
    sim_df = base_df.copy()
    crews_used = []

    for idx, row in sim_df.iterrows():
        wid = row["ward_id"]
        c = 2 if preview_mode else max(0, int(req.deployed_crews.get(wid, 0)))
        crews_used.append(c)
        if c > 0:
            effect = 1.0 - math.exp(-0.30 * c)
            sim_df.at[idx, "water_logging_risk_index"] = max(
                0.05, float(row["water_logging_risk_index"]) * (1.0 - 0.65 * effect)
            )
            sim_df.at[idx, "sanitation_score"] = min(
                1.0, float(row["sanitation_score"]) + (1.0 - float(row["sanitation_score"])) * 0.45 * effect
            )
            sim_df.at[idx, "dengue_cases_lag_1"] = float(row["dengue_cases_lag_1"]) * (1.0 - 0.25 * effect)

    sim_2w = np.maximum(models[2]["model"].predict(sim_df[feature_columns]), 0)

    sim_df_next = sim_df.copy()
    for idx in range(len(sim_df_next)):
        if crews_used[idx] > 0:
            ratio_2w = (sim_2w[idx] / base_preds[2][idx]) if base_preds[2][idx] > 0 else 1.0
            sim_df_next.at[idx, "dengue_cases_lag_1"] = float(sim_df.at[idx, "dengue_cases_lag_1"]) * ratio_2w
            sim_df_next.at[idx, "dengue_cases_lag_2"] = float(sim_df.at[idx, "dengue_cases_lag_2"]) * (0.5 + 0.5 * ratio_2w)

    sim_3w = np.maximum(models[3]["model"].predict(sim_df_next[feature_columns]), 0)
    sim_4w = np.maximum(models[4]["model"].predict(sim_df_next[feature_columns]), 0)
    sim_preds = {2: sim_2w, 3: sim_3w, 4: sim_4w}

    wards_out = []
    for idx, row in base_df.iterrows():
        c = crews_used[idx]
        b2, b3, b4 = float(base_preds[2][idx]), float(base_preds[3][idx]), float(base_preds[4][idx])
        s2, s3, s4 = float(sim_preds[2][idx]), float(sim_preds[3][idx]), float(sim_preds[4][idx])

        base_total = b2 + b3 + b4
        sim_total = s2 + s3 + s4
        prevented = max(0.0, base_total - sim_total)

        base_beds = sum(round(v * BEDS_PER_CASE) for v in (b2, b3, b4))
        sim_beds = sum(round(v * BEDS_PER_CASE) for v in (s2, s3, s4))

        base_saline = sum(round(v * SALINE_PER_CASE) for v in (b2, b3, b4))
        sim_saline = sum(round(v * SALINE_PER_CASE) for v in (s2, s3, s4))

        wards_out.append({
            "ward_id": row["ward_id"],
            "city": row["city"],
            "population_density_sqkm": int(row["population_density_sqkm"]),
            "crews_deployed": c,
            "baseline_cases": {"2w": round(b2, 2), "3w": round(b3, 2), "4w": round(b4, 2), "total": round(base_total, 2)},
            "simulated_cases": {"2w": round(s2, 2), "3w": round(s3, 2), "4w": round(s4, 2), "total": round(sim_total, 2)},
            "cases_prevented": round(prevented, 2),
            "beds_saved": max(0, base_beds - sim_beds),
            "saline_saved": max(0, base_saline - sim_saline),
            "roi_cases_per_crew": round(prevented / c, 2) if c > 0 else 0.0
        })

    wards_out.sort(key=lambda w: (w["roi_cases_per_crew"], w["cases_prevented"]), reverse=True)
    for rank, w in enumerate(wards_out, start=1):
        w["roi_rank"] = rank

    active = wards_out if preview_mode else [w for w in wards_out if w["crews_deployed"] > 0]

    return {
        "success": True,
        "preview_mode": preview_mode,
        "data_date": target_date,
        "assumptions": {
            "intervention_model": "Diminishing-returns vector control curve (effect = 1 - exp(-0.30 * crews)) lowers water_logging_risk_index (up to -65%), improves sanitation_score (up to +45% of gap), and reduces dengue_cases_lag_1 (up to -25%), then propagates 2W case reductions into 3W and 4W RF model lags.",
            "preview_rule": "When deployed_crews is empty, simulates 2 crews per ward across all 60 wards to rank baseline intervention ROI."
        },
        "summary": {
            "total_crews_deployed": sum(w["crews_deployed"] for w in active),
            "total_cases_prevented": round(sum(w["cases_prevented"] for w in active), 2),
            "total_beds_saved": sum(w["beds_saved"] for w in active),
            "total_saline_saved": sum(w["saline_saved"] for w in active)
        },
        "wards": wards_out
    }
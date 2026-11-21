from fastapi import FastAPI, HTTPException
from pathlib import Path
from typing import Optional
import pandas as pd
import joblib

app = FastAPI(
    title="AI Dengue Prediction API",
    description="Predict dengue cases 2, 3 and 4 weeks ahead.",
    version="1.0"
)

BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR / "models"

models = {}
for horizon in [2, 3, 4]:
    model_path = MODEL_DIR / f"dengue_model_{horizon}w.joblib"
    if model_path.exists():
        models[horizon] = joblib.load(model_path)
    else:
        print(f"WARNING: Missing model {model_path}")

# Load dataset and compute per-ward multi-week lags once at startup
DATA_PATH = BASE_DIR / "data" / "dengue_dataset.xlsx"
df = pd.read_excel(DATA_PATH)
df["date"] = pd.to_datetime(df["date"])
df = df.sort_values(["ward_id", "date"]).copy()

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

# Last 52 selectable dates (skips first 4 weeks so lag values are always complete)
all_dates = sorted(df["date"].dt.strftime("%Y-%m-%d").unique())[4:]
available_dates = all_dates[-52:]

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
        "latest_date": available_dates[-1],
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

        if prediction <= thresholds[0.50]:
            risk = "Low"
        elif prediction <= thresholds[0.75]:
            risk = "Medium"
        elif prediction <= thresholds[0.90]:
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

    if prediction <= thresholds[0.50]:
        risk = "Low"
    elif prediction <= thresholds[0.75]:
        risk = "Medium"
    elif prediction <= thresholds[0.90]:
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
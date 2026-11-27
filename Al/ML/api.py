
from fastapi import FastAPI, HTTPException
from pathlib import Path
from typing import Optional
import pandas as pd
import joblib
import numpy as np

app = FastAPI(
    title="AI Dengue Prediction API",
    description="Predict dengue cases 2 weeks ahead.",
    version="1.0"
)

# --------------------------------------------------
# PATHS
# --------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR / "models"
DATA_DIR = BASE_DIR / "data"

# --------------------------------------------------
# LOAD ONLY THE 2-WEEK MODEL
# --------------------------------------------------

models = {}

model_path = MODEL_DIR / "dengue_model_2w.joblib"

if not model_path.exists():
    raise FileNotFoundError(
        f"2-week model not found: {model_path}"
    )

models[2] = joblib.load(model_path)

for package in models.values():
    package["risk_thresholds"][0.50] = 1.0

print("2-week dengue model loaded successfully!")

# --------------------------------------------------
# LOAD DATASET
# --------------------------------------------------

candidate_files = [
    DATA_DIR / "dengue_dataset_final.xlsx",
    DATA_DIR / "bangladesh_dengue_large_dataset_onsite.xlsx",
    DATA_DIR / "dengue_dataset.xlsx",
]

DATA_PATH = next(
    (p for p in candidate_files if p.exists()),
    None
)

if DATA_PATH is None:
    raise FileNotFoundError(
        "No dengue dataset found inside Al/ML/data/"
    )

print("Loading dataset from:", DATA_PATH.name)

df = (
    pd.read_excel(DATA_PATH)
    if DATA_PATH.suffix == ".xlsx"
    else pd.read_csv(DATA_PATH)
)

df["date"] = pd.to_datetime(df["date"])
df = df.sort_values(["ward_id", "date"]).copy()

if "hospital_beds_required" not in df.columns:
    df["hospital_beds_required"] = (
        df["dengue_cases"] * 0.29
    ).round().astype(int)

# --------------------------------------------------
# FEATURE ENGINEERING
# --------------------------------------------------

for i in range(1, 5):
    df[f"rainfall_lag_{i}"] = (
        df.groupby("ward_id")["rainfall_mm"].shift(i)
    )

for weeks in [2, 3, 4]:
    df[f"rainfall_prev_{weeks}w_sum"] = (
        df.groupby("ward_id")["rainfall_mm"]
        .transform(
            lambda s: s.shift(1).rolling(weeks).sum()
        )
    )

df["temp_lag_1"] = (
    df.groupby("ward_id")["avg_temp_c"].shift(1)
)

df["humidity_lag_1"] = (
    df.groupby("ward_id")["relative_humidity_pct"].shift(1)
)

for i in range(1, 5):
    df[f"dengue_cases_lag_{i}"] = (
        df.groupby("ward_id")["dengue_cases"].shift(i)
    )

all_dates = sorted(
    df["date"].dt.strftime("%Y-%m-%d").unique()
)[4:]

available_dates = all_dates[-52:]

# --------------------------------------------------
# WARD METADATA AND BED CAPACITY
# --------------------------------------------------

ward_meta = (
    df[
        [
            "ward_id",
            "population_density_sqkm",
            "sanitation_score"
        ]
    ]
    .drop_duplicates("ward_id")
)

bed_capacity = {
    row["ward_id"]: max(
        1,
        round(
            (float(row["population_density_sqkm"]) / 25000.0)
            + (float(row["sanitation_score"]) * 3.0)
        )
    )
    for _, row in ward_meta.iterrows()
}

print("Dataset loaded and features prepared!")
print("Available wards:", df["ward_id"].nunique())

# --------------------------------------------------
# RISK DRIVERS
# --------------------------------------------------

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
            "value": (
                f"{rain_now:.1f} mm now | "
                f"{rain_4w:.1f} mm (prev 4w)"
            ),
            "score": min(
                100,
                round(((rain_now + rain_4w) / 350) * 100)
            ),
            "impact": (
                "High"
                if rain_4w >= 150 or rain_now >= 60
                else (
                    "Moderate"
                    if rain_4w >= 50
                    else "Low"
                )
            ),
            "reason": (
                "Stagnant rainwater over 2-4 weeks drives "
                "Aedes mosquito breeding."
            )
        },
        {
            "factor": "Relative Humidity",
            "value": f"{humidity:.1f}%",
            "score": min(
                100,
                max(5, round(((humidity - 40) / 55) * 100))
            ),
            "impact": (
                "High" if humidity >= 80
                else "Moderate" if humidity >= 68
                else "Low"
            ),
            "reason": (
                "High humidity extends adult mosquito lifespan "
                "and biting activity."
            )
        },
        {
            "factor": "Water-Logging Risk",
            "value": f"{water_log:.2f}",
            "score": round(water_log * 100),
            "impact": (
                "High" if water_log >= 0.7
                else "Moderate" if water_log >= 0.45
                else "Low"
            ),
            "reason": (
                "Poor drainage traps rainwater in "
                "neighborhood drains longer."
            )
        },
        {
            "factor": "Average Temperature",
            "value": f"{temp:.1f} °C",
            "score": min(
                100,
                max(10, round(((temp - 15) / 20) * 100))
            ),
            "impact": (
                "High" if 27 <= temp <= 33
                else "Moderate" if temp >= 23
                else "Low"
            ),
            "reason": (
                "Warm weather (27-33 °C) speeds up egg hatching "
                "and viral incubation."
            )
        },
        {
            "factor": "Ward Vulnerability",
            "value": (
                f"{density:,}/sqkm | "
                f"Sanitation {sanitation:.2f}"
            ),
            "score": min(
                100,
                round(
                    (density / 75000) * 60
                    + (1 - sanitation) * 40
                )
            ),
            "impact": (
                "High"
                if density >= 50000 or sanitation <= 0.45
                else "Moderate"
            ),
            "reason": (
                "High crowding and weaker sanitation "
                "speed up local transmission."
            )
        }
    ]

    return sorted(
        drivers,
        key=lambda d: d["score"],
        reverse=True
    )


# --------------------------------------------------
# HELPER: RISK CLASSIFICATION
# --------------------------------------------------

def classify_risk(prediction, thresholds):

    if prediction < thresholds[0.50]:
        return "Low"
    elif prediction < thresholds[0.75]:
        return "Medium"
    elif prediction < thresholds[0.90]:
        return "High"
    else:
        return "Critical"


# --------------------------------------------------
# HOME
# --------------------------------------------------

@app.get("/")
def home():

    return {
        "message": "AI Dengue Prediction API is running!",
        "available_models": [2],
        "prediction_horizon": "2 weeks"
    }


# --------------------------------------------------
# HEALTH CHECK
# --------------------------------------------------

@app.get("/health")
def health_check():

    return {
        "status": "healthy",
        "models_loaded": [2]
    }


# --------------------------------------------------
# GET WARDS
# --------------------------------------------------

@app.get("/wards")
def get_wards():

    wards = (
        df[
            [
                "city",
                "ward_id",
                "population_density_sqkm",
                "water_logging_risk_index",
                "sanitation_score"
            ]
        ]
        .drop_duplicates()
        .sort_values(["city", "ward_id"])
        .to_dict(orient="records")
    )

    return {
        "total_wards": len(wards),
        "latest_date": (
            available_dates[-1]
            if available_dates else None
        ),
        "available_dates": available_dates,
        "wards": wards
    }


# --------------------------------------------------
# PREDICT USING FEATURES
# --------------------------------------------------

@app.post("/predict/{horizon}")
def predict_dengue(horizon: int, features: dict):

    if horizon != 2:
        raise HTTPException(
            status_code=400,
            detail="Only 2-week predictions are supported."
        )

    model_package = models[2]

    model = model_package["model"]
    feature_columns = model_package["features"]
    thresholds = model_package["risk_thresholds"]

    missing_features = [
        col for col in feature_columns
        if col not in features
    ]

    if missing_features:
        raise HTTPException(
            status_code=422,
            detail={
                "message": "Missing required features.",
                "missing_features": missing_features
            }
        )

    try:

        input_data = pd.DataFrame([
            {
                col: features[col]
                for col in feature_columns
            }
        ])

        prediction = max(
            float(model.predict(input_data)[0]),
            0
        )

        risk = classify_risk(prediction, thresholds)

        return {
            "success": True,
            "prediction_horizon": "2 weeks",
            "predicted_dengue_cases": round(prediction, 2),
            "risk_level": risk,
            "risk_thresholds": thresholds
        }

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=str(error)
        )


# --------------------------------------------------
# PREDICT FOR A SPECIFIC WARD
# --------------------------------------------------

@app.get("/predict/ward/{ward_id}/{horizon}")
def predict_ward(
    ward_id: str,
    horizon: int,
    date: Optional[str] = None
):

    if horizon != 2:
        raise HTTPException(
            status_code=400,
            detail="Only 2-week predictions are supported."
        )

    ward_data = df[
        df["ward_id"] == ward_id
    ].copy()

    if ward_data.empty:
        raise HTTPException(
            status_code=404,
            detail="Ward not found."
        )

    model_package = models[2]

    model = model_package["model"]
    feature_columns = model_package["features"]
    thresholds = model_package["risk_thresholds"]

    ward_data = (
        ward_data
        .dropna(subset=feature_columns)
        .sort_values("date")
    )

    if ward_data.empty:
        raise HTTPException(
            status_code=422,
            detail="Not enough historical data for this ward."
        )

    if date:

        matched = ward_data[
            ward_data["date"].dt.strftime("%Y-%m-%d") == date
        ]

        if matched.empty:
            raise HTTPException(
                status_code=404,
                detail=f"No valid record for ward {ward_id} on {date}."
            )

        row = matched.iloc[-1]

    else:
        row = ward_data.iloc[-1]

    input_data = pd.DataFrame([
        {
            col: row[col]
            for col in feature_columns
        }
    ])

    prediction = max(
        float(model.predict(input_data)[0]),
        0
    )

    risk = classify_risk(prediction, thresholds)

    return {
        "success": True,
        "city": row["city"],
        "ward_id": ward_id,
        "data_date": row["date"].strftime("%Y-%m-%d"),
        "current_cases": int(row["dengue_cases"]),
        "prediction_horizon": "2 weeks",
        "predicted_dengue_cases": round(prediction, 2),
        "risk_level": risk,
        "weather": {
            "avg_temp_c": round(float(row["avg_temp_c"]), 2),
            "rainfall_mm": round(float(row["rainfall_mm"]), 2),
            "relative_humidity_pct": round(
                float(row["relative_humidity_pct"]), 2
            ),
            "rainfall_lag_1": round(
                float(row["rainfall_lag_1"]), 2
            ),
            "rainfall_lag_2": round(
                float(row["rainfall_lag_2"]), 2
            ),
            "rainfall_lag_3": round(
                float(row["rainfall_lag_3"]), 2
            ),
            "rainfall_lag_4": round(
                float(row["rainfall_lag_4"]), 2
            ),
            "rainfall_prev_4w_sum": round(
                float(row["rainfall_prev_4w_sum"]), 2
            )
        },
        "drivers": build_drivers(row),
        "data_warning": (
            "Prediction uses historical dataset values, "
            "not live weather data."
        )
    }


# --------------------------------------------------
# FORECAST ALL WARDS
# --------------------------------------------------

@app.get("/forecast/all")
def forecast_all(
    horizon: int,
    date: Optional[str] = None
):

    if horizon != 2:
        raise HTTPException(
            status_code=400,
            detail="Only 2-week forecasts are supported."
        )

    if not available_dates:
        raise HTTPException(
            status_code=404,
            detail="No forecast dates are available."
        )

    target_date = date or available_dates[-1]

    if target_date not in available_dates:
        raise HTTPException(
            status_code=404,
            detail=f"Date {target_date} is not available."
        )

    model_package = models[2]

    model = model_package["model"]
    feature_columns = model_package["features"]
    thresholds = model_package["risk_thresholds"]

    rows = (
        df[df["date"] == pd.Timestamp(target_date)]
        .dropna(subset=feature_columns)
    )

    if rows.empty:
        raise HTTPException(
            status_code=404,
            detail="No ward data for this date."
        )

    predictions = model.predict(
        rows[feature_columns]
    )

    wards = []

    for (_, row), prediction in zip(
        rows.iterrows(), predictions
    ):

        value = max(float(prediction), 0)

        risk = classify_risk(value, thresholds)

        wards.append({
            "ward_id": row["ward_id"],
            "city": row["city"],
            "population_density_sqkm": int(
                row["population_density_sqkm"]
            ),
            "current_cases": int(row["dengue_cases"]),
            "predicted_cases": round(value, 2),
            "risk_level": risk
        })

    return {
        "success": True,
        "data_date": target_date,
        "horizon_weeks": 2,
        "total_wards": len(wards),
        "wards": wards,
        "data_warning": (
            "Forecast uses historical dataset values, "
            "not live weather data."
        )
    }


# --------------------------------------------------
# HOSPITAL CAPACITY
# --------------------------------------------------

@app.get("/capacity")
def get_capacity():

    return {
        "success": True,
        "rule": (
            "Assumed bed capacity per ward = "
            "round((population_density_sqkm / 25,000) "
            "+ (sanitation_score * 3)), minimum 1 bed "
            "(documented operational assumption; "
            "dataset has no bed capacity column)"
        ),
        "capacity": bed_capacity
    }


# --------------------------------------------------
# SIMULATION
# --------------------------------------------------

@app.post("/simulate")
def simulate_vector_control():

    raise HTTPException(
        status_code=503,
        detail=(
            "The intervention simulation currently requires "
            "the 2-week, 3-week and 4-week models. "
            "This deployment currently supports only "
            "the 2-week prediction model."
        )
    )

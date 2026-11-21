from fastapi import FastAPI, HTTPException
from pathlib import Path
import pandas as pd
import joblib

# api initialisation

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

# loading of dataset

DATA_PATH = BASE_DIR / "data" / "dengue_dataset.xlsx"

df = pd.read_excel(DATA_PATH)

df["date"] = pd.to_datetime(df["date"])

df = df.sort_values(["ward_id", "date"]).copy()

# Create rainfall lags
for i in range(1, 5):
    df[f"rainfall_lag_{i}"] = (
        df.groupby("ward_id")["rainfall_mm"].shift(i)
    )

# Create previous rainfall sums
for weeks in [2, 3, 4]:
    df[f"rainfall_prev_{weeks}w_sum"] = (
        df.groupby("ward_id")["rainfall_mm"]
        .transform(lambda s: s.shift(1).rolling(weeks).sum())
    )

# Create temperature and humidity lags
df["temp_lag_1"] = (
    df.groupby("ward_id")["avg_temp_c"].shift(1)
)

df["humidity_lag_1"] = (
    df.groupby("ward_id")["relative_humidity_pct"].shift(1)
)

# Create previous dengue case lags
for i in range(1, 5):
    df[f"dengue_cases_lag_{i}"] = (
        df.groupby("ward_id")["dengue_cases"].shift(i)
    )

print("Dataset loaded and features prepared!")
print("Available wards:", df["ward_id"].nunique())

# war list endpoint

@app.get("/wards")
def get_wards():

    wards = (
        df[["city", "ward_id"]]
        .drop_duplicates()
        .sort_values(["city", "ward_id"])
        .to_dict(orient="records")
    )

    return {
        "total_wards": len(wards),
        "wards": wards
    }

# home endpoint

@app.get("/")
def home():

    return {
        "message": "AI Dengue Prediction API is running!",
        "available_models": list(models.keys())
    }

# checking health

@app.get("/health")
def health_check():

    return {
        "status": "healthy",
        "models_loaded": list(models.keys())
    }

# prediction endpoint

@app.post("/predict/{horizon}")
def predict_dengue(horizon: int, features: dict):

    # Check prediction period
    if horizon not in [2, 3, 4]:
        raise HTTPException(
            status_code=400,
            detail="Horizon must be 2, 3 or 4 weeks."
        )

    # Check model availability
    if horizon not in models:
        raise HTTPException(
            status_code=503,
            detail=f"The {horizon}-week model is not available."
        )

    model_package = models[horizon]

    model = model_package["model"]
    feature_columns = model_package["features"]
    thresholds = model_package["risk_thresholds"]

    # Check required features
    missing_features = [
        column for column in feature_columns
        if column not in features
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

        # Arrange input in the correct feature order
        input_data = pd.DataFrame(
            [{column: features[column] for column in feature_columns}]
        )

        # Generate prediction
        prediction = float(model.predict(input_data)[0])

        prediction = max(prediction, 0)

        # Determine risk category
        low_medium = thresholds[0.75]
        medium_high = thresholds[0.90]
        low_boundary = thresholds[0.50]

        if prediction <= low_boundary:
            risk = "Low"

        elif prediction <= low_medium:
            risk = "Medium"

        elif prediction <= medium_high:
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
        raise HTTPException(
            status_code=500,
            detail=str(error)
        )


# ==========================================
# 5. AUTOMATIC WARD PREDICTION
# ==========================================

@app.get("/predict/ward/{ward_id}/{horizon}")
def predict_ward(ward_id: str, horizon: int):

    # Check prediction period
    if horizon not in [2, 3, 4]:
        raise HTTPException(
            status_code=400,
            detail="Horizon must be 2, 3 or 4 weeks."
        )

    # Check model availability
    if horizon not in models:
        raise HTTPException(
            status_code=503,
            detail="Requested model is not available."
        )

    # Find selected ward
    ward_data = df[df["ward_id"] == ward_id].copy()

    if ward_data.empty:
        raise HTTPException(
            status_code=404,
            detail="Ward not found."
        )

    model_package = models[horizon]

    model = model_package["model"]
    feature_columns = model_package["features"]
    thresholds = model_package["risk_thresholds"]

    # Find latest row with all required features
    ward_data = ward_data.dropna(
        subset=feature_columns
    ).sort_values("date")

    if ward_data.empty:
        raise HTTPException(
            status_code=422,
            detail="Not enough historical data for this ward."
        )

    latest = ward_data.iloc[-1]

    # Prepare model input
    input_data = pd.DataFrame([
        {
            column: latest[column]
            for column in feature_columns
        }
    ])

    # Generate prediction
    prediction = float(model.predict(input_data)[0])
    prediction = max(prediction, 0)

    # Determine risk category
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
        "city": latest["city"],
        "ward_id": ward_id,
        "data_date": latest["date"].strftime("%Y-%m-%d"),
        "prediction_horizon": f"{horizon} weeks",
        "predicted_dengue_cases": round(prediction, 2),
        "risk_level": risk,
        "data_warning": "Prediction uses historical dataset values, not live weather data."
    }

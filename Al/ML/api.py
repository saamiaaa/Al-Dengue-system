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


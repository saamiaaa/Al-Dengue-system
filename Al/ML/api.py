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


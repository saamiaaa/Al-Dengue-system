import pandas as pd
import numpy as np
import joblib
from pathlib import Path
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.pipeline import Pipeline

# LOAD DATASET

BASE_DIR = Path(__file__).resolve().parent
DATA_PATH = BASE_DIR / "data" / "dengue_dataset.xlsx"
MODEL_DIR = BASE_DIR / "models"
MODEL_DIR.mkdir(exist_ok=True)

df = pd.read_excel(DATA_PATH)

df["date"] = pd.to_datetime(df["date"])

df = df.sort_values(["ward_id", "date"]).copy()

print("\nDATASET LOADED:", df.shape)

# FEATURE ENGINEERING

print("\nCREATING WEATHER LAGS...")


grouped = df.groupby("ward_id", sort=False)


# Previous 1-4 weeks of rainfall
for lag in range(1, 5):
    df[f"rainfall_lag_{lag}"] = (
        grouped["rainfall_mm"].shift(lag)
    )


# Previous 2, 3 and 4 weeks total rainfall
for window in [2, 3, 4]:
    df[f"rainfall_prev_{window}w_sum"] = (
        df.groupby("ward_id")["rainfall_mm"]
        .transform(
            lambda s: s.shift(1).rolling(window).sum()
        )
    )

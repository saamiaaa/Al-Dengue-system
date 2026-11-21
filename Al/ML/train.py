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
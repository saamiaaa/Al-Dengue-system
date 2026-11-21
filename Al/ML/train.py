
import pandas as pd
from pathlib import Path

# Find the folder where this Python file is located
BASE_DIR = Path(__file__).resolve().parent

# Locate the Excel dataset
DATA_PATH = BASE_DIR / "data" / "dengue_dataset.xlsx"

# Load the dataset
df = pd.read_excel(DATA_PATH)

print("\n===== DENGUE DATASET =====")

print(df.head())

print("\nDataset Shape:")
print(df.shape)

print("\nColumn Names:")
print(df.columns.tolist())

print("\nDataset Information:")
df.info()


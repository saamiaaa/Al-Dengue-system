import pandas as pd
import numpy as np
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
OLD_PATH = BASE_DIR / "data" / "dengue_dataset.xlsx"
NEW_PATH = BASE_DIR / "data" / "dengue_dataset_final.xlsx"


def load(path):
    if path.suffix == ".csv":
        frame = pd.read_csv(path)
    else:
        frame = pd.read_excel(path)
    frame["date"] = pd.to_datetime(frame["date"])
    return frame.sort_values(["ward_id", "date"]).reset_index(drop=True)


old = load(OLD_PATH)
new = load(NEW_PATH)

print("PART 1: NEW DATASET OVERVIEW")
print("Shape:", new.shape)
print("Columns:", list(new.columns))
print("Extra columns not in old file:", [c for c in new.columns if c not in old.columns])
print("Missing from new file:", [c for c in old.columns if c not in new.columns])
print("Date range:", new["date"].min(), "to", new["date"].max())
print("Gap between dates in days:")
print(new.groupby("ward_id")["date"].diff().dt.days.value_counts().head())
print("Wards per city:")
print(new.groupby("city")["ward_id"].nunique())
print("Missing values:")
print(new.isna().sum()[new.isna().sum() > 0])
print("Duplicate ward/date pairs:", new.duplicated(["ward_id", "date"]).sum())

print("\nPART 2: COMPARISON WITH THE OLD FILE")
print("Rows old:", len(old), "| rows new:", len(new))
merged = old.merge(new, on=["ward_id", "date"], suffixes=("_old", "_new"))
print("Rows matching on ward_id and date:", len(merged))
shared = [c for c in old.columns if c in new.columns and c not in ("ward_id", "date")]
for column in shared:
    a = merged[column + "_old"]
    b = merged[column + "_new"]
    if pd.api.types.is_numeric_dtype(a):
        different = (~np.isclose(a, b, equal_nan=True)).sum()
    else:
        different = (a != b).sum()
    print(column, "-> different values:", different)

print("\nPART 3: THE NEW SUPPLY COLUMNS")
new_columns = ["saline_bags_needed", "diagnostic_kits_needed", "hospital_beds_required"]
for column in new_columns:
    if column not in new.columns:
        print(column, "is not in the file")
        continue
    print("\n" + column)
    print(new[column].describe())
    print("Correlation with dengue_cases:", round(new[column].corr(new["dengue_cases"]), 3))
    zero_cases = new[new["dengue_cases"] == 0][column]
    print("When dengue_cases is 0 -> min:", zero_cases.min(), "max:", zero_cases.max())
    with_cases = new[new["dengue_cases"] > 0]
    ratio = with_cases[column] / with_cases["dengue_cases"]
    print("Ratio to dengue_cases (cases > 0):")
    print(ratio.describe())
    print("Number of distinct ratios (rounded to 2 decimals):", ratio.round(2).nunique())

print("\nPART 4: ANY CAPACITY OR STOCK COLUMNS?")
words = ["capacity", "stock", "bed", "hospital", "crew", "supply"]
print([c for c in new.columns if any(w in c.lower() for w in words)])
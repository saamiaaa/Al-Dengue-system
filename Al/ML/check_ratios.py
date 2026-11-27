import pandas as pd
import numpy as np
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
NEW_PATH = BASE_DIR / "data" / "dengue_dataset_final.xlsx"

if NEW_PATH.suffix == ".csv":
    df = pd.read_csv(NEW_PATH)
else:
    df = pd.read_excel(NEW_PATH)

cases = df["dengue_cases"].to_numpy()

columns = ["saline_bags_needed", "diagnostic_kits_needed", "hospital_beds_required"]
rules = (("round", np.round), ("ceil", np.ceil), ("floor", np.floor))

for column in columns:
    target = df[column].to_numpy()
    results = []
    for rule_name, rule in rules:
        for k in np.arange(0.05, 5.0, 0.01):
            match = float((rule(k * cases) == target).mean())
            results.append((match, rule_name, round(float(k), 2)))
    best_match = max(r[0] for r in results)
    winners = [r for r in results if r[0] == best_match]
    print(column)
    print("  best exact match:", round(best_match, 4))
    print("  rule and constant reaching it:", winners[:5], "| total:", len(winners))
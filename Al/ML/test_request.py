import pandas as pd
import json

# Load the original dataset
df = pd.read_excel("data/dengue_dataset.xlsx")

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
df["temp_lag_1"] = df.groupby("ward_id")["avg_temp_c"].shift(1)

df["humidity_lag_1"] = (
    df.groupby("ward_id")["relative_humidity_pct"].shift(1)
)

# Create previous dengue case lags
for i in range(1, 5):
    df[f"dengue_cases_lag_{i}"] = (
        df.groupby("ward_id")["dengue_cases"].shift(i)
    )

# Exact model features
features = [
    "population_density_sqkm",
    "water_logging_risk_index",
    "sanitation_score",
    "avg_temp_c",
    "max_temp_c",
    "min_temp_c",
    "relative_humidity_pct",
    "rainfall_mm",
    "rainfall_lag_1",
    "rainfall_lag_2",
    "rainfall_lag_3",
    "rainfall_lag_4",
    "rainfall_prev_2w_sum",
    "rainfall_prev_3w_sum",
    "rainfall_prev_4w_sum",
    "temp_lag_1",
    "humidity_lag_1",
    "dengue_cases_lag_1",
    "dengue_cases_lag_2",
    "dengue_cases_lag_3",
    "dengue_cases_lag_4",
    "city",
    "ward_id"
]

# Select a complete real dataset row
valid_rows = df.dropna(subset=features)

sample = valid_rows.iloc[-1]

# Save request as JSON
request = json.loads(sample[features].to_json())

with open("test_request.json", "w") as file:
    json.dump(request, file, indent=4)

print("Test request created successfully!")
print(json.dumps(request, indent=4))

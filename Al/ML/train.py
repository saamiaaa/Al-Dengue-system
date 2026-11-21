import pandas as pd
import numpy as np
import joblib
from pathlib import Path
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestRegressor
from sklearn.dummy import DummyRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

# dataset loading

BASE_DIR = Path(__file__).resolve().parent
DATA_PATH = BASE_DIR / "data" / "dengue_dataset.xlsx"
MODEL_DIR = BASE_DIR / "models"
MODEL_DIR.mkdir(exist_ok=True)

df = pd.read_excel(DATA_PATH)

df["date"] = pd.to_datetime(df["date"])

df = df.sort_values(["ward_id", "date"]).copy()

print("\nDATASET LOADED:", df.shape)


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

# Previous temperature and humidity
df["temp_lag_1"] = (
    df.groupby("ward_id")["avg_temp_c"].shift(1)
)

df["humidity_lag_1"] = (
    df.groupby("ward_id")["relative_humidity_pct"].shift(1)
)

# Previous dengue cases
for lag in range(1, 5):
    df[f"dengue_cases_lag_{lag}"] = (
        df.groupby("ward_id")["dengue_cases"].shift(lag)
    )

# future prediction targets 

print("\nCREATING 2, 3 AND 4 WEEK TARGETS...")

for horizon in [2, 3, 4]:

    df[f"target_{horizon}w"] = (
        df.groupby("ward_id")["dengue_cases"]
        .shift(-horizon)
    )

    df[f"target_date_{horizon}w"] = (
        df.groupby("ward_id")["date"]
        .shift(-horizon)
    )

    # select model features

numeric_features = [
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
    "dengue_cases_lag_4"
]

categorical_features = [
    "city",
    "ward_id"
]

feature_columns = numeric_features + categorical_features

unique_dates = sorted(df["date"].unique())

split_date = unique_dates[int(len(unique_dates) * 0.8)]

print("\nTRAIN/TEST SPLIT DATE:", split_date)

# Builing & training models

for horizon in [2, 3, 4]:

    print("\n" + "=" * 45)
    print(f"TRAINING {horizon}-WEEK MODEL")
    print("=" * 45)

    target_column = f"target_{horizon}w"
    target_date_column = f"target_date_{horizon}w"

    required_columns = (
        feature_columns +
        [target_column, target_date_column]
    )

    data = df.dropna(subset=required_columns).copy()

    train_data = data[
        data[target_date_column] < split_date
    ]

    test_data = data[
        data["date"] >= split_date
    ]

    X_train = train_data[feature_columns]
    y_train = train_data[target_column]

    X_test = test_data[feature_columns]
    y_test = test_data[target_column]

    print("Training records:", len(train_data))
    print("Testing records:", len(test_data))

    if len(train_data) == 0 or len(test_data) == 0:
        print("Not enough data. Skipping horizon.")
        continue
    
# Convert city and ward names into numeric features
    preprocessor = ColumnTransformer(
        transformers=[
            ("numeric", "passthrough", numeric_features),
            ("categorical",
             OneHotEncoder(handle_unknown="ignore"),
             categorical_features)
        ]
    )

 # Random Forest model
    model = Pipeline([
        ("preprocessor", preprocessor),
        ("regressor", RandomForestRegressor(
            n_estimators=200,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1
        ))
    ])

    baseline = DummyRegressor(strategy="mean")
    baseline.fit(X_train[numeric_features], y_train)

    baseline_predictions = baseline.predict(
        X_test[numeric_features]
    )

# Train the actual ML model
    model.fit(X_train, y_train)

    predictions = model.predict(X_test)

    predictions = np.maximum(predictions, 0)

    # Evaluation
    mae = mean_absolute_error(y_test, predictions)

    rmse = np.sqrt(
        mean_squared_error(y_test, predictions)
    )

    r2 = r2_score(y_test, predictions)

    baseline_mae = mean_absolute_error(
        y_test, baseline_predictions
    )
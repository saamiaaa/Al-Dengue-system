# AI Dengue Outbreak Prediction System
## System Architecture

### 1. System Overview

The AI Dengue Outbreak Prediction System predicts ward-level dengue cases for 2, 3, and 4 weeks ahead using historical dengue, weather, and environmental data from Bangladesh. It classifies predicted case counts into four risk levels: Low, Medium, High, and Critical.

### 2. Complete System Architecture

```text
         Historical Dengue Dataset
              (Excel / Pandas)
                     |
                     v
           Data Preprocessing
       - Date conversion and sorting
       - Ward-wise grouping
       - Missing-value handling
                     |
                     v
            Feature Engineering
       - Rainfall lags (1–4 weeks)
       - Previous rainfall sums (2–4 weeks)
       - Temperature and humidity lags
       - Previous dengue cases (1–4 weeks)
                     |
                     v
         Chronological Train/Test Split
          Training       |      Testing
                         |
                         v
              Random Forest Regressor
                 (Scikit-learn)
                         |
             +-----------+-----------+
             |           |           |
             v           v           v
           2-week      3-week      4-week
            Model       Model       Model
             |           |           |
             +-----------+-----------+
                         |
                         v
                Model Evaluation
              MAE / RMSE / R²
                         |
                         v
               Joblib Model Storage
                         |
                         v
                  FastAPI Service
                         |
             +-----------+-----------+
             |                       |
             v                       v
        Ward Selection          Prediction
             |                       |
             +-----------+-----------+
                         |
                         v
              Predicted Dengue Cases
                         |
                         v
                Risk Classification
             Low / Medium / High / Critical
                         |
                         v
                 Frontend Dashboard
```

### 3. Model Selection and Justification

**Selected Model: Random Forest Regressor**

Random Forest Regressor was selected because dengue transmission is influenced by nonlinear relationships between weather conditions, environmental factors, and historical dengue cases. Random Forest can capture these relationships without requiring a predefined linear relationship between input variables and dengue cases.

It also supports mixed numerical and categorical inputs through preprocessing, provides feature importance for understanding influential variables, and combines multiple decision trees to improve prediction stability.

Three separate Random Forest models are trained for 2-week, 3-week, and 4-week prediction horizons.

### 4. Data Split and Validation Strategy

A chronological train-test split was used instead of random splitting to preserve the time-series nature of dengue data and reduce the risk of future information leaking into training.

The split date is **January 1, 2024**.

- **Training:** Observations whose target dates are before January 1, 2024.
- **Testing:** Observations whose dates are on or after January 1, 2024.

This allows the models to be evaluated on later observations, simulating prediction on unseen future periods.

### 5. Model Evaluation Results

| Horizon | MAE | RMSE | R² |
|---|---:|---:|---:|
| 2 weeks | 1.066 | 2.110 | 0.705 |
| 3 weeks | 1.185 | 2.272 | 0.660 |
| 4 weeks | 1.485 | 2.756 | 0.503 |

The results show that prediction accuracy decreases as the forecasting horizon increases.

### 6. Prediction and Deployment

The trained models are serialized using Joblib and loaded by a FastAPI service at startup. The API accepts ward IDs and prediction horizons, retrieves the latest complete historical feature record for the selected ward, and generates a prediction using the corresponding model.

The predicted case count is assigned a risk category using thresholds derived from the training target distribution (50th, 75th, and 90th percentiles). These are prototype thresholds, not officially validated epidemiological alert levels.

### 7. Data Limitation

The supplied dataset contains historical observations up to December 29, 2025. Consequently, the current prototype generates predictions from historical data rather than live weather observations. Future deployment requires updated dengue and weather data.
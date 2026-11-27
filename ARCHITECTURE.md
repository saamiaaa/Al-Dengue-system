# AI Dengue Outbreak Prediction System
## System Architecture — Phase 1 & Phase 2

## 1. System Overview

DengueSense is an AI-powered dengue surveillance and resource management system designed to predict ward-level dengue outbreaks and support proactive public health decisions across 60 urban wards in Bangladesh.

The system predicts dengue cases for 2, 3, and 4 weeks ahead using historical dengue, weather, and environmental data. Predicted case counts are classified into four risk levels: Low, Medium, High, and Critical.

Phase 1 focused on dengue outbreak prediction and risk classification.

Phase 2 extends the system into an operational public health decision-support platform by introducing constrained resource allocation, hospital overflow routing, vector control simulation, multi-channel dispatch notifications, and offline resilience.

## 2. Complete System Architecture

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
                          |
                          v
                 Random Forest Regressor
                     (Scikit-learn)
                          |
                +---------+---------+
                |         |         |
                v         v         v
              2-week    3-week    4-week
               Model     Model     Model
                |         |         |
                +---------+---------+
                          |
                          v
                   Model Evaluation
                     MAE / RMSE / R2
                          |
                          v
                   Joblib Model Storage
                          |
                          v
                     FastAPI Service
                          |
                          v
                 Predicted Dengue Cases
                          |
                          v
                   Risk Classification
                          |
                          v
                  Node.js / Express Backend
                          |
          +---------------+----------------+
          |               |                |
          v               v                v
    Resource          Hospital          Vector Control
    Allocation        Overflow           Simulation
    Engine            Routing            (2–4 weeks)
          |               |                |
          +---------------+----------------+
                          |
                          v
                 Dispatch Notice Builder
                          |
               +----------+----------+
               |          |          |
               v          v          v
              SMS      WhatsApp   Printable
                                  Briefs
                          |
                          v
                  Frontend Dashboard
                          |
                          v
                  Offline Fallback
              (Local Snapshot / Templates)
```

## 3. Machine Learning Model and Prediction

**Selected Model: Random Forest Regressor**

Random Forest Regressor was selected because dengue transmission is influenced by nonlinear relationships between weather conditions, environmental factors, and historical dengue cases.

Random Forest can capture these relationships without requiring a predefined linear relationship between input variables and dengue cases. It also provides feature importance and combines multiple decision trees to improve prediction stability.

Three separate Random Forest models are trained for 2-week, 3-week, and 4-week prediction horizons.

### Feature Engineering

The prediction pipeline uses:

- Rainfall lags (1–4 weeks).
- Previous rainfall sums (2–4 weeks).
- Temperature and humidity lags.
- Previous dengue cases (1–4 weeks).
- Ward-level environmental and demographic information.

### Data Split and Validation Strategy

A chronological train-test split was used instead of random splitting to preserve the time-series nature of dengue data and reduce future information leakage.

The split date is January 1, 2024.

- Training: Observations whose target dates are before January 1, 2024.
- Testing: Observations whose dates are on or after January 1, 2024.

### Model Evaluation Results

| Horizon | MAE | RMSE | R² |
|---|---:|---:|---:|
| 2 weeks | 1.066 | 2.110 | 0.705 |
| 3 weeks | 1.185 | 2.272 | 0.660 |
| 4 weeks | 1.485 | 2.756 | 0.503 |

Prediction accuracy decreases as the forecasting horizon increases.

### Risk Classification

Predicted dengue cases are classified into four risk categories:

- Low
- Medium
- High
- Critical

The thresholds are derived from the training target distribution using the 50th, 75th, and 90th percentiles. These are prototype thresholds and are not officially validated epidemiological alert levels.

## 4. Prediction API and Backend Integration

The trained models are serialized using Joblib and loaded by a FastAPI service.

The Python API provides:

- Ward-level predictions.
- Custom feature-based predictions.
- Forecasts across all available wards.
- Model health checks.
- Vector control simulations.

The Node.js and Express backend acts as the integration layer between the frontend and Python ML service.

It provides REST endpoints for:

- `/api/health`
- `/api/wards`
- `/api/predict/:wardId`
- `/api/allocation`
- `/api/overflow`
- `/api/simulate`
- `/api/dispatch`

The backend also implements response caching and request validation.

## 5. Phase 2: Constrained Resource Allocation Engine

The resource allocation engine converts predicted dengue cases and risk levels into estimated resource requirements and operational assignments.

### Resource Demand Calculation

Resource requirements are calculated using fixed demand-per-case rates:

| Resource | Rate per predicted case |
|---|---:|
| Saline bags | 2.38 |
| Diagnostic kits | 1.16 |
| Hospital beds | 0.29 |

The required quantities are calculated by multiplying the predicted case count by the corresponding rate and rounding to the nearest whole number.

These rates are operational assumptions based on the supplied dataset and are not separate machine learning predictions.

### Scarcity Controls

Health officers can interactively adjust:

- Available Regional Stock: 30%–100%.
- Total Available Spraying Crews.

The available stock for each resource is calculated as:

Available Stock = Total Required Demand × Stock Percentage

The available quantities are rounded down to whole units.

### Priority-Based Allocation

Wards are sorted using the following priority order:

1. Risk level: Critical, High, Medium, Low.
2. Population density: Higher-density wards receive priority.
3. Predicted dengue cases: Higher predicted cases receive priority.

Resources are distributed in priority order until the available stock is exhausted.

The system calculates:

- Required supplies.
- Available supplies.
- Allocated supplies.
- Remaining deficits.
- Fulfilment percentage.
- Critical supply deficit warnings.

### Spraying Crew Assignment

Crew requirements depend on the predicted risk level:

| Risk Level | Required Crews |
|---|---:|
| Critical | 3 |
| High | 2 |
| Medium | 1 |
| Low | 0 |

Available crews are assigned according to ward priority. The system also identifies crew shortages.

## 6. Phase 2: Hospital Surge and Cross-Ward Overflow Routing

The hospital overflow module identifies wards where projected bed demand exceeds their estimated local bed capacity.

### Bed Capacity Estimation

The supplied dataset does not contain an explicit hospital bed capacity column.

Therefore, the prototype estimates ward capacity using the following operational assumption:

`Capacity = max(1, round((population_density_sqkm / 25000) + (sanitation_score × 3)))`

### Overflow Routing

When projected bed demand exceeds local capacity:

1. The ward is identified as an overflow donor.
2. The system searches for receiving wards within the same city.
3. Wards with available bed capacity are considered.
4. Patients are assigned to the least-utilized eligible receiving ward.
5. Routing continues until the overflow is handled or no capacity remains.

Transfers are restricted to the same city:

- Dhaka North
- Dhaka South
- Chattogram
- Gazipur
- Narayanganj

### Hospital Utilization Reporting

The system calculates:

- Local bed demand and capacity.
- Overflow patients.
- Outbound and inbound transfers.
- Net remaining bed deficit.
- Remaining bed headroom.
- City-wide bed utilization.

If available city-wide capacity cannot accommodate all projected demand, the system flags an unmet bed deficit.

## 7. Phase 2: What-If Vector Control Impact Simulator

The vector control simulator allows health officers to explore the potential impact of deploying larvicide and fogging teams in selected wards.

The simulator evaluates the impact of interventions across the 2-week, 3-week, and 4-week prediction horizons.

### Intervention Model

A diminishing-returns intervention curve is used:

`Effect = 1 - exp(-0.30 × Deployed Crews)`

The intervention effect modifies selected model input features:

- Reduces the waterlogging risk index by up to 65% of its original value.
- Improves sanitation score by up to 45% of its remaining gap to 1.0.
- Reduces previous dengue case lag by up to 25%.

The modified features are passed through the trained Random Forest models to generate counterfactual predictions.

The 2-week prediction reduction is also propagated into the lagged inputs used for the 3-week and 4-week predictions.

### Impact Calculation

The simulator compares baseline predictions with intervention predictions to estimate:

- Projected cases prevented.
- Hospital beds saved.
- Saline bags saved.
- Cases prevented per deployed crew.

### Return on Investment (ROI)

`ROI = Cases Prevented / Deployed Crews`

Wards are ranked according to their estimated intervention ROI, helping officers prioritize limited vector-control teams.

The simulator represents an experimental counterfactual scenario, not a clinically validated estimate of intervention effectiveness.

## 8. Phase 2: Multi-Channel Dispatch Notification System

The dispatch module converts prediction and resource allocation results into ward-specific operational notices.

The Node.js backend generates structured notification content through the `/api/dispatch` endpoint.

Officers can request notices for individual wards or all available wards, using the selected forecast horizon and scarcity settings.

### SMS Notifications

SMS notices contain:

- Ward and city identification.
- Forecast horizon and data date.
- Predicted dengue cases.
- Risk classification.
- Supply allocation and deficit status.
- Spraying crew assignments.
- Hospital bed information and routing instructions.

### WhatsApp Notifications

WhatsApp notices provide a more detailed, formatted version of the operational alert, including priority rank, allocated versus required supplies, deficits, crew assignments, and hospital transfer instructions.

### Printable Commissioner Briefs

The structured commissioner brief includes:

- Ward and city information.
- Population density.
- Current and predicted dengue cases.
- Risk classification and priority rank.
- Resource requirements and allocations.
- Supply deficit warnings.
- Spraying crew assignments.
- Hospital bed capacity and overflow routing.
- Inbound and outbound patient transfers.

The dispatch generator produces structured brief data that can be used to create printable PDF or HTML reports.

## 9. Phase 2: Offline Resilience and Deterministic Fallback

The system includes local fallback mechanisms to maintain core functionality when the backend, internet connection, or external services are unavailable.

### Offline Architecture

The frontend uses a locally stored `offline_snapshot.json` containing precomputed ward information, forecast results, allocation data, overflow data, and simulation preview information.

The fallback implementation supports:

- Ward information retrieval.
- Historical prediction snapshots.
- Resource allocation calculations.
- Supply deficit detection.
- Spraying crew allocation.
- Hospital overflow information.
- Vector control simulation fallback.
- Template-based SMS and WhatsApp notices.
- Structured commissioner briefs.

### Deterministic Fallback

When API requests fail, the frontend switches to local fallback logic.

Resource allocation and dispatch templates are generated locally using deterministic calculations rather than depending on external generative AI services.

The offline implementation is designed to keep the main operational workflows available during connectivity failures. Forecast snapshots provide precomputed results rather than retraining or running the complete forecasting pipeline offline.

## 10. Deployment and Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js, React |
| Styling | Tailwind CSS, DaisyUI |
| Backend | Node.js, Express.js |
| Machine Learning API | Python, FastAPI |
| Data Processing | Pandas, NumPy |
| Machine Learning | Scikit-learn, Random Forest |
| Model Storage | Joblib |
| Dataset Processing | OpenPyXL |
| Local Fallback | JSON Snapshot |
| Version Control | Git, GitHub |

### Application Communication

The frontend communicates with the Express backend through REST APIs.

The Express backend communicates with the Python FastAPI service for machine learning predictions and vector control simulation.

The backend processes resource allocation, hospital overflow routing, and dispatch notice generation.

The frontend displays the resulting operational information through the dashboard.

## 11. Data Limitations and Assumptions

The system uses the supplied historical dengue dataset, which contains observations up to December 29, 2025, for the original Phase 1 pipeline.

The Phase 2 dataset extends the original dataset with resource-related columns, including:

- `saline_bags_needed`
- `diagnostic_kits_needed`
- `hospital_beds_required`

The current resource allocation engine uses fixed demand-per-case rates rather than separately trained resource prediction models.

Other operational assumptions include:

- Estimated hospital bed capacity because actual ward-level capacity data is unavailable.
- Fixed resource consumption rates per predicted case.
- Risk-based spraying crew requirements.
- A mathematical intervention-effect curve for counterfactual simulation.

The prototype uses historical information rather than live weather observations. Future deployment would require regularly updated dengue surveillance, weather, hospital capacity, and resource inventory data.

All predictions, allocations, routing decisions, and intervention estimates should be treated as decision-support information rather than guaranteed outcomes.

## 12. AI Usage and Disclosure

AI-assisted development tools were used as supporting resources during project development for:

- Understanding machine learning concepts.
- Feature engineering and model development guidance.
- Frontend and backend implementation assistance.
- Debugging and technical documentation.

The dengue prediction models use the project's historical dataset and trained machine learning pipeline.

Core forecasting, resource allocation, overflow routing, simulation, and dispatch generation do not depend on external generative AI APIs.

All AI-assisted suggestions and code were reviewed, tested, and adapted by the development team.

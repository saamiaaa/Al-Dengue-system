# DengueSense 𓆤

<img width="960" height="540" alt="dengueSense" src="https://github.com/user-attachments/assets/953b0e13-64b4-4b24-94ef-ff91943918a5" />

### <p align="center">AI-Powered Dengue Outbreak Prediction & Public Health Resource Management System</p>

<p align="center">DengueSense is an AI-powered public health surveillance and decision-support platform designed to predict dengue outbreaks, identify vulnerable communities, and optimize emergency resource allocation. By combining machine learning, environmental indicators, historical dengue data, and operational planning, the system transforms outbreak predictions into actionable public health interventions.</p>

## ഒ· Project Goal

Our goal is to move beyond reactive dengue management by building an intelligent early-warning and response system.

DengueSense aims to:

- Predict potential dengue outbreaks before they escalate.
- Identify high-risk wards through localized risk assessment.
- Understand environmental and historical factors contributing to outbreaks.
- Estimate emergency healthcare resource requirements.
- Optimize resource distribution across cities and wards.
- Support faster, data-driven preventive interventions.

## 👥 Team Members & Their Roles ♡

- **Samia Akhter (Team Leader):** AI/ML Development & Integration
- **Arpa Chowdhury:** Frontend Development
- **Altaf Uddin Sifat:** Backend Development

<p align="center">────۶ৎ────</p>

## ✦ Key Features

| Module | Description |
|---|---|
| Overview Dashboard | Centralized overview of dengue surveillance and outbreak risks |
| AI Predictions | Ward-level dengue case forecasts |
| Risk Map | Geographic visualization of predicted outbreak severity |
| Analytics | Historical trends, environmental indicators, and prediction insights |
| Ward Monitoring | Individual ward vulnerability and risk monitoring |
| Alerts & Recommendations | Targeted preventive recommendations and alerts |
| Resource Allocation | Intelligent distribution of emergency healthcare resources |
| Overflow Management | Identification and handling of intra-city resource shortages |
| Intervention Simulator | Evaluation of potential interventions across future planning horizons |
| Data & Reports | Operational summaries and downloadable PDF/HTML reports |
| Dispatch Preparation | SMS and WhatsApp-ready emergency communication |
| Settings & Help | Platform configuration and documentation |

## .⋆❀° Dataset & Machine Learning

### Dataset Overview

DengueSense uses a structured historical dataset containing:

- **31,320 weekly records**
- **60 wards**
- **5 cities**
- Historical coverage from January 2016 to December 2025

The dataset combines epidemiological, environmental, demographic, and infrastructure-related information.

### Feature Engineering

The prediction pipeline uses historical and lagged features to capture delayed environmental effects on dengue transmission.

Examples include:

- Previous weeks' dengue case counts.
- Lagged rainfall measurements.
- Lagged temperature measurements.
- Historical humidity patterns.
- Waterlogging and sanitation indicators.

These features help the model recognize patterns that may precede an increase in dengue cases.

### Prediction Model

DengueSense uses **Random Forest Regression** through Scikit-learn.

The system was developed with separate forecasting horizons:

- 2-week dengue prediction model.
- 3-week dengue prediction model.
- 4-week dengue prediction model.

The trained models are serialized using Joblib and loaded by the FastAPI prediction service.

### Healthcare Resource Targets

The expanded dataset also incorporates operational demand targets:

- `saline_bags_needed`
- `diagnostic_kits_needed`
- `hospital_beds_required`

These variables support the resource-planning component by connecting expected outbreak demand with healthcare resource requirements.

### Risk Classification

Predicted dengue cases are translated into four operational risk categories:

- Low
- Medium
- High
- Critical

These classifications support ward monitoring, alert prioritization, and intervention planning.

## 🏗️ System Architecture

DengueSense follows a multi-layer architecture:

1. **Frontend Layer:** Displays predictions, analytics, maps, alerts, and resource planning information.
2. **Backend Layer:** Handles application requests, data communication, and integration between frontend and ML services.
3. **AI/ML Layer:** Processes historical and environmental data and generates dengue predictions.
4. **Operational Intelligence Layer:** Uses prediction outputs to support resource allocation, overflow handling, intervention simulation, and report generation.

<p align="center">────۶ৎ────</p>

### Technology Stack

#### Frontend
- **Next.js 16** – React framework
- **React 19** – User interface
- **Tailwind CSS 4** – Styling
- **DaisyUI 5** – UI components

#### Backend
- **Node.js** – JavaScript runtime
- **Express.js 5** – REST API
- **CORS** – Cross-origin resource sharing
- **dotenv** – Environment configuration

#### AI/ML & Data Processing
- **Python** – Machine learning development
- **Pandas** – Data processing
- **NumPy** – Numerical computing
- **Scikit-learn** – Random Forest machine learning models
- **Joblib** – Model serialization and loading
- **OpenPyXL** – Excel file processing
- **FastAPI** – ML prediction API
- **Uvicorn** – ASGI server

#### Reporting & Operations
- Python-based report generation
- PDF and HTML export support
- Deterministic resource allocation and overflow handling
- SMS and WhatsApp-ready message generation

AI Assistants: ChatGPT, Claude, & Google Gemini
AI-powered development tools were used as supporting
resources during the development of this project.
They assisted the team with:

- Frontend component development, UI improvements,
  responsive layouts, and debugging.
- Backend API development, data handling, and
  troubleshooting.
- Understanding machine learning concepts,
  feature engineering, and model integration.
- Python API integration and debugging.
- Technical documentation and project setup guidance.
- Learning new concepts and assisting in implementing it

All AI-generated suggestions and code were reviewed,
tested, and adapted by the team before being included
in the project.

AI tools were used to support development.
The project’s dengue prediction models are trained
using the project's dataset and machine learning
pipeline, rather than relying on a generative AI
chatbot to produce predictions.

## ❦ Project Structure

```text
Al-Dengue-system/
│
├── src/                         # Next.js frontend
│
├── backend/                     # Node.js & Express backend
│
├── Al/
│   └── ML/
│       ├── data/
│       │   └── dengue_dataset.xlsx
│       │
│       ├── models/
│       │   ├── dengue_model_2w.joblib
│       │   ├── dengue_model_3w.joblib
│       │   └── dengue_model_4w.joblib
│       │
│       ├── operations/
│       │   ├── allocation.py    # Constrained resource allocation
│       │   ├── overflow.py      # Intra-city overflow management
│       │   ├── simulator.py     # Intervention simulation
│       │   └── dispatch.py      # Alert and dispatch preparation
│       │
│       ├── exports/             # Generated reports and exports
│       │
│       ├── train.py             # Model training
│       └── api.py               # FastAPI prediction service
│
├── package.json
├── requirements.txt
└── README.md
```

## 🚀 Running Locally

### Prerequisites

- Node.js and npm
- Python 3.9+
- Git

### 1. Clone the Repository

```bash
git clone <YOUR_REPOSITORY_URL>
cd Al-Dengue-system
```

### 2. Set Up the Frontend

```bash
npm install
```

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

Start the frontend:

```bash
npm run dev
```

Frontend: `http://localhost:3000`

### 3. Set Up the Backend

Open a separate terminal:

```bash
cd backend
npm install
```

Create a `.env` file:

```env
FRONTEND_URL=http://localhost:3000
PORT=5000
ML_API_URL=http://127.0.0.1:8000
```

Start the backend using its configured npm start script.

Backend: `http://localhost:5000`

### 4. Set Up the Machine Learning API

Open another terminal from the project root:

```bash
cd Al/ML
```

Create a virtual environment:

**Windows PowerShell:**

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
```

**macOS/Linux:**

```bash
python -m venv .venv
source .venv/bin/activate
```

Install dependencies:

```bash
pip install pandas numpy scikit-learn joblib openpyxl fastapi uvicorn
```

Start the prediction API:

```bash
python -m uvicorn api:app --reload --host 127.0.0.1 --port 8000
```

ML API: `http://127.0.0.1:8000`

API documentation: `http://127.0.0.1:8000/docs`

**Important:** Ensure the required trained model files are available in the `models/` directory. 

### 5. Access the Dashboard

Once the frontend, backend, and ML API are running, visit:

```text
http://localhost:3000
```

All three services should remain active during local development.

## ⁠♡ Deployment

DengueSense uses a separated deployment architecture:

- **Frontend:** Next.js web application.
- **Backend:** Node.js and Express REST API.
- **ML Service:** Python FastAPI prediction API.

The ML service is independently deployable, allowing the frontend and backend to communicate with the prediction service through configured API URLs.

## 🌐 Demo

**Live Website:** https://al-dengue-system-frontend.vercel.app


<p align="center">────۶ৎ────</p>

<p align="center">A Project by Team Unscripted.exe | EDU AI Engineering Hackathon 2026</p>

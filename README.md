# DengueSense 𓆤

### <p align="center">AI-Powered Dengue Outbreak Prediction System</p>

<img width="1440" height="900" alt="Screen Shot 2026-11-22 at 10 59 42 AM" src="https://github.com/user-attachments/assets/3f153290-3a85-4798-9685-dd38f500f10a" />

<p align="center">DengueSense is an AI-powered surveillance platform designed to predict potential dengue outbreaks and support proactive public health management. By analyzing historical dengue cases and environmental factors, the system provides ward-level predictions, risk assessments, and preventive recommendations to help authorities make data-driven decisions.</p>

## 🎯 Project Goal

Our goal is to move beyond reactive dengue management by providing early risk insights, identifying vulnerable wards, and supporting targeted preventive action through machine learning and data-driven surveillance.

## Team Members & their role ♡

- Samia Akhter (Team Leader): Al/ML
- Arpa Chowdhury: Frontend
- Altaf Uddin Sifat: Backend

## Tech Stack

### Frontend
- **Next.js 16** – React framework
- **React 19** – User interface
- **Tailwind CSS 4** – Styling
- **DaisyUI 5** – UI components

### Backend
- **Node.js** – JavaScript runtime
- **Express.js 5** – REST API
- **CORS** – Cross-origin resource sharing
- **dotenv** – Environment configuration

### AI/ML & Data Processing
- **Python** – Machine learning development
- **Pandas** – Data processing
- **NumPy** – Numerical computing
- **Scikit-learn** – Machine learning and Random Forest models
- **Joblib** – Model serialization and loading
- **OpenPyXL** – Excel file processing
- **FastAPI** – Custom ML prediction API
- **Uvicorn** – ASGI server

**Custom API:** DengueSense uses its own FastAPI-based prediction API to serve results from trained machine learning models. It does not depend on external generative AI APIs such as Gemini or OpenAI.

## AI Tools

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

## .✦ ݁˖ Key Features

- **Early-Warning Surveillance:** Tracks dengue outbreak risks across 60 wards.
- **Case Prediction:** Predicts potential dengue cases for 2, 3, and 4-week horizons.
- **Risk Classification:** Categorizes wards into predicted risk tiers.
- **Environmental Monitoring:** Tracks lagged rainfall and temperature indicators.
- **Risk Driver Breakdown:** Highlights factors influencing predicted outbreak risks.
- **Hyper-Local Ward Vulnerability:** Provides ward-specific vulnerability insights.
- **Preventive Recommendations:** Suggests targeted interventions based on predicted risk levels.

## ★ Project Structure

```text
Al-Dengue-system/
│
├── src/                  # Next.js frontend
│
├── backend/              # Node.js & Express backend
│
├── Al/
│   └── ML/
│       ├── train.py      # Model training
│       ├── api.py        # FastAPI prediction API
│       └── models/       # Trained ML models
│
├── package.json
└── README.md
```
<p align="center">────۶ৎ────</p>

## Running Locally

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

Frontend runs at: `http://localhost:3000`

### 3. Set Up the Backend

Navigate to the backend directory:

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

Backend runs at: `http://localhost:5000`

### 4. Set Up the Machine Learning API

Open a new terminal from the project root:

```bash
cd Al/ML
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

ML API runs at: `http://127.0.0.1:8000`

**Note:** Ensure the trained model files are present in the `models/` directory before starting the prediction API.

<p align="center">────۶ৎ────</p>

### 5. Access the Dashboard

Once all three services are running, open:

`http://localhost:3000`

Make sure the frontend, backend, and ML API are running simultaneously.

## 🌐 Demo

**Live Website:** Will update soon.

<p align="center">────۶ৎ────</p>

<p align="center">A Project by Team Unscripted.exe | EDU AI Engineering Hackathon 2026</p>

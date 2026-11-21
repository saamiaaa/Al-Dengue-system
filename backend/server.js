const express = require("express");
const cors = require("cors");
require("dotenv").config();
const path = require("path");
const XLSX = require("xlsx");
const app = express();

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000"
}));

app.use(express.json());
const ML_API_URL = process.env.ML_API_URL || "http://127.0.0.1:8000";
const DATASET_PATH = path.resolve(
    __dirname,
    process.env.DATASET_PATH || "../Al/ML/data/dengue_dataset.xlsx"
);

// Test route
app.get("/", (req, res) => {
    res.json({
        message: "Dengue Prediction API is running"
    });
});

// Health check
app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "Backend is healthy"
    });
});

// Start server
const PORT = process.env.PORT || 5000;

// =========================================================
// 1. IN-MEMORY DATA & PREDICTION CACHE (No MongoDB needed)
// =========================================================
const wardRecords = new Map(); // ward_id -> sorted weekly rows
const cityWards = new Map();   // city -> ward metadata list
let availableDates = [];

const predictionCache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_CACHE_SIZE = 500;
const cacheStats = { hits: 0, misses: 0 };

app.listen(PORT, () => {
    console.log(`Backend running at http://localhost:${PORT}`);
});



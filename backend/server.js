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

// 1. IN-MEMORY DATA & PREDICTION CACHE (No MongoDB needed)


const wardRecords = new Map();
const cityWards = new Map();
let availableDates = [];

const predictionCache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_CACHE_SIZE = 500;
const cacheStats = { hits: 0, misses: 0 };


function formatDate(rawDate) {
    if (rawDate instanceof Date && !isNaN(rawDate)) {
        return rawDate.toISOString().slice(0, 10);
    }
    if (typeof rawDate === "number") {
        const d = XLSX.SSF.parse_date_code(rawDate);
        return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
    }
    return String(rawDate).slice(0, 10);
}

function loadDataset() {
    console.log("Loading dataset:", DATASET_PATH);
    const wb = XLSX.readFile(DATASET_PATH, { cellDates: true });
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
    const dateSet = new Set();

    for (const r of rows) {
        const rec = {
            date: formatDate(r.date),
            city: String(r.city),
            ward_id: String(r.ward_id),
            population_density_sqkm: Number(r.population_density_sqkm),
            water_logging_risk_index: Number(r.water_logging_risk_index),
            sanitation_score: Number(r.sanitation_score),
            avg_temp_c: Number(r.avg_temp_c),
            max_temp_c: Number(r.max_temp_c),
            min_temp_c: Number(r.min_temp_c),
            rainfall_mm: Number(r.rainfall_mm),
            relative_humidity_pct: Number(r.relative_humidity_pct),
            dengue_cases: Number(r.dengue_cases),
        };

        dateSet.add(rec.date);
        if (!wardRecords.has(rec.ward_id)) wardRecords.set(rec.ward_id, []);
        wardRecords.get(rec.ward_id).push(rec);
    }

    for (const [wardId, list] of wardRecords.entries()) {
        list.sort((a, b) => a.date.localeCompare(b.date));
        const first = list[0];
        if (!cityWards.has(first.city)) cityWards.set(first.city, []);
        cityWards.get(first.city).push({
            ward_id: wardId,
            city: first.city,
            population_density_sqkm: first.population_density_sqkm,
            water_logging_risk_index: first.water_logging_risk_index,
            sanitation_score: first.sanitation_score,
        });
    }

    for (const wards of cityWards.values()) {
        wards.sort((a, b) => a.ward_id.localeCompare(b.ward_id));
    }

    // Skip first 4 weeks so every selectable date has complete 4-week lag history
    availableDates = Array.from(dateSet).sort().slice(4);
    console.log(
        `Loaded ${rows.length} rows | ${wardRecords.size} wards | ${cityWards.size} cities`
    );
}

app.listen(PORT, () => {
    console.log(`Backend running at http://localhost:${PORT}`);
});



// =========================================================
// 2. FEATURE BUILDER (Matches api.py & test_request.json)
// =========================================================
function buildWardFeatures(wardId, targetDate, override = {}) {
    const rows = wardRecords.get(wardId);
    if (!rows || rows.length < 5) return null;

    let idx = targetDate
    ? rows.findIndex((r) => r.date === targetDate)
    : rows.length - 1;

if (idx === -1) return null;

    const cur = rows[idx];
    const l1 = rows[idx - 1];
    const l2 = rows[idx - 2];
    const l3 = rows[idx - 3];
    const l4 = rows[idx - 4];

    const avg_temp_c =
        override.avg_temp_c !== undefined ? Number(override.avg_temp_c) : cur.avg_temp_c;
    const tempDelta = avg_temp_c - cur.avg_temp_c;

    const rainfall_mm =
        override.rainfall_mm !== undefined ? Number(override.rainfall_mm) : cur.rainfall_mm;
    const relative_humidity_pct =
        override.relative_humidity_pct !== undefined
            ? Number(override.relative_humidity_pct)
            : cur.relative_humidity_pct;

    // Exact 23 features expected by api.py POST /predict/{horizon}
    const features = {
        population_density_sqkm: cur.population_density_sqkm,
        water_logging_risk_index: cur.water_logging_risk_index,
        sanitation_score: cur.sanitation_score,
        avg_temp_c: Number(avg_temp_c.toFixed(2)),
        max_temp_c: Number((cur.max_temp_c + tempDelta).toFixed(2)),
        min_temp_c: Number((cur.min_temp_c + tempDelta).toFixed(2)),
        relative_humidity_pct: Number(relative_humidity_pct.toFixed(2)),
        rainfall_mm: Number(rainfall_mm.toFixed(2)),
        rainfall_lag_1: l1.rainfall_mm,
        rainfall_lag_2: l2.rainfall_mm,
        rainfall_lag_3: l3.rainfall_mm,
        rainfall_lag_4: l4.rainfall_mm,
        rainfall_prev_2w_sum: Number((l1.rainfall_mm + l2.rainfall_mm).toFixed(2)),
        rainfall_prev_3w_sum: Number(
            (l1.rainfall_mm + l2.rainfall_mm + l3.rainfall_mm).toFixed(2)
        ),
        rainfall_prev_4w_sum: Number(
            (l1.rainfall_mm + l2.rainfall_mm + l3.rainfall_mm + l4.rainfall_mm).toFixed(2)
        ),
        temp_lag_1: l1.avg_temp_c,
        humidity_lag_1: l1.relative_humidity_pct,
        dengue_cases_lag_1: l1.dengue_cases,
        dengue_cases_lag_2: l2.dengue_cases,
        dengue_cases_lag_3: l3.dengue_cases,
        dengue_cases_lag_4: l4.dengue_cases,
        city: cur.city,
        ward_id: cur.ward_id,
    };

    return { date: cur.date, current_cases: cur.dengue_cases, features };
}
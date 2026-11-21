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



// 2. FEATURE BUILDER (Matches api.py & test_request.json)
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

function getMainDrivers(f) {
    const drivers = [
        {
            factor: "Multi-Week Rainfall",
            value: `${f.rainfall_mm} mm now | ${f.rainfall_prev_4w_sum} mm (prev 4w)`,
            score: Math.min(100, Math.round(((f.rainfall_mm + f.rainfall_prev_4w_sum) / 350) * 100)),
            impact:
                f.rainfall_prev_4w_sum >= 150 || f.rainfall_mm >= 60
                    ? "High"
                    : f.rainfall_prev_4w_sum >= 50
                        ? "Moderate"
                        : "Low",
            reason: "Stagnant rainwater over 2 - 4 weeks drives Aedes mosquito breeding cycles.",
        },
        {
            factor: "Relative Humidity",
            value: `${f.relative_humidity_pct}%`,
            score: Math.min(100, Math.max(5, Math.round(((f.relative_humidity_pct - 40) / 55) * 100))),
            impact:
                f.relative_humidity_pct >= 80
                    ? "High"
                    : f.relative_humidity_pct >= 68
                        ? "Moderate"
                        : "Low",
            reason: "High humidity keeps adult mosquitoes alive and active longer.",
        },
        {
            factor: "Water-Logging Risk",
            value: f.water_logging_risk_index.toFixed(2),
            score: Math.round(f.water_logging_risk_index * 100),
            impact:
                f.water_logging_risk_index >= 0.7
                    ? "High"
                    : f.water_logging_risk_index >= 0.45
                        ? "Moderate"
                        : "Low",
            reason: "Poor drainage traps rainwater in neighborhood drains after rainfall.",
        },
        {
            factor: "Average Temperature",
            value: `${f.avg_temp_c} °C`,
            score: Math.min(100, Math.max(10, Math.round(((f.avg_temp_c - 15) / 20) * 100))),
            impact:
                f.avg_temp_c >= 27 && f.avg_temp_c <= 33
                    ? "High"
                    : f.avg_temp_c >= 23
                        ? "Moderate"
                        : "Low",
            reason: "Warm weather (27 - 33 °C) accelerates egg hatching and virus incubation.",
        },
        {
            factor: "Ward Vulnerability",
            value: `${f.population_density_sqkm.toLocaleString()}/sqkm | Sanitation ${f.sanitation_score}`,
            score: Math.min(
                100,
                Math.round((f.population_density_sqkm / 75000) * 60 + (1 - f.sanitation_score) * 40)
            ),
            impact:
                f.population_density_sqkm >= 50000 || f.sanitation_score <= 0.45 ? "High" : "Moderate",
            reason: "High crowding and weaker waste collection speed up local outbreaks.",
        },
    ];

    return drivers.sort((a, b) => b.score - a.score);
}




// 3. CACHED CALLS TO PYTHON FASTAPI (api.py)

function getCached(key) {
    const item = predictionCache.get(key);
    if (item && Date.now() - item.ts < CACHE_TTL_MS) {
        cacheStats.hits += 1;
        return item.data;
    }
    return null;
}

function setCached(key, data) {
    if (predictionCache.size >= MAX_CACHE_SIZE) {
        predictionCache.delete(predictionCache.keys().next().value);
    }
    predictionCache.set(key, { data, ts: Date.now() });
}

async function fetchMlByFeatures(horizon, features) {
    const key = `feat:${horizon}:${JSON.stringify(features)}`;
    const hit = getCached(key);
    if (hit) return { ...hit, cached: true };

    cacheStats.misses += 1;
    const res = await fetch(`${ML_API_URL}/predict/${horizon}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(features),
    });

    if (!res.ok) {
        throw new Error(`ML API (${res.status}): ${await res.text()}`);
    }

    const data = await res.json();
    setCached(key, data);
    return { ...data, cached: false };
}

async function fetchMlByWardLatest(wardId, horizon) {
    const built = buildWardFeatures(wardId);

    if (!built) {
        throw new Error("Ward not found or insufficient historical data");
    }

    return fetchMlByFeatures(horizon, built.features);
}



// 4. ROUTES FOR NEXT.JS UI

app.get("/", (req, res) => {
    res.json({ message: "Dengue Prediction Backend API is running" });
});

// Check Express + Python FastAPI + Cache health
app.get("/api/health", async (req, res) => {
    let mlService = { status: "unreachable" };
    try {
        const r = await fetch(`${ML_API_URL}/health`);
        if (r.ok) mlService = await r.json();
    } catch (_) { }

    res.json({
        success: true,
        backend: "healthy",
        wards_loaded: wardRecords.size,
        cache_stats: cacheStats,
        ml_service: mlService,
    });
});

// Cities, wards, and selectable dates for dropdowns
app.get("/api/wards", (req, res) => {
    const cities = {};
    const wardsFlat = [];

    for (const [city, wards] of cityWards.entries()) {
        cities[city] = wards;
        wardsFlat.push(...wards);
    }

    res.json({
        success: true,
        total_wards: wardsFlat.length,
        cities,
        wards: wardsFlat,
        latest_date: availableDates[availableDates.length - 1],
        available_dates: availableDates.slice(-52), // Last 52 weeks (2025 full year)
    });
});





// Direct latest-date prediction (uses api.py GET /predict/ward/{ward_id}/{horizon})
app.get("/api/predict/ward/:wardId/:horizon", async (req, res) => {
    try {
        const { wardId } = req.params;
        const horizon = Number(req.params.horizon);
        if (![2, 3, 4].includes(horizon)) {
            return res.status(400).json({ success: false, message: "Horizon must be 2, 3, or 4" });
        }

        const built = buildWardFeatures(wardId);
        if (!built) {
            return res.status(404).json({ success: false, message: "Ward not found" });
        }

        const prediction = await fetchMlByWardLatest(wardId, horizon);

        res.json({
            success: true,
            ward_id: wardId,
            city: built.features.city,
            reference_date: built.date,
            current_cases: built.current_cases,
            prediction,
            weather: {
                avg_temp_c: built.features.avg_temp_c,
                rainfall_mm: built.features.rainfall_mm,
                relative_humidity_pct: built.features.relative_humidity_pct,
                rainfall_lag_1: built.features.rainfall_lag_1,
                rainfall_lag_2: built.features.rainfall_lag_2,
                rainfall_lag_3: built.features.rainfall_lag_3,
                rainfall_lag_4: built.features.rainfall_lag_4,
                rainfall_prev_4w_sum: built.features.rainfall_prev_4w_sum,
            },
            drivers: getMainDrivers(built.features),
            cache_stats: cacheStats,
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Flexible prediction (supports any date + What-If weather sliders)
app.post("/api/predict", async (req, res) => {
    try {
        const { ward_id, date, horizon = 3, weather_override = {} } = req.body;
        const h = Number(horizon);

        if (!ward_id) {
            return res.status(400).json({ success: false, message: "ward_id is required" });
        }
        if (![2, 3, 4].includes(h)) {
            return res.status(400).json({ success: false, message: "horizon must be 2, 3, or 4" });
        }

        const built = buildWardFeatures(ward_id, date, weather_override);
        if (!built) {
            return res.status(404).json({ success: false, message: "Ward or date not found" });
        }

        const prediction = await fetchMlByFeatures(h, built.features);

        res.json({
            success: true,
            ward_id,
            city: built.features.city,
            reference_date: built.date,
            current_cases: built.current_cases,
            prediction,
            weather: {
                avg_temp_c: built.features.avg_temp_c,
                rainfall_mm: built.features.rainfall_mm,
                relative_humidity_pct: built.features.relative_humidity_pct,
                rainfall_lag_1: built.features.rainfall_lag_1,
                rainfall_lag_2: built.features.rainfall_lag_2,
                rainfall_lag_3: built.features.rainfall_lag_3,
                rainfall_lag_4: built.features.rainfall_lag_4,
                rainfall_prev_4w_sum: built.features.rainfall_prev_4w_sum,
            },
            drivers: getMainDrivers(built.features),
            cache_stats: cacheStats,
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Full 2-to-4-week early-warning window in a single request
app.post("/api/predict-window", async (req, res) => {
    try {
        const { ward_id, date, weather_override = {} } = req.body;
        if (!ward_id) {
            return res.status(400).json({ success: false, message: "ward_id is required" });
        }

        const built = buildWardFeatures(ward_id, date, weather_override);
        if (!built) {
            return res.status(404).json({ success: false, message: "Ward not found" });
        }

        const [w2, w3, w4] = await Promise.all([
            fetchMlByFeatures(2, built.features),
            fetchMlByFeatures(3, built.features),
            fetchMlByFeatures(4, built.features),
        ]);

        res.json({
            success: true,
            ward_id,
            city: built.features.city,
            reference_date: built.date,
            current_cases: built.current_cases,
            forecasts: { "2w": w2, "3w": w3, "4w": w4 },
            weather: {
                avg_temp_c: built.features.avg_temp_c,
                rainfall_mm: built.features.rainfall_mm,
                relative_humidity_pct: built.features.relative_humidity_pct,
                rainfall_lag_1: built.features.rainfall_lag_1,
                rainfall_lag_2: built.features.rainfall_lag_2,
                rainfall_lag_3: built.features.rainfall_lag_3,
                rainfall_lag_4: built.features.rainfall_lag_4,
                rainfall_prev_4w_sum: built.features.rainfall_prev_4w_sum,
            },
            drivers: getMainDrivers(built.features),
            cache_stats: cacheStats,
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});





// Weekly weather & dengue history for ward charts
app.get("/api/history/:wardId", (req, res) => {
    const { wardId } = req.params;
    const weeks = Math.min(52, Math.max(4, Number(req.query.weeks) || 12));
    const date = req.query.date;

    const rows = wardRecords.get(wardId);
    if (!rows) {
        return res.status(404).json({ success: false, message: "Ward not found" });
    }

    let endIdx = date ? rows.findIndex((r) => r.date === date) : rows.length - 1;
    if (endIdx === -1) endIdx = rows.length - 1;

    res.json({
        success: true,
        ward_id: wardId,
        history: rows.slice(Math.max(0, endIdx - weeks + 1), endIdx + 1),
    });
});

// Bonus: Ward-level risk heatmap across all wards (filterable by city & date)
app.get("/api/heatmap", async (req, res) => {
    try {
        const horizon = [2, 3, 4].includes(Number(req.query.horizon))
            ? Number(req.query.horizon)
            : 3;
        const date = req.query.date;
        const cityFilter = req.query.city;

        const targetWards = [];
        for (const [city, wards] of cityWards.entries()) {
            if (!cityFilter || cityFilter === "All" || city === cityFilter) {
                targetWards.push(...wards);
            }
        }

        const wards = await Promise.all(
            targetWards.map(async (w) => {
                const built = buildWardFeatures(w.ward_id, date);
                const pred = await fetchMlByFeatures(horizon, built.features);
                return {
                    ward_id: w.ward_id,
                    city: w.city,
                    date: built.date,
                    predicted_dengue_cases: pred.predicted_dengue_cases,
                    risk_level: pred.risk_level,
                    water_logging_risk_index: w.water_logging_risk_index,
                    rainfall_prev_4w_sum: built.features.rainfall_prev_4w_sum,
                    cached: pred.cached,
                };
            })
        );

        res.json({
            success: true,
            horizon,
            count: wards.length,
            wards,
            cache_stats: cacheStats,
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 5. START SERVER
loadDataset();

app.listen(PORT, () => {
    console.log(`Backend running at http://localhost:${PORT}`);
});


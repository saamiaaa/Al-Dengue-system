const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

const PORT = process.env.PORT || 5000;
const ML_URL = process.env.ML_URL || process.env.ML_API_URL || "http://127.0.0.1:8000";
const ML_TIMEOUT_MS = 15000;
const MAX_CACHE = 500;
const HORIZONS = [2, 3, 4];

app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000"
}));
app.use(express.json());

const cache = new Map();
const inflight = new Map();
const stats = { cacheHits: 0, mlCalls: 0 };

function stableKey(obj) {
    return JSON.stringify(Object.keys(obj).sort().map((k) => [k, obj[k]]));
}

function isFeatureObject(body) {
    return body && typeof body === "object" && !Array.isArray(body) && Object.keys(body).length > 0;
}

async function callPython(path, options = {}) {
    const response = await fetch(`${ML_URL}${path}`, {
        ...options,
        signal: AbortSignal.timeout(ML_TIMEOUT_MS)
    });
    const data = await response.json();
    return { status: response.status, data };
}

async function cachedCall(key, path, options) {
    if (cache.has(key)) {
        stats.cacheHits += 1;
        return { ...cache.get(key), cached: true };
    }

    if (!inflight.has(key)) {
        stats.mlCalls += 1;
        const request = callPython(path, options).finally(() => inflight.delete(key));
        inflight.set(key, request);
    }

    const result = await inflight.get(key);
    if (result.status === 200) {
        if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value);
        cache.set(key, result);
    }
    return { ...result, cached: false };
}

function errorBody(result) {
    const detail = result.data && result.data.detail;
    if (typeof detail === "string") return { success: false, error: detail };
    return {
        success: false,
        error: (detail && detail.message) || "The ML service could not process this request",
        details: detail
    };
}

function mlDown(res) {
    res.status(502).json({
        success: false,
        error: "ML service is not reachable. Is the Python API running?"
    });
}

app.get("/", (req, res) => {
    res.json({ message: "Dengue Prediction API is running" });
});

app.get("/api/health", async (req, res) => {
    let ml = "down";
    try {
        const { status } = await callPython("/health");
        ml = status === 200 ? "up" : "error";
    } catch (_) {
        ml = "down";
    }
    res.json({
        success: true,
        message: "Backend is healthy",
        ml_service: ml,
        cache_entries: cache.size,
        cache_hits: stats.cacheHits,
        ml_calls: stats.mlCalls
    });
});

app.get("/api/wards", async (req, res) => {
    try {
        const result = await cachedCall("wards", "/wards");
        if (result.status !== 200) return res.status(result.status).json(errorBody(result));

        const cities = {};
        for (const ward of result.data.wards) {
            if (!cities[ward.city]) cities[ward.city] = [];
            cities[ward.city].push(ward.ward_id);
        }

        res.json({
            success: true,
            cached: result.cached,
            total_wards: result.data.total_wards,
            latest_date: result.data.latest_date,
            available_dates: result.data.available_dates,
            cities,
            wards: result.data.wards
        });
    } catch (_) {
        mlDown(res);
    }
});

app.get("/api/predict/:wardId", async (req, res) => {
    const wardId = req.params.wardId;
    const date = req.query.date ? String(req.query.date) : "";

    if (!/^[A-Za-z0-9_-]+$/.test(wardId)) {
        return res.status(400).json({ success: false, error: "Invalid ward id" });
    }
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ success: false, error: "Date must be YYYY-MM-DD" });
    }

    const qs = date ? `?date=${encodeURIComponent(date)}` : "";

    try {
        const results = await Promise.all(
            HORIZONS.map((h) =>
                cachedCall(`ward|${wardId}|${date || "latest"}|${h}`, `/predict/ward/${wardId}/${h}${qs}`)
            )
        );

        const failed = results.find((r) => r.status !== 200);
        if (failed) return res.status(failed.status).json(errorBody(failed));

        const first = results[0].data;
        res.json({
            success: true,
            ward_id: first.ward_id,
            city: first.city,
            data_date: first.data_date,
            current_cases: first.current_cases,
            weather: first.weather,
            drivers: first.drivers,
            data_warning: first.data_warning,
            forecasts: results.map((r, i) => ({
                horizon_weeks: HORIZONS[i],
                predicted_cases: r.data.predicted_dengue_cases,
                risk_level: r.data.risk_level,
                cached: r.cached
            }))
        });
    } catch (_) {
        mlDown(res);
    }
});

app.post("/api/predict/:horizon", async (req, res) => {
    const horizon = Number(req.params.horizon);
    if (!HORIZONS.includes(horizon)) {
        return res.status(400).json({ success: false, error: "Horizon must be 2, 3 or 4 weeks." });
    }
    if (!isFeatureObject(req.body)) {
        return res.status(400).json({ success: false, error: "Send the model features as a JSON object." });
    }

    try {
        const result = await cachedCall(`custom|${horizon}|${stableKey(req.body)}`, `/predict/${horizon}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(req.body)
        });
        if (result.status !== 200) return res.status(result.status).json(errorBody(result));
        res.json({ ...result.data, cached: result.cached });
    } catch (_) {
        mlDown(res);
    }
});

app.use((err, req, res, next) => {
    res.status(400).json({ success: false, error: "Invalid request" });
});

app.listen(PORT, () => {
    console.log(`Backend running at http://localhost:${PORT}`);
});
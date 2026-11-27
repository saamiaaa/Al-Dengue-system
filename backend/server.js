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




const SUPPLY_RATES = {
    saline_bags_needed: 2.38,
    diagnostic_kits_needed: 1.16,
    hospital_beds_required: 0.29
};
const SUPPLY_LABELS = {
    saline_bags_needed: "saline bags",
    diagnostic_kits_needed: "diagnostic kits",
    hospital_beds_required: "hospital beds"
};
const SUPPLY_KEYS = Object.keys(SUPPLY_RATES);
const CREWS_PER_RISK = { Critical: 3, High: 2, Medium: 1, Low: 0 };
const RISK_RANK = { Critical: 4, High: 3, Medium: 2, Low: 1 };

function emptyTotals() {
    const totals = {};
    SUPPLY_KEYS.forEach((key) => { totals[key] = 0; });
    return totals;
}

function buildAllocation(forecastWards, stockPct, totalCrews) {
    const wards = forecastWards.map((w) => {
        const required = {};
        SUPPLY_KEYS.forEach((key) => {
            required[key] = Math.round(SUPPLY_RATES[key] * w.predicted_cases);
        });
        return {
            ward_id: w.ward_id,
            city: w.city,
            population_density_sqkm: w.population_density_sqkm,
            current_cases: w.current_cases,
            predicted_cases: w.predicted_cases,
            risk_level: w.risk_level,
            required,
            allocated: emptyTotals(),
            deficit: emptyTotals()
        };
    });

    wards.sort((a, b) =>
        RISK_RANK[b.risk_level] - RISK_RANK[a.risk_level] ||
        b.population_density_sqkm - a.population_density_sqkm ||
        b.predicted_cases - a.predicted_cases ||
        a.ward_id.localeCompare(b.ward_id)
    );

    const totals = {
        required: emptyTotals(),
        available: emptyTotals(),
        allocated: emptyTotals(),
        deficit: emptyTotals()
    };
    wards.forEach((w) => {
        SUPPLY_KEYS.forEach((key) => { totals.required[key] += w.required[key]; });
    });

    SUPPLY_KEYS.forEach((key) => {
        totals.available[key] = Math.floor((totals.required[key] * stockPct) / 100);
        let remaining = totals.available[key];
        wards.forEach((w) => {
            const give = Math.min(w.required[key], remaining);
            w.allocated[key] = give;
            w.deficit[key] = w.required[key] - give;
            remaining -= give;
            totals.allocated[key] += give;
            totals.deficit[key] += w.deficit[key];
        });
    });

    let crewsLeft = totalCrews;
    let crewsNeededTotal = 0;
    let crewsAssignedTotal = 0;
    let wardsWithDeficit = 0;

    wards.forEach((w, index) => {
        w.rank = index + 1;

        const shares = SUPPLY_KEYS
            .filter((key) => w.required[key] > 0)
            .map((key) => w.allocated[key] / w.required[key]);
        w.fulfilment_pct = shares.length ? Math.floor(Math.min(...shares) * 100) : 100;

        const shortfalls = SUPPLY_KEYS
            .filter((key) => w.deficit[key] > 0)
            .map((key) => `${SUPPLY_LABELS[key]} short by ${w.deficit[key]} (needs ${w.required[key]}, gets ${w.allocated[key]})`);
        w.deficit_alert = shortfalls.length > 0;
        w.alert_message = w.deficit_alert ? `CRITICAL SUPPLY DEFICIT: ${shortfalls.join("; ")}` : null;
        if (w.deficit_alert) wardsWithDeficit += 1;

        w.crews_needed = CREWS_PER_RISK[w.risk_level];
        w.crews_assigned = Math.min(w.crews_needed, crewsLeft);
        w.crew_deficit = w.crews_needed - w.crews_assigned;
        crewsLeft -= w.crews_assigned;
        crewsNeededTotal += w.crews_needed;
        crewsAssignedTotal += w.crews_assigned;
    });

    const warnings = [];
    if (wardsWithDeficit > 0) {
        warnings.push(`CRITICAL SUPPLY DEFICIT: ${wardsWithDeficit} of ${wards.length} wards cannot be fully supplied at ${stockPct}% stock.`);
    }
    if (crewsNeededTotal > totalCrews) {
        warnings.push(`CREW SHORTAGE: ${crewsNeededTotal} crews needed but only ${totalCrews} available.`);
    }

    return {
        summary: {
            stock_pct: stockPct,
            total_crews: totalCrews,
            crews_needed: crewsNeededTotal,
            crews_assigned: crewsAssignedTotal,
            wards_total: wards.length,
            wards_with_deficit: wardsWithDeficit,
            totals,
            warnings
        },
        wards
    };
}

app.get("/api/allocation", async (req, res) => {
    const horizon = Number(req.query.horizon || 2);
    const stockPct = Number(req.query.stock === undefined ? 100 : req.query.stock);
    const totalCrews = Number(req.query.crews === undefined ? 20 : req.query.crews);
    const date = req.query.date ? String(req.query.date) : "";

    if (!HORIZONS.includes(horizon)) {
        return res.status(400).json({ success: false, error: "Horizon must be 2, 3 or 4 weeks." });
    }
    if (!Number.isFinite(stockPct) || stockPct < 30 || stockPct > 100) {
        return res.status(400).json({ success: false, error: "stock must be between 30 and 100" });
    }
    if (!Number.isInteger(totalCrews) || totalCrews < 0 || totalCrews > 1000) {
        return res.status(400).json({ success: false, error: "crews must be a whole number from 0 to 1000" });
    }
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ success: false, error: "Date must be YYYY-MM-DD" });
    }

    const qs = date ? `&date=${encodeURIComponent(date)}` : "";

    try {
        const forecast = await cachedCall(
            `forecast|${horizon}|${date || "latest"}`,
            `/forecast/all?horizon=${horizon}${qs}`
        );
        if (forecast.status !== 200) {
            return res.status(forecast.status).json(errorBody(forecast));
        }

        const allocation = buildAllocation(forecast.data.wards, stockPct, totalCrews);
        res.json({
            success: true,
            cached: forecast.cached,
            data_date: forecast.data.data_date,
            horizon_weeks: horizon,
            assumptions: {
                supply_rates_per_case: SUPPLY_RATES,
                crews_per_risk_level: CREWS_PER_RISK,
                stock_definition: "100% stock equals the full projected demand of all wards",
                priority_rule: "risk level first, then population density, then predicted cases"
            },
            ...allocation
        });
    } catch (_) {
        mlDown(res);
    }
});




// Overflow routing engine module-2
function buildOverflowRouting(wardsInPriorityOrder, capacityMap) {
    const wards = wardsInPriorityOrder.map((w) => ({
        ward_id: w.ward_id,
        city: w.city,
        risk_level: w.risk_level,
        priority_rank: w.rank,
        predicted_cases: w.predicted_cases,
        bed_capacity: capacityMap[w.ward_id] || 1,
        bed_demand: w.required.hospital_beds_required,
        overflow: 0,
        overflow_out: 0,
        received_in: 0
    }));
    wards.forEach((w) => {
        w.overflow = Math.max(0, w.bed_demand - w.bed_capacity);
    });

    const byCity = {};
    wards.forEach((w) => {
        if (!byCity[w.city]) byCity[w.city] = [];
        byCity[w.city].push(w);
    });

    const transferMap = {};
    Object.keys(byCity).forEach((city) => {
        const pool = byCity[city];
        pool.filter((w) => w.overflow > 0).forEach((donor) => {
            let toPlace = donor.overflow;
            while (toPlace > 0) {
                const receivers = pool.filter(
                    (w) => w.overflow === 0 && w.bed_demand + w.received_in < w.bed_capacity
                );
                if (receivers.length === 0) break;
                receivers.sort((a, b) =>
                    (a.bed_demand + a.received_in) / a.bed_capacity -
                    (b.bed_demand + b.received_in) / b.bed_capacity ||
                    a.ward_id.localeCompare(b.ward_id)
                );
                const target = receivers[0];
                target.received_in += 1;
                donor.overflow_out += 1;
                toPlace -= 1;

                const key = `${donor.ward_id}>${target.ward_id}`;
                if (!transferMap[key]) {
                    transferMap[key] = { city, from_ward: donor.ward_id, to_ward: target.ward_id, patients: 0 };
                }
                transferMap[key].patients += 1;
            }
        });
    });

    wards.forEach((w) => {
        w.net_deficit = w.overflow - w.overflow_out;
        w.bed_load_after = w.bed_demand - w.overflow_out + w.received_in;
        w.utilization_before_pct = Math.round((w.bed_demand / w.bed_capacity) * 100);
        w.utilization_after_pct = Math.round((w.bed_load_after / w.bed_capacity) * 100);
        w.headroom_after = Math.max(0, w.bed_capacity - w.bed_load_after);
        if (w.net_deficit > 0) w.status = "UNMET BED DEFICIT";
        else if (w.overflow > 0) w.status = "Overflow routed out";
        else if (w.received_in > 0) w.status = "Receiving overflow";
        else w.status = "Within capacity";
    });

    const cities = Object.keys(byCity).sort().map((city) => {
        const pool = byCity[city];
        const sum = (field) => pool.reduce((total, w) => total + w[field], 0);
        const overflowTotal = sum("overflow");
        const routedTotal = sum("overflow_out");
        const unmet = overflowTotal - routedTotal;
        let status = "Within capacity";
        if (unmet > 0) status = "CITY OVER CAPACITY";
        else if (overflowTotal > 0) status = "Surge routed within city";
        return {
            city,
            wards: pool.length,
            total_capacity: sum("bed_capacity"),
            total_demand: sum("bed_demand"),
            utilization_pct: Math.round((sum("bed_demand") / sum("bed_capacity")) * 100),
            overflow_patients: overflowTotal,
            routed_patients: routedTotal,
            unmet_patients: unmet,
            headroom_after: sum("headroom_after"),
            status
        };
    });

    const transfers = Object.values(transferMap).sort(
        (a, b) => a.city.localeCompare(b.city) || b.patients - a.patients
    );

    return { cities, wards, transfers };
}

app.get("/api/overflow", async (req, res) => {
    const horizon = Number(req.query.horizon || 2);
    const date = req.query.date ? String(req.query.date) : "";

    if (!HORIZONS.includes(horizon)) {
        return res.status(400).json({ success: false, error: "Horizon must be 2, 3 or 4 weeks." });
    }
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ success: false, error: "Date must be YYYY-MM-DD" });
    }

    const qs = date ? `&date=${encodeURIComponent(date)}` : "";

    try {
        const [forecast, capacity] = await Promise.all([
            cachedCall(`forecast|${horizon}|${date || "latest"}`, `/forecast/all?horizon=${horizon}${qs}`),
            cachedCall("capacity", "/capacity")
        ]);
        if (forecast.status !== 200) return res.status(forecast.status).json(errorBody(forecast));
        if (capacity.status !== 200) return res.status(capacity.status).json(errorBody(capacity));

        const ordered = buildAllocation(forecast.data.wards, 100, 0).wards;
        const routing = buildOverflowRouting(ordered, capacity.data.capacity);

        res.json({
            success: true,
            cached: forecast.cached,
            data_date: forecast.data.data_date,
            horizon_weeks: horizon,
            assumptions: {
                bed_capacity_rule: capacity.data.rule,
                bed_demand_rule: "predicted cases x 0.29, rounded (measured from the dataset)",
                routing_rule: "overflow goes only to wards of the same city, each patient to the least-full ward with a free bed; donors are served in the same priority order as the allocation engine"
            },
            ...routing
        });
    } catch (_) {
        mlDown(res);
    }
});



//MODULE-3: Simulation proxy

async function runSimulationProxy(date, deployedCrews, res) {
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ success: false, error: "Date must be YYYY-MM-DD" });
    }
    if (!deployedCrews || typeof deployedCrews !== "object" || Array.isArray(deployedCrews)) {
        return res.status(400).json({ success: false, error: "deployed_crews must be an object mapping ward_id to crew count" });
    }

    const cleanCrews = {};
    for (const [wardId, count] of Object.entries(deployedCrews)) {
        const n = Number(count);
        if (!Number.isInteger(n) || n < 0 || n > 50) {
            return res.status(400).json({ success: false, error: `Invalid crew count for ${wardId}` });
        }
        if (n > 0) cleanCrews[wardId] = n;
    }

    const payload = { date: date || null, deployed_crews: cleanCrews };
    try {
        const result = await cachedCall(
            `sim|${date || "latest"}|${stableKey(cleanCrews)}`,
            "/simulate",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            }
        );
        if (result.status !== 200) return res.status(result.status).json(errorBody(result));
        res.json({ ...result.data, cached: result.cached });
    } catch (_) {
        mlDown(res);
    }
}

app.get("/api/simulate", async (req, res) => {
    const date = req.query.date ? String(req.query.date) : "";
    await runSimulationProxy(date, {}, res);
});

app.post("/api/simulate", async (req, res) => {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const date = body.date ? String(body.date) : "";
    const deployedCrews = body.deployed_crews || {};
    await runSimulationProxy(date, deployedCrews, res);
});



//MODULE-4: Dispatch notice builder
function buildDispatchNotices(ward, overflowWard, overflowTransfers, horizon, dataDate) {
    const outbound = overflowTransfers.filter((t) => t.from_ward === ward.ward_id);
    const inbound = overflowTransfers.filter((t) => t.to_ward === ward.ward_id);

    let bedRoutingText = "Local bed capacity sufficient; no transfer required.";
    if (outbound.length > 0) {
        const targets = outbound.map((t) => `${t.patients} pts -> ${t.to_ward}`).join(", ");
        bedRoutingText = `OVERFLOW ROUTING: Transfer ${targets}`;
        if (overflowWard && overflowWard.net_deficit > 0) {
            bedRoutingText += ` (UNMET SURGE: ${overflowWard.net_deficit} pts exceed city capacity)`;
        }
    } else if (inbound.length > 0) {
        const totalIn = inbound.reduce((sum, t) => sum + t.patients, 0);
        const sources = inbound.map((t) => `${t.from_ward} (${t.patients})`).join(", ");
        bedRoutingText = `RECEIVE OVERFLOW: Accept ${totalIn} pts from ${sources}`;
    }

    const statusLine = ward.deficit_alert ? ward.alert_message : "STOCK ADEQUATE (100% fulfilled)";
    const bedCap = overflowWard ? overflowWard.bed_capacity : 1;
    const bedReq = ward.required.hospital_beds_required;

    const sms = [
        `[DGHS DENGUE DISPATCH | ${ward.ward_id} - ${ward.city} | +${horizon}W]`,
        `Date: ${dataDate} | Risk: ${ward.risk_level.toUpperCase()} | Pred Cases: ${ward.predicted_cases}`,
        `Status: ${statusLine}`,
        `Saline: ${ward.allocated.saline_bags_needed}/${ward.required.saline_bags_needed} | Kits: ${ward.allocated.diagnostic_kits_needed}/${ward.required.diagnostic_kits_needed}`,
        `Crews: ${ward.crews_assigned}/${ward.crews_needed} assigned`,
        `Beds: ${bedReq}/${bedCap} (${bedRoutingText})`
    ].join("\n");

    const whatsapp = [
        `*DENGUE COMMAND NOTICE — ${ward.ward_id} (${ward.city})*`,
        `Forecast Horizon: *+${horizon} Weeks* (Data Date: ${dataDate})`,
        `• *Projected Cases:* ${ward.predicted_cases} (*${ward.risk_level} Risk*, Priority Rank #${ward.rank})`,
        `• *Supply Status:* ${statusLine}`,
        `• *Saline Bags:* ${ward.allocated.saline_bags_needed} allocated / ${ward.required.saline_bags_needed} required (Deficit: ${ward.deficit.saline_bags_needed})`,
        `• *Diagnostic Kits:* ${ward.allocated.diagnostic_kits_needed} allocated / ${ward.required.diagnostic_kits_needed} required (Deficit: ${ward.deficit.diagnostic_kits_needed})`,
        `• *Spraying Crews:* ${ward.crews_assigned} assigned / ${ward.crews_needed} required`,
        `• *Hospital Beds (${bedReq}/${bedCap}):* ${bedRoutingText}`
    ].join("\n");

    return {
        routing_instruction: bedRoutingText,
        sms,
        whatsapp,
        brief: {
            title: `Ward Commissioner Operational Brief — ${ward.ward_id}`,
            city: ward.city,
            ward_id: ward.ward_id,
            data_date: dataDate,
            horizon_weeks: horizon,
            priority_rank: ward.rank,
            population_density_sqkm: ward.population_density_sqkm,
            current_cases: ward.current_cases,
            predicted_cases: ward.predicted_cases,
            risk_level: ward.risk_level,
            fulfilment_pct: ward.fulfilment_pct,
            deficit_alert: ward.deficit_alert,
            alert_message: statusLine,
            supplies: {
                saline_bags: {
                    required: ward.required.saline_bags_needed,
                    allocated: ward.allocated.saline_bags_needed,
                    deficit: ward.deficit.saline_bags_needed
                },
                diagnostic_kits: {
                    required: ward.required.diagnostic_kits_needed,
                    allocated: ward.allocated.diagnostic_kits_needed,
                    deficit: ward.deficit.diagnostic_kits_needed
                }
            },
            vector_control: {
                crews_needed: ward.crews_needed,
                crews_assigned: ward.crews_assigned,
                crew_deficit: ward.crew_deficit
            },
            hospital_surge: {
                local_bed_capacity: bedCap,
                beds_required: bedReq,
                net_deficit: overflowWard ? overflowWard.net_deficit : 0,
                routing_instruction: bedRoutingText,
                outbound_transfers: outbound,
                inbound_transfers: inbound
            }
        }
    };
}

app.get("/api/dispatch", async (req, res) => {
    const horizon = Number(req.query.horizon || 2);
    const stockPct = Number(req.query.stock === undefined ? 100 : req.query.stock);
    const totalCrews = Number(req.query.crews === undefined ? 20 : req.query.crews);
    const date = req.query.date ? String(req.query.date) : "";
    const wardFilter = req.query.ward ? String(req.query.ward) : "";

    if (!HORIZONS.includes(horizon)) {
        return res.status(400).json({ success: false, error: "Horizon must be 2, 3 or 4 weeks." });
    }
    if (!Number.isFinite(stockPct) || stockPct < 30 || stockPct > 100) {
        return res.status(400).json({ success: false, error: "stock must be between 30 and 100" });
    }
    if (!Number.isInteger(totalCrews) || totalCrews < 0 || totalCrews > 1000) {
        return res.status(400).json({ success: false, error: "crews must be a whole number from 0 to 1000" });
    }
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ success: false, error: "Date must be YYYY-MM-DD" });
    }

    const qs = date ? `&date=${encodeURIComponent(date)}` : "";

    try {
        const [forecast, capacity] = await Promise.all([
            cachedCall(`forecast|${horizon}|${date || "latest"}`, `/forecast/all?horizon=${horizon}${qs}`),
            cachedCall("capacity", "/capacity")
        ]);
        if (forecast.status !== 200) return res.status(forecast.status).json(errorBody(forecast));
        if (capacity.status !== 200) return res.status(capacity.status).json(errorBody(capacity));

        const allocation = buildAllocation(forecast.data.wards, stockPct, totalCrews);
        const routing = buildOverflowRouting(allocation.wards, capacity.data.capacity);
        const overflowByWard = {};
        routing.wards.forEach((w) => { overflowByWard[w.ward_id] = w; });

        const notices = allocation.wards
            .filter((w) => !wardFilter || w.ward_id === wardFilter)
            .map((w) => ({
                ward_id: w.ward_id,
                city: w.city,
                rank: w.rank,
                risk_level: w.risk_level,
                predicted_cases: w.predicted_cases,
                deficit_alert: w.deficit_alert,
                ...buildDispatchNotices(w, overflowByWard[w.ward_id], routing.transfers, horizon, forecast.data.data_date)
            }));

        res.json({
            success: true,
            data_date: forecast.data.data_date,
            horizon_weeks: horizon,
            total_notices: notices.length,
            notices
        });
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
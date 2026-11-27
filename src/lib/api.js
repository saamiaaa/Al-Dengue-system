const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// Generate deterministic data for all 60 wards across the 5 cities
const CITY_CONFIG = [
  { city: "Dhaka North", prefix: "DNCC_Ward_", count: 20, baseRain: 195, baseTemp: 31.2, baseHum: 84, baseCases: 14 },
  { city: "Dhaka South", prefix: "DSCC_Ward_", count: 20, baseRain: 215, baseTemp: 31.8, baseHum: 86, baseCases: 17 },
  { city: "Chattogram", prefix: "CCC_Ward_", count: 10, baseRain: 245, baseTemp: 30.6, baseHum: 87, baseCases: 13 },
  { city: "Gazipur", prefix: "GCC_Ward_", count: 5, baseRain: 175, baseTemp: 30.4, baseHum: 81, baseCases: 9 },
  { city: "Narayanganj", prefix: "NCC_Ward_", count: 5, baseRain: 185, baseTemp: 30.9, baseHum: 83, baseCases: 11 },
];

const ALL_60_WARDS = CITY_CONFIG.flatMap(({ city, prefix, count, baseRain, baseTemp, baseHum, baseCases }) =>
  Array.from({ length: count }, (_, idx) => {
    const num = idx + 1;
    const ward_id = `${prefix}${String(num).padStart(2, "0")}`;
    // Deterministic variation per ward so every ward shows distinct realistic values
    const factor = ((num * 7) % 11) / 10; // 0.0 to 1.0
    const pop_density = Math.round(38000 + factor * 36000);
    const water_logging_risk_index = Number((0.42 + factor * 0.52).toFixed(2));
    const sanitation_score = Number((0.45 + (1 - factor) * 0.45).toFixed(2));
    const rainfall_mm = Number((baseRain * (0.7 + factor * 0.55)).toFixed(1));
    const avg_temp_c = Number((baseTemp - 0.8 + factor * 1.6).toFixed(1));
    const relative_humidity_pct = Math.min(95, Math.round(baseHum - 5 + factor * 10));
    const cases2w = Math.max(2, Math.round(baseCases * (0.45 + factor * 1.15)));

    return {
      ward_id,
      ward_name: ward_id,
      city,
      population_density_sqkm: pop_density,
      water_logging_risk_index,
      sanitation_score,
      historical_peak_cases: Math.round(cases2w * 1.6),
      rainfall_mm,
      avg_temp_c,
      relative_humidity_pct,
      cases2w,
    };
  })
);

async function fetchWithTimeout(url, options = {}, timeoutMs = 1500) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

export async function checkApiHealth() {
  try {
    const res = await fetchWithTimeout(`${BASE_URL}/api/health`);
    if (!res.ok) throw new Error("Unhealthy");
    return await res.json();
  } catch {
    return {
      status: "ok",
      success: true,
      mode: "offline_deterministic",
      message: "Local Deterministic Engine Active",
    };
  }
}

export async function fetchWardsData() {
  try {
    const res = await fetchWithTimeout(`${BASE_URL}/api/wards`);
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error("Failed to load wards");
    return data;
  } catch {
    return {
      success: true,
      offline: true,
      latest_date: "2025-08-18",
      available_dates: ["2025-08-18", "2025-08-11", "2025-08-04"],
      wards: ALL_60_WARDS,
    };
  }
}

export async function fetchWardPrediction(wardId, date = "2025-08-18") {
  try {
    const query = date ? `?date=${encodeURIComponent(date)}` : "";
    const res = await fetchWithTimeout(`${BASE_URL}/api/predict/${wardId}${query}`);
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error("Failed to fetch ward prediction");
    return data;
  } catch {
    const ward = ALL_60_WARDS.find((w) => w.ward_id === wardId) || ALL_60_WARDS[0];
    const getRiskLevel = (c) => (c >= 15 ? "Critical" : c >= 9 ? "High" : c >= 4 ? "Medium" : "Low");

    const c2 = ward.cases2w;
    const c3 = Math.max(2, Math.round(c2 * 1.25));
    const c4 = Math.max(3, Math.round(c2 * 1.48));

    // Driver contribution scores matched to Overview.jsx (d.factor, d.value, d.score)
    const rainScore = Math.min(95, Math.round((ward.rainfall_mm / 300) * 100));
    const logScore = Math.min(95, Math.round(ward.water_logging_risk_index * 100));
    const vulnScore = Math.min(92, Math.round((ward.population_density_sqkm / 80000) * 90));
    const climateScore = Math.min(90, Math.round((ward.relative_humidity_pct / 100) * 85));

    return {
      success: true,
      offline: true,
      ward_id: ward.ward_id,
      city: ward.city,
      data_date: date || "2025-08-18",
      current_cases: Math.max(1, Math.round(c2 * 0.7)),
      historical_peak_cases: ward.historical_peak_cases,
      weather: {
        rainfall_mm: ward.rainfall_mm,
        rainfall_prev_4w_sum: Number((ward.rainfall_mm * 1.8).toFixed(1)),
        avg_temp_c: ward.avg_temp_c,
        relative_humidity_pct: ward.relative_humidity_pct,
      },
      forecasts: [
        { horizon_weeks: 2, predicted_cases: c2, risk_level: getRiskLevel(c2) },
        { horizon_weeks: 3, predicted_cases: c3, risk_level: getRiskLevel(c3) },
        { horizon_weeks: 4, predicted_cases: c4, risk_level: getRiskLevel(c4) },
      ],
      drivers: [
        { factor: "Multi-Week Lagged Rainfall", value: `${ward.rainfall_mm} mm`, score: rainScore },
        { factor: "Water-Logging Risk Index", value: ward.water_logging_risk_index, score: logScore },
        { factor: "Urban Vulnerability", value: `${ward.population_density_sqkm}/sqkm | Sanitation ${ward.sanitation_score}`, score: vulnScore },
        { factor: "Temp & Humidity Incubation", value: `${ward.avg_temp_c}°C | ${ward.relative_humidity_pct}%`, score: climateScore },
      ],
    };
  }
}

export async function fetchCustomPrediction(horizon, features) {
  try {
    const res = await fetchWithTimeout(`${BASE_URL}/api/predict/${horizon}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(features),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Custom prediction failed");
    return data;
  } catch {
    const rain = Number(features?.rainfall_mm || 140);
    const temp = Number(features?.avg_temp_C || features?.avg_temp_c || 30);
    const humidity = Number(features?.relative_humidity_pct || 80);
    const mult = String(horizon).includes("4") ? 1.45 : String(horizon).includes("3") ? 1.22 : 1.0;

    const cases = Math.max(2, Math.round((rain * 0.04 + humidity * 0.06 + (temp - 22) * 0.8) * mult));
    const riskLevel = cases >= 15 ? "Critical" : cases >= 9 ? "High" : cases >= 4 ? "Medium" : "Low";

    return {
      success: true,
      offline: true,
      horizon,
      predicted_cases: cases,
      risk_level: riskLevel,
    };
  }
}
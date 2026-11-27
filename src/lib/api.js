import snapshot from "../data/offline_snapshot.json";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const SUPPLY_RATES = {
  saline_bags_needed: 2.38,
  diagnostic_kits_needed: 1.16,
  hospital_beds_required: 0.29,
};
const SUPPLY_LABELS = {
  saline_bags_needed: "saline bags",
  diagnostic_kits_needed: "diagnostic kits",
  hospital_beds_required: "hospital beds",
};
const SUPPLY_KEYS = Object.keys(SUPPLY_RATES);
const CREWS_PER_RISK = { Critical: 3, High: 2, Medium: 1, Low: 0 };

async function fetchWithTimeout(url, options = {}, timeoutMs = 2500) {
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
    const data = await res.json();
    return { ...data, offline_fallback: false };
  } catch {
    return {
      success: true,
      ml_service: "offline_snapshot",
      offline_fallback: true,
      message: "Offline Snapshot Fallback Active",
    };
  }
}

export async function fetchWardsData() {
  try {
    const res = await fetchWithTimeout(`${BASE_URL}/api/wards`);
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error("Failed to load wards");
    return { ...data, offline_fallback: false };
  } catch {
    return { ...snapshot.wards_meta, offline_fallback: true };
  }
}

export async function fetchWardPrediction(wardId, date = "2025-08-25") {
  try {
    const query = date ? `?date=${encodeURIComponent(date)}` : "";
    const res = await fetchWithTimeout(`${BASE_URL}/api/predict/${wardId}${query}`);
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error("Failed to fetch ward prediction");
    return { ...data, offline_fallback: false };
  } catch {
    const meta = snapshot.wards_meta.wards.find((w) => w.ward_id === wardId) || snapshot.wards_meta.wards[0];
    const w2 = snapshot.allocation_base[2].wards.find((w) => w.ward_id === meta.ward_id);
    const w3 = snapshot.allocation_base[3].wards.find((w) => w.ward_id === meta.ward_id);
    const w4 = snapshot.allocation_base[4].wards.find((w) => w.ward_id === meta.ward_id);

    return {
      success: true,
      offline_fallback: true,
      ward_id: meta.ward_id,
      city: meta.city,
      data_date: snapshot.data_date,
      current_cases: w2?.current_cases ?? 0,
      weather: {
        rainfall_mm: 94.5,
        rainfall_prev_4w_sum: 285.0,
        avg_temp_c: 31.2,
        relative_humidity_pct: 85.0,
      },
      forecasts: [
        { horizon_weeks: 2, predicted_cases: w2?.predicted_cases ?? 0, risk_level: w2?.risk_level ?? "Low" },
        { horizon_weeks: 3, predicted_cases: w3?.predicted_cases ?? 0, risk_level: w3?.risk_level ?? "Low" },
        { horizon_weeks: 4, predicted_cases: w4?.predicted_cases ?? 0, risk_level: w4?.risk_level ?? "Low" },
      ],
      drivers: [
        {
          factor: "Water-Logging Risk Index",
          value: String(meta.water_logging_risk_index),
          score: Math.round(meta.water_logging_risk_index * 100),
          reason: "Poor drainage traps rainwater in neighborhood drains longer.",
        },
        {
          factor: "Ward Vulnerability",
          value: `${Number(meta.population_density_sqkm).toLocaleString()}/sqkm | Sanitation ${meta.sanitation_score}`,
          score: Math.min(100, Math.round((meta.population_density_sqkm / 75000) * 60 + (1 - meta.sanitation_score) * 40)),
          reason: "High crowding and weaker sanitation speed up local transmission.",
        },
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
    const temp = Number(features?.avg_temp_c || 30);
    const humidity = Number(features?.relative_humidity_pct || 80);
    const waterLog = Number(features?.water_logging_risk_index || 0.6);
    const mult = String(horizon).includes("4") ? 1.35 : String(horizon).includes("3") ? 1.18 : 1.0;

    const cases = Math.max(
      1,
      Number(((rain * 0.03 + humidity * 0.05 + (temp - 22) * 0.5 + waterLog * 4) * mult).toFixed(1))
    );
    const riskLevel = cases >= 10 ? "Critical" : cases >= 4 ? "High" : cases >= 1 ? "Medium" : "Low";

    return {
      success: true,
      offline_fallback: true,
      horizon,
      predicted_cases: cases,
      risk_level: riskLevel,
    };
  }
}

function buildOfflineAllocation(horizon = 2, stockPct = 100, totalCrews = 20) {
  const base = snapshot.allocation_base[horizon] || snapshot.allocation_base[2];
  const wards = base.wards.map((w) => ({
    ...w,
    required: { ...w.required },
    allocated: { saline_bags_needed: 0, diagnostic_kits_needed: 0, hospital_beds_required: 0 },
    deficit: { saline_bags_needed: 0, diagnostic_kits_needed: 0, hospital_beds_required: 0 },
  }));

  const totals = {
    required: { saline_bags_needed: 0, diagnostic_kits_needed: 0, hospital_beds_required: 0 },
    available: { saline_bags_needed: 0, diagnostic_kits_needed: 0, hospital_beds_required: 0 },
    allocated: { saline_bags_needed: 0, diagnostic_kits_needed: 0, hospital_beds_required: 0 },
    deficit: { saline_bags_needed: 0, diagnostic_kits_needed: 0, hospital_beds_required: 0 },
  };

  wards.forEach((w) => {
    SUPPLY_KEYS.forEach((k) => { totals.required[k] += w.required[k]; });
  });

  SUPPLY_KEYS.forEach((k) => {
    totals.available[k] = Math.floor((totals.required[k] * stockPct) / 100);
    let remaining = totals.available[k];
    wards.forEach((w) => {
      const give = Math.min(w.required[k], remaining);
      w.allocated[k] = give;
      w.deficit[k] = w.required[k] - give;
      remaining -= give;
      totals.allocated[k] += give;
      totals.deficit[k] += w.deficit[k];
    });
  });

  let crewsLeft = totalCrews;
  let crewsNeededTotal = 0;
  let crewsAssignedTotal = 0;
  let wardsWithDeficit = 0;

  wards.forEach((w) => {
    const shares = SUPPLY_KEYS.filter((k) => w.required[k] > 0).map((k) => w.allocated[k] / w.required[k]);
    w.fulfilment_pct = shares.length ? Math.floor(Math.min(...shares) * 100) : 100;

    const shortfalls = SUPPLY_KEYS
      .filter((k) => w.deficit[k] > 0)
      .map((k) => `${SUPPLY_LABELS[k]} short by ${w.deficit[k]} (needs ${w.required[k]}, gets ${w.allocated[k]})`);
    w.deficit_alert = shortfalls.length > 0;
    w.alert_message = w.deficit_alert ? `CRITICAL SUPPLY DEFICIT: ${shortfalls.join("; ")}` : null;
    if (w.deficit_alert) wardsWithDeficit += 1;

    w.crews_needed = CREWS_PER_RISK[w.risk_level] || 0;
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
    success: true,
    offline_fallback: true,
    data_date: base.data_date,
    horizon_weeks: horizon,
    assumptions: base.assumptions,
    summary: {
      stock_pct: stockPct,
      total_crews: totalCrews,
      crews_needed: crewsNeededTotal,
      crews_assigned: crewsAssignedTotal,
      wards_total: wards.length,
      wards_with_deficit: wardsWithDeficit,
      totals,
      warnings,
    },
    wards,
  };
}

export async function fetchAllocation({ horizon = 2, stock = 100, crews = 20, date = "2025-08-25" } = {}) {
  try {
    const qs = new URLSearchParams({ horizon: String(horizon), stock: String(stock), crews: String(crews) });
    if (date) qs.set("date", date);
    const res = await fetchWithTimeout(`${BASE_URL}/api/allocation?${qs.toString()}`);
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || "Allocation failed");
    return { ...data, offline_fallback: false };
  } catch {
    return buildOfflineAllocation(Number(horizon), Number(stock), Number(crews));
  }
}

export async function fetchOverflow({ horizon = 2, date = "2025-08-25" } = {}) {
  try {
    const qs = new URLSearchParams({ horizon: String(horizon) });
    if (date) qs.set("date", date);
    const res = await fetchWithTimeout(`${BASE_URL}/api/overflow?${qs.toString()}`);
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || "Overflow routing failed");
    return { ...data, offline_fallback: false };
  } catch {
    const fallback = snapshot.overflow_by_horizon[Number(horizon)] || snapshot.overflow_by_horizon[2];
    return { ...fallback, offline_fallback: true };
  }
}

export async function fetchVectorSimulation({ date = "2025-08-25", deployed_crews = {} } = {}) {
  try {
    const res = await fetchWithTimeout(`${BASE_URL}/api/simulate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, deployed_crews }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || "Simulation failed");
    return { ...data, offline_fallback: false };
  } catch {
    const base = snapshot.simulate_preview;
    const hasCustom = Object.values(deployed_crews).some((v) => Number(v) > 0);
    if (!hasCustom) return { ...base, offline_fallback: true };

    const wards = base.wards.map((w) => {
      const c = Math.max(0, Number(deployed_crews[w.ward_id] || 0));
      const scale = c > 0 ? (1 - Math.exp(-0.3 * c)) / (1 - Math.exp(-0.6)) : 0;
      const prevented = Number((w.cases_prevented * scale).toFixed(2));
      const simTotal = Math.max(0, Number((w.baseline_cases.total - prevented).toFixed(2)));
      return {
        ...w,
        crews_deployed: c,
        simulated_cases: { ...w.simulated_cases, total: simTotal },
        cases_prevented: prevented,
        beds_saved: Math.round(prevented * 0.29),
        saline_saved: Math.round(prevented * 2.38),
        roi_cases_per_crew: c > 0 ? Number((prevented / c).toFixed(2)) : 0,
      };
    }).sort((a, b) => b.roi_cases_per_crew - a.roi_cases_per_crew || b.cases_prevented - a.cases_prevented);

    wards.forEach((w, idx) => { w.roi_rank = idx + 1; });
    const active = wards.filter((w) => w.crews_deployed > 0);

    return {
      ...base,
      preview_mode: false,
      offline_fallback: true,
      summary: {
        total_crews_deployed: active.reduce((s, w) => s + w.crews_deployed, 0),
        total_cases_prevented: Number(active.reduce((s, w) => s + w.cases_prevented, 0).toFixed(2)),
        total_beds_saved: active.reduce((s, w) => s + w.beds_saved, 0),
        total_saline_saved: active.reduce((s, w) => s + w.saline_saved, 0),
      },
      wards,
    };
  }
}

export async function fetchDispatchNotices({ horizon = 2, stock = 100, crews = 20, date = "2025-08-25", ward = "" } = {}) {
  try {
    const qs = new URLSearchParams({ horizon: String(horizon), stock: String(stock), crews: String(crews) });
    if (date) qs.set("date", date);
    if (ward) qs.set("ward", ward);
    const res = await fetchWithTimeout(`${BASE_URL}/api/dispatch?${qs.toString()}`);
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || "Dispatch failed");
    return { ...data, offline_fallback: false };
  } catch {
    const alloc = buildOfflineAllocation(Number(horizon), Number(stock), Number(crews));
    const over = snapshot.overflow_by_horizon[Number(horizon)] || snapshot.overflow_by_horizon[2];
    const overByWard = {};
    over.wards.forEach((w) => { overByWard[w.ward_id] = w; });

    const notices = alloc.wards
      .filter((w) => !ward || w.ward_id === ward)
      .map((w) => {
        const ow = overByWard[w.ward_id];
        const statusLine = w.deficit_alert ? w.alert_message : "STOCK ADEQUATE (100% fulfilled)";
        const bedCap = ow ? ow.bed_capacity : 1;
        const bedReq = w.required.hospital_beds_required;
        const routingText = ow && ow.overflow_out > 0
          ? `OVERFLOW ROUTING: ${ow.overflow_out} pts routed intra-city`
          : "Local bed capacity sufficient; no transfer required.";

        return {
          ward_id: w.ward_id,
          city: w.city,
          rank: w.rank,
          risk_level: w.risk_level,
          predicted_cases: w.predicted_cases,
          deficit_alert: w.deficit_alert,
          routing_instruction: routingText,
          sms: `[DGHS DENGUE DISPATCH | ${w.ward_id} - ${w.city} | +${horizon}W]\nDate: ${alloc.data_date} | Risk: ${w.risk_level.toUpperCase()} | Pred Cases: ${w.predicted_cases}\nStatus: ${statusLine}\nSaline: ${w.allocated.saline_bags_needed}/${w.required.saline_bags_needed} | Kits: ${w.allocated.diagnostic_kits_needed}/${w.required.diagnostic_kits_needed}\nCrews: ${w.crews_assigned}/${w.crews_needed} assigned\nBeds: ${bedReq}/${bedCap} (${routingText})`,
          whatsapp: `*DENGUE COMMAND NOTICE — ${w.ward_id} (${w.city})*\nForecast Horizon: *+${horizon} Weeks* (Data Date: ${alloc.data_date})\n• *Projected Cases:* ${w.predicted_cases} (*${w.risk_level} Risk*, Priority Rank #${w.rank})\n• *Supply Status:* ${statusLine}\n• *Saline Bags:* ${w.allocated.saline_bags_needed} allocated / ${w.required.saline_bags_needed} required (Deficit: ${w.deficit.saline_bags_needed})\n• *Diagnostic Kits:* ${w.allocated.diagnostic_kits_needed} allocated / ${w.required.diagnostic_kits_needed} required (Deficit: ${w.deficit.diagnostic_kits_needed})\n• *Spraying Crews:* ${w.crews_assigned} assigned / ${w.crews_needed} required\n• *Hospital Beds (${bedReq}/${bedCap}):* ${routingText}`,
          brief: {
            title: `Ward Commissioner Operational Brief — ${w.ward_id}`,
            city: w.city,
            ward_id: w.ward_id,
            data_date: alloc.data_date,
            horizon_weeks: Number(horizon),
            priority_rank: w.rank,
            population_density_sqkm: w.population_density_sqkm,
            current_cases: w.current_cases,
            predicted_cases: w.predicted_cases,
            risk_level: w.risk_level,
            fulfilment_pct: w.fulfilment_pct,
            deficit_alert: w.deficit_alert,
            alert_message: statusLine,
            supplies: {
              saline_bags: { required: w.required.saline_bags_needed, allocated: w.allocated.saline_bags_needed, deficit: w.deficit.saline_bags_needed },
              diagnostic_kits: { required: w.required.diagnostic_kits_needed, allocated: w.allocated.diagnostic_kits_needed, deficit: w.deficit.diagnostic_kits_needed },
            },
            vector_control: { crews_needed: w.crews_needed, crews_assigned: w.crews_assigned, crew_deficit: w.crew_deficit },
            hospital_surge: { local_bed_capacity: bedCap, beds_required: bedReq, net_deficit: ow ? ow.net_deficit : 0, routing_instruction: routingText, outbound_transfers: [], inbound_transfers: [] },
          },
        };
      });

    return { success: true, offline_fallback: true, data_date: alloc.data_date, horizon_weeks: Number(horizon), total_notices: notices.length, notices };
  }
}
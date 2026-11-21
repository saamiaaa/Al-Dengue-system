"use client";
import React, { useState, useEffect, useMemo } from "react";
import {
  fetchWardsData,
  fetchWardPrediction,
  fetchCustomPrediction,
} from "../../lib/api";

const RISK_STYLES = {
  Critical: "bg-red-100 text-red-700 border-red-300",
  High: "bg-amber-100 text-amber-800 border-amber-300",
  Medium: "bg-yellow-100 text-yellow-800 border-yellow-300",
  Low: "bg-emerald-100 text-emerald-700 border-emerald-300",
};

const normalizeCity = (c = "") => {
  const s = String(c).trim().toLowerCase();
  return s.includes("chittagong") || s.includes("chattogram") ? "chattogram" : s;
};

const Predictions = ({ selectedCity = "Chattogram" }) => {
  const [wards, setWards] = useState([]);
  const [availableDates, setAvailableDates] = useState([]);
  const [selectedWardId, setSelectedWardId] = useState("CCC_Ward_01");
  const [selectedDate, setSelectedDate] = useState("2025-08-18");

  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // What-If Custom Simulation State (POST /api/predict/:horizon)
  const [simHorizon, setSimHorizon] = useState(2);
  const [simFeatures, setSimFeatures] = useState({
    avg_temp_c: 31.9,
    rainfall_mm: 79.3,
    relative_humidity_pct: 83.0,
    water_logging_risk_index: 0.87,
    sanitation_score: 0.46,
    population_density_sqkm: 64024,
  });
  const [simResult, setSimResult] = useState(null);
  const [simLoading, setSimLoading] = useState(false);

  // ১. ওয়ার্ড ও তারিখ লোড করা (/api/wards)
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetchWardsData();
        if (!active) return;
        const list = res.wards || [];
        setWards(list);

        const dates = res.available_dates || [];
        setAvailableDates(dates);
        if (dates.length && !dates.includes(selectedDate)) {
          setSelectedDate(dates.includes("2025-08-18") ? "2025-08-18" : res.latest_date || dates[0]);
        }
      } catch (err) {
        if (active) setError(err.message || "Failed to load wards");
      }
    })();
    return () => { active = false; };
  }, []);

  const cityWards = useMemo(() => {
    const filtered = wards.filter((w) => normalizeCity(w.city) === normalizeCity(selectedCity));
    return filtered.length ? filtered : wards;
  }, [wards, selectedCity]);

  useEffect(() => {
    if (cityWards.length && !cityWards.some((w) => w.ward_id === selectedWardId)) {
      setSelectedWardId(cityWards[0].ward_id);
    }
  }, [cityWards, selectedWardId]);

  // ২. ওয়ার্ড ও তারিখ অনুযায়ী ML প্রেডিকশন আনা (/api/predict/:wardId?date=...)
  useEffect(() => {
    if (!selectedWardId) return;
    let active = true;
    setLoading(true);
    (async () => {
      try {
        const data = await fetchWardPrediction(selectedWardId, selectedDate);
        if (!active) return;
        setPrediction(data);
        setError("");

        // সিমুলেটর স্লাইডারগুলোকে বর্তমান ওয়ার্ডের ডেটা দিয়ে সিঙ্ক করা
        const w = data.weather || {};
        const currentWard = wards.find((item) => item.ward_id === selectedWardId) || {};
        setSimFeatures((prev) => ({
          ...prev,
          avg_temp_c: Number(w.avg_temp_c ?? prev.avg_temp_c),
          rainfall_mm: Number(w.rainfall_mm ?? prev.rainfall_mm),
          relative_humidity_pct: Number(w.relative_humidity_pct ?? prev.relative_humidity_pct),
          water_logging_risk_index: Number(currentWard.water_logging_risk_index ?? prev.water_logging_risk_index),
          sanitation_score: Number(currentWard.sanitation_score ?? prev.sanitation_score),
          population_density_sqkm: Number(currentWard.population_density_sqkm ?? prev.population_density_sqkm),
        }));
      } catch (err) {
        if (active) {
          setPrediction(null);
          setError(err.message || "Prediction failed");
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [selectedWardId, selectedDate, wards]);

  // ৩. কাস্টম ফিচার দিয়ে লাইভ সিমুলেশন চালানো (POST /api/predict/:horizon)
  const handleRunSimulation = async (e) => {
    e.preventDefault();
    setSimLoading(true);
    try {
      const res = await fetchCustomPrediction(simHorizon, simFeatures);
      setSimResult(res);
    } catch (err) {
      setError(err.message || "Simulation failed");
    } finally {
      setSimLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Control Bar: Ward & Date Selector */}
      <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-red-600">
            Multi-Horizon ML Inference Engine
          </span>
          <h2 className="text-xl font-extrabold text-slate-900 mt-0.5">
            {prediction?.city || selectedCity} — {selectedWardId}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Baseline Weekly Cases:{" "}
            <strong className="text-slate-800">{prediction?.current_cases ?? 0}</strong> • Dataset Date:{" "}
            <strong className="text-slate-800">{prediction?.data_date || selectedDate}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
              Target Ward
            </label>
            <select
              value={selectedWardId}
              onChange={(e) => setSelectedWardId(e.target.value)}
              className="px-3 py-2 text-sm font-semibold bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
            >
              {cityWards.map((w) => (
                <option key={w.ward_id} value={w.ward_id}>
                  {w.ward_name ? `${w.ward_id} (${w.ward_name})` : w.ward_id}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
              Observation Date
            </label>
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 text-sm font-semibold bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
            >
              {(availableDates.length ? availableDates : ["2025-08-18"]).map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
          ⚠️ {error}
        </div>
      )}

      {/* 2, 3, 4 Weeks Forecast Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(prediction?.forecasts || []).map((f) => {
          const badge = RISK_STYLES[f.risk_level] || RISK_STYLES.Low;
          return (
            <div
              key={f.horizon_weeks}
              className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-slate-500">
                  +{f.horizon_weeks} Weeks Horizon
                </span>
                <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full border ${badge}`}>
                  {f.risk_level}
                </span>
              </div>

              <div className="my-3">
                <p className="text-3xl font-extrabold text-slate-900">
                  {loading ? "..." : Number(f.predicted_cases).toFixed(1)}
                  <span className="text-sm font-medium text-slate-500 ml-1.5">predicted cases</span>
                </p>
              </div>

              <div className="text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2">
                <span>Model: Random Forest / XGBoost</span>
                <span>{f.cached ? "⚡ Cached" : "🟢 Live Inference"}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Drivers & What-If Scenario Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Risk Drivers from API */}
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              📊 Epidemiological Risk Factors (Severity Index 0–100)
            </h3>
            <p className="text-xs text-slate-500">
              Real-time weather &amp; ward vulnerability explanations from ML backend
            </p>
          </div>

          <div className="space-y-3">
            {(prediction?.drivers || []).map((d, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>{d.factor}</span>
                  <span className="text-red-600">
                    {d.value} • Score: {d.score}/100
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden my-1.5">
                  <div
                    className="h-full bg-red-600 rounded-full"
                    style={{ width: `${Math.min(100, Number(d.score || 0))}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-600">{d.reason}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Interactive What-If Simulator (POST /api/predict/:horizon) */}
        <form
          onSubmit={handleRunSimulation}
          className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                🧪 What-If Outbreak Scenario Simulator
              </h3>
              <p className="text-xs text-slate-500">
                Adjust weather &amp; sanitation parameters to test custom ML predictions
              </p>
            </div>
            <select
              value={simHorizon}
              onChange={(e) => setSimHorizon(Number(e.target.value))}
              className="px-2.5 py-1.5 text-xs font-bold bg-slate-100 border border-slate-300 rounded-lg"
            >
              <option value={2}>2 Weeks</option>
              <option value={3}>3 Weeks</option>
              <option value={4}>4 Weeks</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <label className="block">
              <span className="font-semibold text-slate-700">
                Rainfall ({simFeatures.rainfall_mm} mm)
              </span>
              <input
                type="range"
                min="0"
                max="300"
                step="1"
                value={simFeatures.rainfall_mm}
                onChange={(e) =>
                  setSimFeatures({ ...simFeatures, rainfall_mm: Number(e.target.value) })
                }
                className="w-full mt-1 accent-blue-600"
              />
            </label>

            <label className="block">
              <span className="font-semibold text-slate-700">
                Avg Temperature ({simFeatures.avg_temp_c} °C)
              </span>
              <input
                type="range"
                min="18"
                max="38"
                step="0.1"
                value={simFeatures.avg_temp_c}
                onChange={(e) =>
                  setSimFeatures({ ...simFeatures, avg_temp_c: Number(e.target.value) })
                }
                className="w-full mt-1 accent-amber-600"
              />
            </label>

            <label className="block">
              <span className="font-semibold text-slate-700">
                Humidity ({simFeatures.relative_humidity_pct}%)
              </span>
              <input
                type="range"
                min="40"
                max="100"
                step="0.5"
                value={simFeatures.relative_humidity_pct}
                onChange={(e) =>
                  setSimFeatures({
                    ...simFeatures,
                    relative_humidity_pct: Number(e.target.value),
                  })
                }
                className="w-full mt-1 accent-teal-600"
              />
            </label>

            <label className="block">
              <span className="font-semibold text-slate-700">
                Water-Logging Index ({simFeatures.water_logging_risk_index})
              </span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={simFeatures.water_logging_risk_index}
                onChange={(e) =>
                  setSimFeatures({
                    ...simFeatures,
                    water_logging_risk_index: Number(e.target.value),
                  })
                }
                className="w-full mt-1 accent-red-600"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={simLoading}
            className="w-full py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer"
          >
            {simLoading ? "Running ML Inference..." : `Simulate +${simHorizon} Week Outbreak`}
          </button>

          {simResult && (
            <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-600">Simulated Prediction</p>
                <p className="text-xl font-extrabold text-red-700">
                  {Number(simResult.predicted_dengue_cases ?? simResult.predicted_cases ?? 0).toFixed(1)} cases
                </p>
              </div>
              <span
                className={`px-3 py-1 text-xs font-bold rounded-full border ${
                  RISK_STYLES[simResult.risk_level] || RISK_STYLES.Medium
                }`}
              >
                {simResult.risk_level}
              </span>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default Predictions;
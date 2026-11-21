"use client";
import React, { useState, useEffect } from "react";
import { fetchWardsData, fetchWardPrediction } from "../../lib/api";

const TIER_CONFIG = {
  Critical: { score: 88, tile: "bg-red-600 text-white border-red-700 hover:bg-red-700", badge: "bg-red-100 text-red-700 border-red-300" },
  High: { score: 74, tile: "bg-amber-500 text-white border-amber-600 hover:bg-amber-600", badge: "bg-amber-100 text-amber-800 border-amber-300" },
  Medium: { score: 55, tile: "bg-yellow-200 text-gray-900 border-yellow-400 hover:bg-yellow-300", badge: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  Low: { score: 32, tile: "bg-emerald-100 text-emerald-900 border-emerald-300 hover:bg-emerald-200", badge: "bg-emerald-100 text-emerald-700 border-emerald-300" },
};

const getTier = (raw = "") => {
  const s = String(raw).toLowerCase();
  return s.includes("crit") ? "Critical" : s.includes("high") ? "High" : s.includes("med") ? "Medium" : "Low";
};

const RiskMap = ({ selectedCity }) => {
  const [wards, setWards] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [filterTier, setFilterTier] = useState("All");
  const [loadedCity, setLoadedCity] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetchWardsData();
        const list = (res.wards || []).filter((w) => w.city === selectedCity);
        const results = await Promise.all(
          list.map((w) => fetchWardPrediction(w.ward_id).catch(() => null))
        );
        if (!active) return;

        setWards(
          list.map((w, i) => {
            const p = results[i];
            const f2 = p?.forecasts?.find((f) => f.horizon_weeks === 2);
            const tier = getTier(f2?.risk_level);
            return {
              id: w.ward_id,
              tier,
              ...TIER_CONFIG[tier],
              rain: Number(p?.weather?.rainfall_prev_2w_sum ?? p?.weather?.rainfall_mm ?? 0).toFixed(1),
              logging: Number(w.water_logging_risk_index ?? 0.5).toFixed(2),
              sanitation: Number(w.sanitation_score ?? 0.5).toFixed(2),
              pop: Number(w.population_density_sqkm ?? 0).toLocaleString(),
              cases: Math.round(Number(f2?.predicted_cases ?? p?.current_cases ?? 0)),
            };
          })
        );
        setError(false);
      } catch {
        if (active) { setWards([]); setError(true); }
      } finally {
        if (active) setLoadedCity(selectedCity);
      }
    })();
    return () => { active = false; };
  }, [selectedCity]);

  const isLoading = !error && loadedCity !== selectedCity;
  const filtered = filterTier === "All" ? wards : wards.filter((w) => w.tier === filterTier);
  const activeWard = wards.find((w) => w.id === selectedId) || wards[0];

  return (
    <div className="space-y-6">
      {/* Header & Filter */}
      <div className="bg-white/95 p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-red-600">
            Geospatial Ward Vulnerability Heatmap • {error ? "OFFLINE" : "LIVE ML"}
          </span>
          <h2 className="text-xl font-bold text-gray-800">
            {selectedCity} Ward Risk Map ({wards.length} Wards)
          </h2>
        </div>

        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          {["All", "Critical", "High", "Medium", "Low"].map((t) => (
            <button
              key={t}
              onClick={() => setFilterTier(t)}
              className={`px-3 py-1.5 rounded-lg border cursor-pointer ${
                filterTier === t ? "bg-slate-900 text-white border-slate-900" : "bg-white text-gray-700 border-gray-300"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Grid & Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-white/95 p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex justify-between text-xs text-gray-500 border-b pb-3">
            <span>Showing <strong>{filtered.length}</strong> of {wards.length} wards</span>
            <span>🔴 Critical • 🟠 High • 🟡 Medium • 🟢 Low</span>
          </div>

          {isLoading ? (
            <p className="py-12 text-center text-sm text-gray-500 animate-pulse">Loading live ward heatmap...</p>
          ) : filtered.length ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {filtered.map((w) => (
                <button
                  key={w.id}
                  onClick={() => setSelectedId(w.id)}
                  className={`p-3.5 rounded-xl border-2 text-left transition hover:scale-105 cursor-pointer ${w.tile} ${
                    activeWard?.id === w.id ? "ring-4 ring-slate-900/35 scale-105" : ""
                  }`}
                >
                  <p className="text-xs font-bold truncate">{w.id}</p>
                  <p className="text-2xl font-extrabold mt-1">{w.score}</p>
                  <p className="text-[11px] opacity-90">{w.tier} Risk</p>
                </button>
              ))}
            </div>
          ) : (
            <p className="py-12 text-center text-sm text-gray-500">No wards in {filterTier} tier.</p>
          )}
        </div>

        {/* Ward Inspector */}
        <div className="lg:col-span-4 bg-white/95 p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between space-y-5">
          {activeWard ? (
            <>
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b pb-3">
                  <h3 className="text-lg font-extrabold text-gray-900">📍 {activeWard.id}</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${activeWard.badge}`}>
                    {activeWard.tier} ({activeWard.score}/100)
                  </span>
                </div>

                {[
                  ["2-Wk Lagged Rainfall", `${activeWard.rain} mm`, "text-blue-600"],
                  ["Water Logging Index", `${activeWard.logging} / 1.0`, "text-red-600"],
                  ["Sanitation Score", `${activeWard.sanitation} / 1.0`, "text-gray-800"],
                  ["Population Density", `${activeWard.pop} / sq.km`, "text-gray-800"],
                  ["2-Wk Predicted Cases", `${activeWard.cases} cases/wk`, "text-amber-700"],
                ].map(([label, val, color]) => (
                  <div key={label} className="flex justify-between p-2.5 bg-gray-50 rounded-lg text-sm">
                    <span className="text-gray-600">{label}:</span>
                    <span className={`font-bold ${color}`}>{val}</span>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-red-50 border-l-4 border-red-600 rounded-r-lg text-xs text-red-700">
                <p className="font-bold uppercase text-red-800">Municipal Action Priority</p>
                <p className="mt-1">
                  {activeWard.tier === "Critical" || activeWard.tier === "High"
                    ? `Priority vector control in ${activeWard.id}: Clear blocked drains (${activeWard.logging}) & deploy fogging.`
                    : `Maintain routine weekly surveillance in ${activeWard.id}.`}
                </p>
              </div>
            </>
          ) : (
            <p className="py-12 text-center text-sm text-gray-500">Select a ward to inspect.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default RiskMap;
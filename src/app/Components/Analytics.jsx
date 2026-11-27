"use client";
import React, { useState, useEffect } from "react";
import { fetchWardsData, fetchWardPrediction } from "../../lib/api";

const MODEL_VALIDATION_METRICS = [
  {
    model: "XGBoost Multi-Week Lag Regressor (23 Features)",
    mae: "2.18",
    rmse: "3.42",
    r2: "0.89",
    status: "Active Production Model",
  },
  {
    model: "Random Forest Ensemble (Temporal Lags)",
    mae: "2.64",
    rmse: "4.11",
    r2: "0.84",
    status: "Benchmark Model",
  },
  {
    model: "Baseline Weather-Only Linear Model",
    mae: "5.89",
    rmse: "8.45",
    r2: "0.47",
    status: "Baseline Comparison",
  },
];

const Analytics = ({ selectedCity }) => {
  const [trendData, setTrendData] = useState([]);
  const [loadedCity, setLoadedCity] = useState("");
  const [isLiveApi, setIsLiveApi] = useState(false);
  const [activeWardLabel, setActiveWardLabel] = useState("");

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const wardsRes = await fetchWardsData();
        if (!mounted) return;

        const cityWards = (wardsRes.wards || []).filter(
          (w) => w.city === selectedCity
        );
        const primaryWard = cityWards[0] || wardsRes.wards?.[0];

        if (!primaryWard) {
          setTrendData([]);
          setIsLiveApi(true);
          setLoadedCity(selectedCity);
          return;
        }

        setActiveWardLabel(primaryWard.ward_name || primaryWard.ward_id);

        const dates = (wardsRes.available_dates || []).slice(-8);

        if (dates.length > 0) {
          const weeklyResponses = await Promise.all(
            dates.map((d) =>
              fetchWardPrediction(primaryWard.ward_id, d).catch(() => null)
            )
          );

          if (!mounted) return;

          const formatted = weeklyResponses
            .map((res, idx) => {
              if (!res) return null;
              const rawDate = res.data_date || dates[idx];
              const shortLabel = rawDate ? rawDate.slice(5) : `W${idx + 1}`;
              return {
                week: shortLabel,
                rainfall: Math.round(Number(res.weather?.rainfall_mm ?? 0)),
                cases: Math.round(Number(res.current_cases ?? 0)),
              };
            })
            .filter(Boolean);

          setTrendData(formatted);
        } else {
          const latest = await fetchWardPrediction(primaryWard.ward_id);
          if (!mounted) return;

          const fallbackSeries = [
            {
              week: "Current",
              rainfall: Math.round(Number(latest.weather?.rainfall_mm ?? 0)),
              cases: Math.round(Number(latest.current_cases ?? 0)),
            },
            ...(latest.forecasts || []).map((f) => ({
              week: `+${f.horizon_weeks}W`,
              rainfall: Math.round(
                Number(latest.weather?.rainfall_prev_2w_sum ?? 0)
              ),
              cases: Math.round(Number(f.predicted_cases ?? 0)),
            })),
          ];
          setTrendData(fallbackSeries);
        }

        setIsLiveApi(true);
      } catch {
        if (mounted) {
          setIsLiveApi(false);
          setTrendData([]);
        }
      } finally {
        if (mounted) setLoadedCity(selectedCity);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [selectedCity]);

  const isLoading = loadedCity !== selectedCity;
  const maxRain = Math.max(...trendData.map((d) => d.rainfall), 1);
  const maxCases = Math.max(...trendData.map((d) => d.cases), 1);

  return (
    <div className="space-y-6">
      <div className="bg-white/95 backdrop-blur-sm p-4 sm:p-6 rounded-xl border border-gray-200 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-red-600">
                Vector Breeding Clock Analysis
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isLiveApi
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {isLiveApi ? "LIVE API" : "CONNECTING"}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-800 mt-0.5">
              Trend Analytics — {selectedCity}
              {activeWardLabel ? ` (${activeWardLabel})` : ""}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Notice how rainfall spikes (blue) trigger dengue case surges (red) 2–3 weeks later
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold shrink-0">
            <span className="flex items-center gap-1.5 text-blue-700">
              <span className="w-3 h-3 rounded-sm bg-blue-500 inline-block"></span>
              Weekly Rainfall (mm)
            </span>
            <span className="flex items-center gap-1.5 text-red-700">
              <span className="w-3 h-3 rounded-sm bg-red-600 inline-block"></span>
              Confirmed Cases
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="h-64 flex items-center justify-center bg-slate-50 rounded-xl border border-slate-200 text-sm font-semibold text-slate-500 animate-pulse">
            Loading live telemetry trend data from ML API...
          </div>
        ) : trendData.length === 0 ? (
          <div className="h-64 flex items-center justify-center bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-500 px-4 text-center">
            No trend records available yet. Make sure Backend (Port 5000) &amp; Python ML API (Port 8000) are running.
          </div>
        ) : (
          <div className="w-full overflow-x-auto pb-1">
            <div className="min-w-[540px] grid grid-cols-8 gap-3 pt-4 pb-2 px-3 bg-slate-50 rounded-xl border border-slate-200 items-end h-64">
              {trendData.map((item) => {
                const rainHeight = Math.max(
                  12,
                  Math.round((item.rainfall / maxRain) * 140)
                );
                const caseHeight = Math.max(
                  12,
                  Math.round((item.cases / maxCases) * 140)
                );

                return (
                  <div key={item.week} className="flex flex-col items-center gap-2">
                    <div className="flex items-end gap-1.5 h-40">
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] font-bold text-blue-700 mb-1">
                          {item.rainfall}
                        </span>
                        <div
                          style={{ height: `${rainHeight}px` }}
                          className="w-3.5 sm:w-4 bg-blue-500 rounded-t transition-all"
                          title={`Rainfall: ${item.rainfall} mm`}
                        />
                      </div>

                      <div className="flex flex-col items-center">
                        <span className="text-[10px] font-bold text-red-700 mb-1">
                          {item.cases}
                        </span>
                        <div
                          style={{ height: `${caseHeight}px` }}
                          className="w-3.5 sm:w-4 bg-red-600 rounded-t transition-all"
                          title={`Cases: ${item.cases}`}
                        />
                      </div>
                    </div>

                    <span className="text-xs font-semibold text-gray-700 border-t border-gray-200 pt-1 w-full text-center whitespace-nowrap">
                      {item.week}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white/95 backdrop-blur-sm p-4 sm:p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
            Zero Data-Leakage Chronological Validation
          </span>
          <h3 className="text-lg font-bold text-gray-800">
            Forecast Model Evaluation (Train: 2016–2023 | Test: 2024–2025)
          </h3>
          <p className="text-xs text-gray-500">
            Evaluated across 31,320 weekly ward records comparing multi-week lag features against baseline weather models
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-600">
                <th className="py-3 px-4">Model Architecture</th>
                <th className="py-3 px-4">MAE</th>
                <th className="py-3 px-4">RMSE</th>
                <th className="py-3 px-4">R² Score</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-gray-100">
              {MODEL_VALIDATION_METRICS.map((row) => (
                <tr key={row.model} className="hover:bg-gray-50/80">
                  <td className="py-3 px-4 font-semibold text-gray-800">
                    {row.model}
                  </td>
                  <td className="py-3 px-4 font-bold text-gray-900">
                    {row.mae}
                  </td>
                  <td className="py-3 px-4 text-gray-700">{row.rmse}</td>
                  <td className="py-3 px-4 font-bold text-blue-700">
                    {row.r2}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        row.status.includes("Active")
                          ? "bg-emerald-100 text-emerald-700"
                          : row.status.includes("Benchmark")
                          ? "bg-blue-100 text-blue-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
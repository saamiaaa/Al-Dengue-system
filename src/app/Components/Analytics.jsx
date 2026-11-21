"use client";
import React from "react";
import { MONSOON_TRENDS, MODEL_VALIDATION_METRICS } from "../DengueData";

const Analytics = ({ selectedCity }) => {
  const trendData = MONSOON_TRENDS[selectedCity] || MONSOON_TRENDS["Chattogram"];
  const maxRain = Math.max(...trendData.map((d) => d.rainfall), 1);
  const maxCases = Math.max(...trendData.map((d) => d.cases), 1);

  return (
    <div className="space-y-6">
      
      <div className="bg-white/95 backdrop-blur-sm p-6 rounded-xl border border-gray-200 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-red-600">
              Vector Breeding Clock Analysis (2025 Monsoon)
            </span>
            <h2 className="text-xl font-bold text-gray-800">
              Trend Analytics — {selectedCity}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Notice how rainfall spikes (blue) trigger dengue case surges (red) 2–3 weeks later (r = 0.75)
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold">
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

        
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 pt-4 pb-2 px-3 bg-slate-50 rounded-xl border border-slate-200 items-end h-64">
          {trendData.map((item) => {
            const rainHeight = Math.max(12, Math.round((item.rainfall / maxRain) * 140));
            const caseHeight = Math.max(12, Math.round((item.cases / maxCases) * 140));

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

                <span className="text-xs font-semibold text-gray-700 border-t border-gray-200 pt-1 w-full text-center">
                  {item.week}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      
      <div className="bg-white/95 backdrop-blur-sm p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
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
                  <td className="py-3 px-4 font-semibold text-gray-800">{row.model}</td>
                  <td className="py-3 px-4 font-bold text-gray-900">{row.mae}</td>
                  <td className="py-3 px-4 text-gray-700">{row.rmse}</td>
                  <td className="py-3 px-4 font-bold text-blue-700">{row.r2}</td>
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
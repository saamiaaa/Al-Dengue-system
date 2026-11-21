import React from "react";

const OverviewKpiGrid = ({
  riskScore,
  riskTier,
  riskBadgeStyle,
  forecastWindow,
  activeWard,
  earlyWarningDays,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="p-5 bg-white/95 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-gray-500 uppercase">
            Predicted Risk Tier
          </p>
          <span
            className={`px-2.5 py-0.5 text-xs font-bold rounded-full border ${riskBadgeStyle}`}
          >
            {riskTier}
          </span>
        </div>
        <p className="text-3xl font-extrabold text-gray-900 mt-2">
          {riskScore}
          <span className="text-sm font-normal text-gray-400"> / 100</span>
        </p>
        <p className="text-xs text-gray-500 mt-2">
          Forecast horizon: <strong>{forecastWindow}</strong>
        </p>
      </div>

      <div className="p-5 bg-white/95 rounded-xl border border-gray-200 shadow-sm">
        <p className="text-xs font-medium text-gray-500 uppercase">
          Lagged Rainfall (
          <code className="lowercase bg-gray-100 px-1 py-0.5 rounded text-gray-600">
            rainfall_mm
          </code>
          )
        </p>
        <p className="text-3xl font-extrabold text-blue-600 mt-2">
          {activeWard.laggedRainfall}{" "}
          <span className="text-base font-semibold">mm</span>
        </p>
        <p className="text-xs text-blue-600 mt-2">
          ⏱️ 2–3 wk Aedes breeding lag window
        </p>
      </div>

      <div className="p-5 bg-white/95 rounded-xl border border-gray-200 shadow-sm">
        <p className="text-xs font-medium text-gray-500 uppercase">
          Temp &amp; Humidity (
          <code className="lowercase bg-gray-100 px-1 py-0.5 rounded text-gray-600">
            avg_temp_c
          </code>
          )
        </p>
        <p className="text-3xl font-extrabold text-amber-600 mt-2">
          {activeWard.avgTemp}°C{" "}
          <span className="text-lg font-bold text-gray-600">
            | {activeWard.humidity}%
          </span>
        </p>
        <p className="text-xs text-gray-500 mt-2">
          Optimal viral incubation climate
        </p>
      </div>

      <div className="p-5 bg-white/95 rounded-xl border border-gray-200 shadow-sm">
        <p className="text-xs font-medium text-gray-500 uppercase">
          Early Warning Lead Time
        </p>
        <p className="text-3xl font-extrabold text-emerald-600 mt-2">
          {earlyWarningDays}{" "}
          <span className="text-base font-semibold">Days</span>
        </p>
        <p className="text-xs text-emerald-700 mt-2">
          Ahead of projected hospital spike
        </p>
      </div>
    </div>
  );
};

export default OverviewKpiGrid;
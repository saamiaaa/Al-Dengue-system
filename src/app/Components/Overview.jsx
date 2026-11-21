"use client";
import React, { useState } from "react";
import { WARD_DATA } from "../DengueData";

const Overview = ({ selectedCity }) => {
  // ১. DengueData.js থেকে নির্বাচিত সিটির আসল ওয়ার্ড লিস্ট নেওয়া হচ্ছে
  const currentWards = WARD_DATA[selectedCity] || WARD_DATA["Chattogram"];
  const [selectedWardId, setSelectedWardId] = useState(currentWards[0].id);
  const [forecastWindow, setForecastWindow] = useState("2 Weeks");

  // সিটি পরিবর্তন হলে স্বয়ংক্রিয়ভাবে ওই সিটির প্রথম ওয়ার্ড সিলেক্ট হবে
  const activeWard =
    currentWards.find((w) => w.id === selectedWardId) || currentWards[0];

  // ২. আসল ওয়ার্ড মেট্রিক্স থেকে ডাইনামিক রিস্ক স্কোর ও টিয়ার হিসাব
  const horizonBoost =
    forecastWindow === "4 Weeks" ? 10 : forecastWindow === "3 Weeks" ? 5 : 0;

  const riskScore = Math.min(
    99,
    Math.round(
      activeWard.laggedRainfall * 0.25 +
        activeWard.waterLogging * 30 +
        (1 - activeWard.sanitation) * 15 +
        horizonBoost
    )
  );

  const riskTier =
    riskScore >= 80
      ? "Critical"
      : riskScore >= 65
      ? "High"
      : riskScore >= 45
      ? "Medium"
      : "Low";

  const earlyWarningDays =
    forecastWindow === "4 Weeks" ? 26 : forecastWindow === "3 Weeks" ? 21 : 15;

  const riskBadgeStyle =
    riskTier === "Critical"
      ? "bg-red-100 text-red-700 border-red-300"
      : riskTier === "High"
      ? "bg-amber-100 text-amber-800 border-amber-300"
      : riskTier === "Medium"
      ? "bg-yellow-100 text-yellow-800 border-yellow-300"
      : "bg-emerald-100 text-emerald-700 border-emerald-300";

  return (
    <div className="space-y-6">
      {/* টপ কন্ট্রোল বার: Target Ward ও Forecast Window সিলেক্টর */}
      <div className="bg-white/95 backdrop-blur-sm p-4 sm:p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-red-600">
            Early-Warning Surveillance ({currentWards.length} Wards Tracked)
          </span>
          <h2 className="text-xl font-bold text-gray-800">
            {selectedCity} — {activeWard.id}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Ward ID:{" "}
            <code className="bg-gray-100 px-1.5 py-0.5 rounded font-semibold">
              {activeWard.id}
            </code>{" "}
            • Historical Peak Weekly Cases: <strong>{activeWard.peakCases}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Target Ward (`ward_id`)
            </label>
            <select
              value={activeWard.id}
              onChange={(e) => setSelectedWardId(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 bg-white font-medium text-gray-800 focus:ring-2 focus:ring-red-500 outline-none cursor-pointer"
            >
              {currentWards.map((ward) => (
                <option key={ward.id} value={ward.id}>
                  {ward.id}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Forecast Window
            </label>
            <select
              value={forecastWindow}
              onChange={(e) => setForecastWindow(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 bg-white font-medium text-gray-800 focus:ring-2 focus:ring-red-500 outline-none cursor-pointer"
            >
              <option value="2 Weeks">Next 2 Weeks</option>
              <option value="3 Weeks">Next 3 Weeks</option>
              <option value="4 Weeks">Next 4 Weeks</option>
            </select>
          </div>
        </div>
      </div>

      {/* ৪টি প্রধান KPI কার্ড (আসল ডেটাসেট মেট্রিক্স অনুযায়ী) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Risk Tier */}
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

        {/* Card 2: 2-3 Week Lagged Rainfall */}
        <div className="p-5 bg-white/95 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase">
            Lagged Rainfall (`rainfall_mm`)
          </p>
          <p className="text-3xl font-extrabold text-blue-600 mt-2">
            {activeWard.laggedRainfall}{" "}
            <span className="text-base font-semibold">mm</span>
          </p>
          <p className="text-xs text-blue-600 mt-2">
            ⏱️ 2–3 wk Aedes breeding lag window
          </p>
        </div>

        {/* Card 3: Climate (avg_temp_c & relative_humidity_pct) */}
        <div className="p-5 bg-white/95 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase">
            Temp & Humidity (`avg_temp_c`)
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

        {/* Card 4: Early Warning Window */}
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

      {/* Driver Breakdown & Hyper-Local Ward Vulnerability */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Risk Driver Breakdown */}
        <div className="bg-white/95 p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
          <div>
            <h3 className="text-base font-bold text-gray-800">
              📊 Outbreak Risk Driver Breakdown
            </h3>
            <p className="text-xs text-gray-500">
              Contribution of lagged weather & ward features (31,320-record dataset)
            </p>
          </div>

          <div className="space-y-3 text-sm">
            <div>
              <div className="flex justify-between font-medium mb-1">
                <span>Multi-Week Rainfall Lag (`rainfall_mm`)</span>
                <span className="text-red-600 font-bold">48%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5">
                <div
                  className="bg-red-600 h-2.5 rounded-full"
                  style={{ width: "48%" }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between font-medium mb-1">
                <span>Drainage & Water Logging (`water_logging_risk_index`)</span>
                <span className="text-amber-600 font-bold">27%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5">
                <div
                  className="bg-amber-500 h-2.5 rounded-full"
                  style={{ width: "27%" }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between font-medium mb-1">
                <span>Humidity & Temperature (`relative_humidity_pct`)</span>
                <span className="text-blue-600 font-bold">15%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5">
                <div
                  className="bg-blue-500 h-2.5 rounded-full"
                  style={{ width: "15%" }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between font-medium mb-1">
                <span>Population Crowding & Sanitation Score</span>
                <span className="text-slate-600 font-bold">10%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5">
                <div
                  className="bg-slate-600 h-2.5 rounded-full"
                  style={{ width: "10%" }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Hyper-Local Ward Vulnerability (0.0 - 1.0 Scale) */}
        <div className="bg-white/95 p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-base font-bold text-gray-800">
              🏘️ Hyper-Local Ward Vulnerability ({activeWard.id})
            </h3>
            <p className="text-xs text-gray-500">
              Normalized structural metrics (0.0 – 1.0 scale) from dataset
            </p>

            <div className="grid grid-cols-3 gap-3 mt-4 text-center">
              <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                <p className="text-xs text-gray-600">Water Logging</p>
                <p className="text-lg font-extrabold text-red-700 mt-1">
                  {activeWard.waterLogging} / 1.0
                </p>
                <p className="text-[11px] text-red-600">
                  {activeWard.waterLogging >= 0.7
                    ? "Severe Bottleneck"
                    : "Moderate Drainage"}
                </p>
              </div>

              <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                <p className="text-xs text-gray-600">Population Density</p>
                <p className="text-lg font-extrabold text-amber-700 mt-1">
                  {activeWard.popDensity.toLocaleString()}
                </p>
                <p className="text-[11px] text-amber-600">per sq.km</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-xs text-gray-600">Sanitation Score</p>
                <p className="text-lg font-extrabold text-slate-800 mt-1">
                  {activeWard.sanitation} / 1.0
                </p>
                <p className="text-[11px] text-slate-600">
                  {activeWard.sanitation <= 0.45
                    ? "Weak Waste Mgmt"
                    : "Moderate Sanitation"}
                </p>
              </div>
            </div>
          </div>

          {/* Actionable Early-Warning Recommendation Box */}
          <div className="p-4 bg-red-50 border-l-4 border-red-600 rounded-r-lg">
            <h4 className="text-xs font-bold uppercase text-red-800">
              🚨 Recommended Preventive Intervention
            </h4>
            <p className="text-xs text-red-700 mt-1 leading-relaxed">
              Deploy larvicide spraying & drainage clearance teams to{" "}
              <strong>{activeWard.id}</strong> within 72 hours. Stagnant water
              from the recent <strong>{activeWard.laggedRainfall} mm</strong>{" "}
              rainfall event combined with{" "}
              <strong>{activeWard.waterLogging}</strong> water-logging risk is
              entering peak mosquito maturation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Overview;
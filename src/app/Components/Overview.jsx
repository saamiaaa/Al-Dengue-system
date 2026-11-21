"use client";
import React, { useState } from "react";

const Overview = ({ selectedCity }) => {
  
  const wardsByCity = {
    Dhaka: [
      { id: "DHK-W14", name: "Ward 14 (Mirpur-10)" },
      { id: "DHK-W28", name: "Ward 28 (Dhanmondi)" },
      { id: "DHK-W05", name: "Ward 05 (Uttara)" },
    ],
    Chattogram: [
      { id: "CTG-W22", name: "Ward 22 (Agrabad)" },
      { id: "CTG-W15", name: "Ward 15 (Chawkbazar)" },
      { id: "CTG-W08", name: "Ward 08 (Nasirabad)" },
    ],
    Rajshahi: [{ id: "RAJ-W10", name: "Ward 10 (Boalia)" }],
    Khulna: [{ id: "KHL-W12", name: "Ward 12 (Khalishpur)" }],
    Sylhet: [{ id: "SYL-W04", name: "Ward 04 (Amberkhana)" }],
    Barishal: [{ id: "BAR-W09", name: "Ward 09 (Sadar Road)" }],
  };

  const currentWards = wardsByCity[selectedCity] || wardsByCity["Dhaka"];
  const [selectedWard, setSelectedWard] = useState(currentWards[0].id);
  const [forecastWindow, setForecastWindow] = useState("2 Weeks");

  
  const activeWardObj =
    currentWards.find((w) => w.id === selectedWard) || currentWards[0];

  
  const mockWardMetrics = {
    riskTier: forecastWindow === "4 Weeks" ? "Critical" : "High",
    riskScore: forecastWindow === "4 Weeks" ? 89 : 76,
    laggedRainfall: forecastWindow === "4 Weeks" ? 268 : 215, // rainfall_mm (2-4 week lag)
    avgTemp: 31.4, // avg_temp_C
    humidity: 84, // relative_humidity_pct
    earlyWarningDays: forecastWindow === "4 Weeks" ? 26 : 16,
    waterLoggingIndex: 8.4, // water_logging_risk_index (out of 10)
    populationDensity: "44,200", // population_density_sqkm
    sanitationScore: 3.6, // sanitation_score (out of 10, lower = worse)
    driverWeights: {
      rainfallLag: 48,
      waterLogging: 27,
      humidityTemp: 15,
      crowdingSanitation: 10,
    },
  };

  const riskBadgeStyle =
    mockWardMetrics.riskTier === "Critical"
      ? "bg-red-100 text-red-700 border-red-300"
      : mockWardMetrics.riskTier === "High"
      ? "bg-amber-100 text-amber-800 border-amber-300"
      : "bg-emerald-100 text-emerald-700 border-emerald-300";

  return (
    <div className="space-y-6">
      
      <div className="bg-white/95 backdrop-blur-sm p-4 sm:p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-red-600">
            Early-Warning Surveillance
          </span>
          <h2 className="text-xl font-bold text-gray-800">
            {selectedCity} — {activeWardObj.name}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Ward ID: <code className="bg-gray-100 px-1.5 py-0.5 rounded">{activeWardObj.id}</code> • Vector Breeding Clock Model
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Target Ward (`ward_id`)
            </label>
            <select
              value={activeWardObj.id}
              onChange={(e) => setSelectedWard(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 bg-white font-medium text-gray-800 focus:ring-2 focus:ring-red-500 outline-none"
            >
              {currentWards.map((ward) => (
                <option key={ward.id} value={ward.id}>
                  {ward.name}
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
              className="border border-gray-300 rounded-lg px-3 py-1.5 bg-white font-medium text-gray-800 focus:ring-2 focus:ring-red-500 outline-none"
            >
              <option value="2 Weeks">Next 2 Weeks</option>
              <option value="3 Weeks">Next 3 Weeks</option>
              <option value="4 Weeks">Next 4 Weeks</option>
            </select>
          </div>
        </div>
      </div>

      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="p-5 bg-white/95 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-gray-500 uppercase">Predicted Risk Tier</p>
            <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full border ${riskBadgeStyle}`}>
              {mockWardMetrics.riskTier}
            </span>
          </div>
          <p className="text-3xl font-extrabold text-gray-900 mt-2">
            {mockWardMetrics.riskScore}
            <span className="text-sm font-normal text-gray-400"> / 100</span>
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Forecast horizon: <strong>{forecastWindow}</strong>
          </p>
        </div>

        
        <div className="p-5 bg-white/95 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase">
            Lagged Rainfall (`rainfall_mm`)
          </p>
          <p className="text-3xl font-extrabold text-blue-600 mt-2">
            {mockWardMetrics.laggedRainfall} <span className="text-base font-semibold">mm</span>
          </p>
          <p className="text-xs text-blue-600 mt-2">
            ⏱️ 2–4 wk Aedes breeding lag window
          </p>
        </div>

        
        <div className="p-5 bg-white/95 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase">
            Temp & Humidity (`avg_temp_C`)
          </p>
          <p className="text-3xl font-extrabold text-amber-600 mt-2">
            {mockWardMetrics.avgTemp}°C{" "}
            <span className="text-lg font-bold text-gray-600">
              | {mockWardMetrics.humidity}%
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
            {mockWardMetrics.earlyWarningDays} <span className="text-base font-semibold">Days</span>
          </p>
          <p className="text-xs text-emerald-700 mt-2">
            Ahead of projected hospital spike
          </p>
        </div>
      </div>

      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <div className="bg-white/95 p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
          <div>
            <h3 className="text-base font-bold text-gray-800">
              📊 Outbreak Risk Driver Breakdown
            </h3>
            <p className="text-xs text-gray-500">
              Contribution of lagged weather & ward features to the predicted score
            </p>
          </div>

          <div className="space-y-3 text-sm">
            <div>
              <div className="flex justify-between font-medium mb-1">
                <span>Multi-Week Rainfall Lag (`rainfall_mm`)</span>
                <span className="text-red-600 font-bold">
                  {mockWardMetrics.driverWeights.rainfallLag}%
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5">
                <div
                  className="bg-red-600 h-2.5 rounded-full"
                  style={{ width: `${mockWardMetrics.driverWeights.rainfallLag}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between font-medium mb-1">
                <span>Drainage & Water Logging (`water_logging_risk_index`)</span>
                <span className="text-amber-600 font-bold">
                  {mockWardMetrics.driverWeights.waterLogging}%
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5">
                <div
                  className="bg-amber-500 h-2.5 rounded-full"
                  style={{ width: `${mockWardMetrics.driverWeights.waterLogging}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between font-medium mb-1">
                <span>Humidity & Temperature (`relative_humidity_pct`)</span>
                <span className="text-blue-600 font-bold">
                  {mockWardMetrics.driverWeights.humidityTemp}%
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5">
                <div
                  className="bg-blue-500 h-2.5 rounded-full"
                  style={{ width: `${mockWardMetrics.driverWeights.humidityTemp}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between font-medium mb-1">
                <span>Population Crowding & Sanitation Score</span>
                <span className="text-slate-600 font-bold">
                  {mockWardMetrics.driverWeights.crowdingSanitation}%
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5">
                <div
                  className="bg-slate-600 h-2.5 rounded-full"
                  style={{ width: `${mockWardMetrics.driverWeights.crowdingSanitation}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        
        <div className="bg-white/95 p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-base font-bold text-gray-800">
              🏘️ Hyper-Local Ward Vulnerability ({activeWardObj.id})
            </h3>
            <p className="text-xs text-gray-500">
              Structural factors accelerating Aedes aegypti breeding in this ward
            </p>

            <div className="grid grid-cols-3 gap-3 mt-4 text-center">
              <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                <p className="text-xs text-gray-600">Water Logging Index</p>
                <p className="text-lg font-extrabold text-red-700 mt-1">
                  {mockWardMetrics.waterLoggingIndex}/10
                </p>
                <p className="text-[11px] text-red-600">Severe Bottleneck</p>
              </div>

              <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                <p className="text-xs text-gray-600">Population Density</p>
                <p className="text-lg font-extrabold text-amber-700 mt-1">
                  {mockWardMetrics.populationDensity}
                </p>
                <p className="text-[11px] text-amber-600">per sq.km</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-xs text-gray-600">Sanitation Score</p>
                <p className="text-lg font-extrabold text-slate-800 mt-1">
                  {mockWardMetrics.sanitationScore}/10
                </p>
                <p className="text-[11px] text-slate-600">Weak Waste Mgmt</p>
              </div>
            </div>
          </div>

          
          <div className="p-4 bg-red-50 border-l-4 border-red-600 rounded-r-lg">
            <h4 className="text-xs font-bold uppercase text-red-800">
              🚨 Recommended Preventive Intervention
            </h4>
            <p className="text-xs text-red-700 mt-1 leading-relaxed">
              Deploy larvicide spraying & drainage clearance teams to{" "}
              <strong>{activeWardObj.name}</strong> within 72 hours. Stagnant water from the recent{" "}
              <strong>{mockWardMetrics.laggedRainfall}mm</strong> rainfall event is entering peak adult mosquito maturation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Overview;
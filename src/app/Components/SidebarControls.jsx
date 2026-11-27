"use client";

import React from 'react';

export const CITY_WARDS_MAP = {
  'Dhaka North': Array.from({ length: 20 }, (_, i) => `DNCC_Ward_${String(i + 1).padStart(2, '0')}`),
  'Dhaka South': Array.from({ length: 20 }, (_, i) => `DSCC_Ward_${String(i + 1).padStart(2, '0')}`),
  'Chattogram': Array.from({ length: 10 }, (_, i) => `CCC_Ward_${String(i + 1).padStart(2, '0')}`),
  'Gazipur': Array.from({ length: 5 }, (_, i) => `GCC_Ward_${String(i + 1).padStart(2, '0')}`),
  'Narayanganj': Array.from({ length: 5 }, (_, i) => `NCC_Ward_${String(i + 1).padStart(2, '0')}`),
};

const SidebarControls = ({
  selectedCity,
  setSelectedCity,
  selectedWard,
  setSelectedWard,
  stockPercentage,
  setStockPercentage,
  totalCrews,
  setTotalCrews,
  isOfflineMode,
  onResetDefaults,
}) => {
  const cities = Object.keys(CITY_WARDS_MAP);
  const availableWards = selectedCity === 'ALL' ? [] : CITY_WARDS_MAP[selectedCity] || [];

  const handleCityChange = (e) => {
    const newCity = e.target.value;
    setSelectedCity(newCity);
    setSelectedWard('ALL');
  };

  const getStockStatusColor = (pct) => {
    if (pct <= 45) return 'text-red-600 bg-red-50 border-red-200';
    if (pct <= 75) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-emerald-600 bg-emerald-50 border-emerald-200';
  };

  return (
   <aside className="relative z-10 w-full lg:w-80 bg-slate-950/45 backdrop-blur-md border-r border-white/15 p-5 flex flex-col justify-between lg:min-h-[calc(100vh-72px)] shadow-2xl text-slate-100">
  <div className="space-y-5">
    {/* Dark Cyber-Console Header */}
    <div className="relative overflow-hidden rounded-2xl bg-slate-950 p-4 text-white border border-rose-500/25 shadow-lg">
      <div className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-rose-600/30 blur-2xl" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rose-400/70 to-transparent" />

      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-rose-500/15 border border-rose-400/30 text-sm">
            ⚙️
          </span>
          <div>
            <h3 className="font-black text-base tracking-tight leading-none text-white">
              Command Controls
            </h3>
            <span className="font-mono text-[10px] uppercase tracking-widest text-rose-300">
              Telemetry Console
            </span>
          </div>
        </div>

        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
        </span>
      </div>

      <p className="relative text-xs text-slate-300 mt-2.5 leading-relaxed">
        Filter urban wards &amp; simulate resource scarcity
      </p>
    </div>

    {/* Jurisdiction Filter Module Card */}
    <div className="rounded-2xl bg-slate-950/70 border border-slate-800 p-4 space-y-3.5 shadow-inner">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-extrabold uppercase tracking-wider text-slate-300">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          📍 Jurisdiction Filter
        </span>
        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-rose-300">
          {selectedCity === "ALL" ? "60 WARDS" : "FILTERED"}
        </span>
      </div>

      <div>
        <label
          htmlFor="city-select"
          className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1.5"
        >
          City Corporation
        </label>
        <select
          id="city-select"
          value={selectedCity}
          onChange={handleCityChange}
          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/25 focus:outline-none transition-all cursor-pointer"
        >
          <option value="ALL" className="bg-slate-900 text-white">All Cities (60 Wards)</option>
          {cities.map((city) => (
            <option key={city} value={city} className="bg-slate-900 text-white">
              {city} ({CITY_WARDS_MAP[city].length} Wards)
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="ward-select"
          className="block text-xs font-bold uppercase tracking-wide text-slate-400 mb-1.5"
        >
          Target Ward
        </label>
        <select
          id="ward-select"
          value={selectedWard}
          onChange={(e) => setSelectedWard(e.target.value)}
          disabled={selectedCity === "ALL"}
          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/25 focus:outline-none disabled:bg-slate-900/40 disabled:text-slate-600 disabled:border-slate-800 disabled:cursor-not-allowed transition-all cursor-pointer"
        >
          <option value="ALL" className="bg-slate-900 text-white">
            {selectedCity === "ALL" ? "Select a city first..." : `All ${selectedCity} Wards`}
          </option>
          {availableWards.map((ward) => (
            <option key={ward} value={ward} className="bg-slate-900 text-white">
              {ward}
            </option>
          ))}
        </select>
      </div>
    </div>

    {/* Scarcity Parameters Module Card */}
    <div className="rounded-2xl bg-slate-950/70 border border-slate-800 p-4 space-y-4 shadow-inner">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-extrabold uppercase tracking-wider text-slate-300">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          ⚠️ Scarcity Parameters
        </span>
        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-400/30 text-amber-300">
          LIVE SIM
        </span>
      </div>

      {/* Stock Slider Box */}
      <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
        <div className="flex justify-between items-center mb-2">
          <label htmlFor="stock-slider" className="text-xs font-bold text-slate-200">
            Available Regional Stock
          </label>
          <span
            className={`font-mono text-xs font-extrabold px-2.5 py-0.5 rounded-full border ${getStockStatusColor(
              stockPercentage
            )}`}
          >
            {stockPercentage}%
          </span>
        </div>
        <input
          id="stock-slider"
          type="range"
          min={30}
          max={100}
          step={5}
          value={stockPercentage}
          onChange={(e) => setStockPercentage(Number(e.target.value))}
          className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
        />
        <div className="flex justify-between font-mono text-[10px] font-medium text-slate-400 mt-1.5">
          <span>30% (Severe Shortage)</span>
          <span>100% (Full)</span>
        </div>
      </div>

      {/* Crew Slider Box */}
      <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
        <div className="flex justify-between items-center mb-2">
          <label htmlFor="crew-slider" className="text-xs font-bold text-slate-200">
            Total Spraying Crews
          </label>
          <span className="font-mono text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-rose-600/20 text-rose-300 border border-rose-500/30">
            {totalCrews} Teams
          </span>
        </div>
        <input
          id="crew-slider"
          type="range"
          min={10}
          max={150}
          step={5}
          value={totalCrews}
          onChange={(e) => setTotalCrews(Number(e.target.value))}
          className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
        />
        <div className="flex justify-between font-mono text-[10px] font-medium text-slate-400 mt-1.5">
          <span>10 Teams</span>
          <span>150 Teams</span>
        </div>
      </div>

      {/* Creative Reset Button */}
      <button
        type="button"
        onClick={onResetDefaults}
        className="group w-full py-2.5 px-3.5 font-mono text-xs font-bold text-slate-200 hover:text-white bg-slate-900 hover:bg-gradient-to-r hover:from-red-600 hover:to-rose-600 border border-slate-700 hover:border-rose-400 rounded-xl shadow-sm active:scale-95 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
      >
        <span className="inline-block transition-transform duration-300 group-hover:-rotate-180">
          ↺
        </span>
        <span>Reset to Baseline (100% / 60 Teams)</span>
      </button>
    </div>
  </div>

  {/* Modern Dark Telemetry Engine Status Footer */}
  <div className="mt-6 pt-4 border-t border-slate-800">
    <div
      className={`relative overflow-hidden p-3.5 rounded-2xl border shadow-sm transition-all ${
        isOfflineMode
          ? "bg-slate-950 border-amber-500/40 text-amber-200"
          : "bg-slate-950 border-emerald-500/35 text-emerald-200"
      }`}
    >
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent ${
          isOfflineMode ? "via-amber-400/70" : "via-emerald-400/70"
        } to-transparent`}
      />

      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-xs font-extrabold tracking-tight flex items-center gap-2">
          <span className="relative flex h-2 w-2 shrink-0">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isOfflineMode ? "bg-amber-400" : "bg-emerald-400"
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                isOfflineMode ? "bg-amber-500" : "bg-emerald-500"
              }`}
            />
          </span>
          <span>
            {isOfflineMode ? "🔌 Offline Fallback Active" : "🟢 Local Engine Connected"}
          </span>
        </p>

        <span
          className={`font-mono text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border ${
            isOfflineMode
              ? "bg-amber-500/15 text-amber-300 border-amber-400/30"
              : "bg-emerald-500/15 text-emerald-300 border-emerald-400/30"
          }`}
        >
          {isOfflineMode ? "LOCAL" : "API"}
        </span>
      </div>

      <p className="font-mono text-[11px] text-slate-400 mt-1.5 pl-4">
        {isOfflineMode
          ? "Running deterministic local models"
          : "FastAPI + Serialized ML ready"}
      </p>
    </div>
  </div>
</aside>
  );
};

export default SidebarControls;